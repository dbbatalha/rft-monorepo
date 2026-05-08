#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enriquece a nationality dos atletas via Sherdog — escreve em fighters_raw.

Estratégia:
  1. SELECT atletas em `fighters` com nationality NULL/vazio (prioriza com lutas).
  2. Pra cada um: search_fighter(name) no Sherdog → URL do perfil.
  3. Parsa <strong itemprop='nationality'>.
  4. INSERT em `fighters_raw` (source='sherdog') com a nationality nova.

A ETL (`modulo_2b_etl/etl_fighters.py`) consolida o snapshot mais recente em
`fighters` ao rodar.

Uso:
    python3 enrich_nationality.py                  # roda completo
    python3 enrich_nationality.py --limit 50       # limita
    python3 enrich_nationality.py --only-active    # só atletas com fights >= 1
    python3 enrich_nationality.py --dry-run        # mostra sem gravar
"""

import sys
import logging
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

import re
import requests
import mysql.connector
from mma_scraper_v2 import HTTPClient, SherdogScraper, clean_text
from _lib.db import insert_fighter_raw


def search_sherdog_v2(http: HTTPClient, name: str):
    """
    Busca alternativa: a UI atual do Sherdog FightFinder retorna resultados em
    <tr onclick="document.location='/fighter/<slug>-<id>';">.
    O SherdogScraper.search_fighter pega os 'fighters em destaque' do topo, que
    são os mesmos para qualquer query. Esta função extrai o resultado real.
    """
    url = f"https://www.sherdog.com/stats/fightfinder?SearchTxt={requests.utils.quote(name)}"
    soup = http.get(url)
    if not soup:
        return None

    target = name.lower().strip()
    rows = soup.find_all("tr", attrs={"onclick": True})
    matches = []
    for tr in rows:
        m = re.search(r"/fighter/([A-Za-z0-9_\-]+-\d+)", tr.get("onclick", ""))
        if not m:
            continue
        href = f"/fighter/{m.group(1)}"
        cells = tr.find_all("td")
        cell_text = " ".join(clean_text(c.get_text(" ", strip=True)) for c in cells).lower()
        if target in cell_text:
            return f"https://www.sherdog.com{href}"
        matches.append(("https://www.sherdog.com" + href, cell_text))

    # Fallback: pega a primeira linha de resultado se a busca foi por nome simples
    if matches:
        # tenta partial match por nome+sobrenome
        parts = target.split()
        for url_candidate, txt in matches:
            if all(p in txt for p in parts):
                return url_candidate
        return matches[0][0]
    return None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("enrich_nat")

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


def get_targets(cursor, only_active: bool, limit: int):
    """Atletas sem nacionalidade. only_active=true → só com fights."""
    where_active = "AND EXISTS (SELECT 1 FROM fights WHERE fights.fighterId = fighters.id)" if only_active else ""
    limit_sql = f"LIMIT {limit}" if limit else ""
    cursor.execute(
        f"""
        SELECT id, name, externalId
        FROM fighters
        WHERE (nationality IS NULL OR nationality = '')
          {where_active}
        ORDER BY isChampion DESC, isInterim DESC,
                 (EXISTS (SELECT 1 FROM fights WHERE fights.fighterId = fighters.id)) DESC,
                 wins DESC
        {limit_sql}
        """
    )
    return cursor.fetchall()


def append_nationality_raw(cursor, name: str, external_id: str | None, nationality: str, source_url: str | None):
    """Append snapshot em fighters_raw com a nationality recém-encontrada.
    A ETL (etl_fighters.py) pega o snapshot mais recente e atualiza fighters.nationality."""
    insert_fighter_raw(
        cursor,
        source="sherdog",
        externalId=external_id,
        name=name,
        nationality=nationality,
        sourceUrl=source_url,
        payload={"sherdog_nationality": nationality, "sherdog_url": source_url},
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--limit", type=int, default=0, help="Max atletas (0 = todos)")
    parser.add_argument("--only-active", action="store_true", default=True, help="Só atletas com fights (default true)")
    parser.add_argument("--all", action="store_true", help="Inclui atletas sem fights também")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    only_active = not args.all  # by default só com fights

    conn, cursor = get_db()
    targets = get_targets(cursor, only_active, args.limit)
    log.info(f"Atletas alvo (sem nationality): {len(targets)}")

    if args.dry_run:
        for t in targets[:30]:
            log.info(f"  • {t['name']} (id={t['id']})")
        if len(targets) > 30:
            log.info(f"  … e mais {len(targets) - 30}")
        cursor.close()
        conn.close()
        return

    http = HTTPClient(delay=args.delay)
    sherdog = SherdogScraper(http)

    found = 0
    not_found = 0
    errors = 0

    for i, t in enumerate(targets, 1):
        name = t["name"]
        log.info(f"[{i}/{len(targets)}] {name}")

        try:
            url = search_sherdog_v2(http, name)
        except Exception as exc:
            log.warning(f"  search erro: {exc}")
            errors += 1
            continue

        if not url:
            log.info("  ✗ não achei no Sherdog")
            not_found += 1
            continue

        try:
            soup = http.get(url)
            nat_el = soup.select_one("strong[itemprop='nationality']") if soup else None
            nat = clean_text(nat_el.text) if nat_el else ""
        except Exception as exc:
            log.warning(f"  fetch erro: {exc}")
            errors += 1
            continue

        nat = nat.strip()
        if not nat:
            log.info(f"  ⚠ profile achado mas sem nationality ({url})")
            not_found += 1
            continue

        try:
            append_nationality_raw(cursor, t["name"], t.get("externalId"), nat, url)
            conn.commit()
            log.info(f"  ✓ {nat} → fighters_raw")
            found += 1
        except Exception as exc:
            log.warning(f"  insert raw erro: {exc}")
            errors += 1

    cursor.close()
    conn.close()
    log.info("=" * 60)
    log.info(f"  Atualizados : {found}")
    log.info(f"  Não-achados : {not_found}")
    log.info(f"  Erros       : {errors}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
