#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scrape UFC Top-15 fighters faltantes — escreve em fighters_raw + fights_raw.

Steps:
  1. Pega rankings UFC (oficial) onde o atleta ainda não tem perfil ou ainda
     não tem lutas detalhadas.
  2. Pra cada um: busca ufcstats.com, parsa perfil + histórico de lutas.
  3. INSERT em `fighters_raw` (snapshot do perfil) e `fights_raw` (1 linha por luta).

A camada enriched (fighters / fights / fighters.winRate / etc.) é populada DEPOIS
pelo `modulo_2b_etl/etl_fighters.py` + `recompute_fighter_stats.py`.

Usage:
    python3 scrape_top10_ufc.py                # roda completo
    python3 scrape_top10_ufc.py --limit 5      # processa só 5 atletas
    python3 scrape_top10_ufc.py --dry-run      # mostra o que faria
"""

import sys
import logging
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

import mysql.connector
from mma_scraper_v2 import HTTPClient, UFCScraper, clean_text
from etl_fighter_fights import scrape_fighter_fight_history
from _lib.db import insert_fighter_raw, insert_fight_raw

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("TOP10_UFC")

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3308,
    "user": "mma_user",
    "password": "mma_password",
    "database": "mma_analytics",
}


def get_db():
    conn = mysql.connector.connect(**DB_CONFIG)
    return conn, conn.cursor(dictionary=True)


def get_target_fighters(cursor):
    """Lista de atletas que estão no Top 10 UFC e ainda não têm lutas no banco."""
    cursor.execute(
        """
        SELECT DISTINCT
            r.fighterName,
            f.id          AS fighter_id,
            f.externalId  AS external_id,
            f.weightClass,
            r.weightClass AS rank_weight,
            r.`rank`      AS rank_pos,
            r.isChampion,
            r.isInterim
        FROM official_rankings r
        LEFT JOIN fighters f ON LOWER(f.name) = LOWER(r.fighterName)
        WHERE r.org = 'UFC'
          AND r.`rank` BETWEEN 0 AND 15
          AND (
            f.id IS NULL
            OR NOT EXISTS (SELECT 1 FROM fights WHERE fights.fighterId = f.id)
          )
        ORDER BY r.weightClass, r.`rank`
        """
    )
    return cursor.fetchall()


def append_fighter_raw(cursor, name, ufc_url, profile_data, weight_class):
    """Append-only: grava um snapshot do perfil em fighters_raw.
    A ETL (modulo_2b_etl/etl_fighters.py) lê o snapshot mais recente e faz upsert na enriched."""
    profile_data = profile_data or {}
    insert_fighter_raw(
        cursor,
        source="ufcstats",
        externalId=ufc_url,
        name=name,
        nickname=profile_data.get("nickname"),
        nationality=profile_data.get("nationality"),
        birthDate=profile_data.get("birth_date"),
        heightCm=profile_data.get("height_cm"),
        reachCm=profile_data.get("reach_cm"),
        weightKg=profile_data.get("weight_kg"),
        stance=profile_data.get("stance"),
        weightClass=weight_class,
        sourceUrl=ufc_url,
        payload=profile_data,
    )


def normalize_ufc_url(value):
    """
    Converte qualquer formato de externalId para URL completa do UFCStats.

    Aceita:
      - "ufc-XXXX"                     → http://ufcstats.com/fighter-details/XXXX
      - "fighter-details/XXXX"         → http://ufcstats.com/fighter-details/XXXX
      - "http://ufcstats.com/..."      → mantém
      - "https://..."                  → mantém
    """
    if not value:
        return None
    value = str(value).strip()
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("ufc-"):
        return f"http://ufcstats.com/fighter-details/{value[4:]}"
    if value.startswith("fighter-details/"):
        return f"http://ufcstats.com/{value}"
    return None


def find_fighter_url(http, name):
    """
    Busca URL UFCStats do atleta. UFCStats indexa por SOBRENOME — então tenta as
    páginas das letras inicial do primeiro nome E do sobrenome, juntando first+last
    de cada linha da tabela para casar com o nome completo.
    """
    if not name:
        return None
    name_norm = name.lower().strip()
    parts = name_norm.split()
    last_initial = parts[-1][0] if parts and parts[-1] else ""
    first_initial = parts[0][0] if parts and parts[0] else ""

    candidates_letters = []
    if last_initial.isalpha():
        candidates_letters.append(last_initial)
    if first_initial.isalpha() and first_initial not in candidates_letters:
        candidates_letters.append(first_initial)

    for letter in candidates_letters:
        url = f"http://ufcstats.com/statistics/fighters?char={letter}&page=all"
        soup = http.get(url)
        if not soup:
            continue
        for row in soup.select("tr.b-statistics__table-row"):
            cells = row.select("td")
            if len(cells) < 2:
                continue
            link = cells[0].select_one("a.b-link") or cells[1].select_one("a.b-link")
            href = link.get("href", "") if link else ""
            if not href or "fighter-details" not in href:
                continue
            first = clean_text(cells[0].get_text())
            last = clean_text(cells[1].get_text())
            full = f"{first} {last}".strip().lower()
            if full == name_norm:
                return href
        # Fallback: partial contains
        for row in soup.select("tr.b-statistics__table-row"):
            cells = row.select("td")
            if len(cells) < 2:
                continue
            link = cells[0].select_one("a.b-link") or cells[1].select_one("a.b-link")
            href = link.get("href", "") if link else ""
            if not href or "fighter-details" not in href:
                continue
            first = clean_text(cells[0].get_text()).lower()
            last = clean_text(cells[1].get_text()).lower()
            if all(p in (first + " " + last) for p in parts):
                full = f"{first} {last}".strip()
                logger.info(f"  partial match: '{name}' ↔ '{full}'")
                return href
    return None


# NOTA: recompute_stats foi removido daqui. Use modulo_2b_etl/recompute_fighter_stats.py
# (canônico, roda como parte da ETL).


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--limit", type=int, default=0, help="Max atletas a processar (0 = todos)")
    parser.add_argument("--dry-run", action="store_true", help="Apenas mostrar quem seria processado")
    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("Scrape UFC Top-10 (atletas sem lutas detalhadas)")
    logger.info("=" * 70)

    conn, cursor = get_db()
    targets = get_target_fighters(cursor)
    if args.limit:
        targets = targets[: args.limit]

    logger.info(f"Total atletas alvo: {len(targets)}")
    com_perfil = sum(1 for t in targets if t["fighter_id"])
    logger.info(f"  com perfil já: {com_perfil}")
    logger.info(f"  sem perfil   : {len(targets) - com_perfil}")

    if args.dry_run:
        for t in targets:
            tag = "✓" if t["fighter_id"] else "+ NOVO"
            logger.info(f"  [{tag}] {t['fighterName']} ({t['rank_weight']} #{t['rank_pos']})")
        cursor.close()
        conn.close()
        return

    http = HTTPClient(delay=args.delay)
    ufc = UFCScraper(http)

    total_fights_inserted = 0
    total_failures = 0

    for i, t in enumerate(targets, 1):
        name = t["fighterName"]
        weight_class = t["rank_weight"]
        is_champion = bool(t["isChampion"])
        is_interim = bool(t["isInterim"])
        fid = t["fighter_id"]
        url = t["external_id"]

        logger.info(f"[{i}/{len(targets)}] {name}  ({weight_class} #{t['rank_pos']})")

        # 1. Garantir que temos URL UFCStats completa
        url = normalize_ufc_url(url)
        if not url:
            url = find_fighter_url(http, name)
            if not url:
                logger.warning(f"  ✗ não achei UFCStats URL para {name}")
                total_failures += 1
                continue

        # 2. Pegar perfil completo
        try:
            profile = ufc.get_fighter_details(url)
            profile_data = {
                "nickname": getattr(profile, "nickname", None),
                "nationality": getattr(profile, "nationality", None),
                "birth_date": getattr(profile, "date_of_birth", None),
                "height_cm": getattr(profile, "height_cm", None),
                "reach_cm": getattr(profile, "reach_cm", None),
                "weight_kg": getattr(profile, "weight_kg", None),
                "stance": getattr(profile, "stance", None),
            } if profile else None
        except Exception as exc:
            logger.warning(f"  ⚠ erro ao pegar profile: {exc}")
            profile_data = None

        # 3. Append snapshot do perfil em fighters_raw
        try:
            append_fighter_raw(cursor, name, url, profile_data, weight_class)
            conn.commit()
        except Exception as exc:
            logger.error(f"  ✗ erro ao salvar perfil em fighters_raw: {exc}")
            total_failures += 1
            continue

        # 4. Scrape histórico de lutas → fights_raw (append)
        try:
            fights = scrape_fighter_fight_history(http, url, name)
        except Exception as exc:
            logger.warning(f"  ⚠ erro ao scrapear lutas: {exc}")
            continue

        inserted = 0
        for fight in fights:
            try:
                insert_fight_raw(
                    cursor,
                    source="ufcstats",
                    fighterExternalId=url,
                    fighterName=name,
                    opponent=fight.get("opponent", ""),
                    fightDate=fight.get("fightDate"),
                    result=fight.get("result"),
                    methodCategory=fight.get("methodCategory"),
                    methodDetail=fight.get("methodDetail"),
                    round=fight.get("round"),
                    timeInRound=fight.get("timeInRound"),
                    promotion=fight.get("promotion"),
                    event=fight.get("event"),
                    weightClass=weight_class,
                    payload=fight,
                )
                inserted += 1
            except Exception as exc:
                logger.warning(f"  insert error: {exc}")
        conn.commit()
        total_fights_inserted += inserted
        logger.info(f"  + {inserted} lutas em fights_raw (histórico: {len(fights)})")

        # NOTA: stats agregadas (winRate, KO%, streak) são calculadas pelo
        # `modulo_2b_etl/recompute_fighter_stats.py` a partir das fights enriched
        # após a etl_fighters/etl_fights consolidar o raw.

    cursor.close()
    conn.close()
    logger.info("=" * 70)
    logger.info("CONCLUÍDO")
    logger.info(f"  Lutas inseridas    : {total_fights_inserted}")
    logger.info(f"  Falhas             : {total_failures}")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
