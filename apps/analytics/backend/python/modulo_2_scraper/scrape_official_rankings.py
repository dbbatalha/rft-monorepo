#!/usr/bin/env python3
"""
scrape_official_rankings.py — Scrapa os rankings oficiais do UFC em ufc.com.br/rankings.

Popula a tabela `official_rankings` com:
  - Campeão (rank=0, isChampion=1)
  - Campeão interino (rank=0, isInterim=1) se existir
  - Lutadores rankeados #1–#15

Uso:
    python3 scrape_official_rankings.py
    python3 scrape_official_rankings.py --org UFC   # padrão
"""

import argparse
import re
import time
import mysql.connector
import requests
from bs4 import BeautifulSoup
from datetime import datetime

DB_CONFIG = {
    "host": "127.0.0.1", "port": 3308,
    "user": "mma_user", "password": "mma_password",
    "database": "mma_analytics",
    "ssl_disabled": True,
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

# Mapeamento português → inglês para divisões UFC
DIV_MAP = {
    "Men's Pound-for-PoundTop Rank":  "Men's P4P",
    "Peso Por Peso FemininoTop Rank":  "Women's P4P",
    "Peso-mosca":                      "Flyweight",
    "Peso-galo":                       "Bantamweight",
    "Peso-pena":                       "Featherweight",
    "Peso-leve":                       "Lightweight",
    "Peso Meio-Médio":                 "Welterweight",
    "Peso-médio":                      "Middleweight",
    "Peso meio-pesado":                "Light Heavyweight",
    "Peso-pesado":                     "Heavyweight",
    "Peso-palha feminino":             "Women's Strawweight",
    "Peso-mosca feminino":             "Women's Flyweight",
    "Peso-galo feminino":              "Women's Bantamweight",
}


def scrape_ufc_rankings() -> list[dict]:
    """Retorna lista de {division, champion, interim, ranked: [(rank, name)]}."""
    resp = requests.get("https://www.ufc.com.br/rankings", headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for group in soup.select("div.view-grouping"):
        header_el = group.select_one(".view-grouping-header")
        if not header_el:
            continue

        pt_name = header_el.get_text(strip=True)
        en_name = DIV_MAP.get(pt_name, pt_name)

        # Campeão titular
        champ_el = group.select_one(".rankings--athlete--champion h5 a")
        champ_name = champ_el.get_text(strip=True) if champ_el else None

        # Campeão interino
        interim_el = group.select_one(".rankings--athlete--interim h5 a")
        interim_name = interim_el.get_text(strip=True) if interim_el else None

        # Top #1–#15
        ranked = []
        for row in group.select("tbody tr"):
            rank_td = row.select_one(".views-field-weight-class-rank")
            name_td = row.select_one(".views-field-title a")
            if rank_td and name_td:
                rank_str = re.sub(r"\s+", "", rank_td.get_text()).strip()
                if rank_str.isdigit():
                    ranked.append((int(rank_str), name_td.get_text(strip=True)))

        results.append({
            "division":  en_name,
            "champion":  champ_name,
            "interim":   interim_name,
            "ranked":    ranked,
        })

    return results


def save_to_raw(rankings: list[dict], org: str = "UFC", source_url: str | None = None):
    """Append-only: cada execução adiciona um snapshot completo em official_rankings_raw.
    A ETL lê o snapshot mais recente e substitui official_rankings."""
    db = mysql.connector.connect(**DB_CONFIG, buffered=True)
    c = db.cursor()

    rows_inserted = 0
    for div in rankings:
        wc = div["division"]

        # Campeão (rank=0)
        if div["champion"]:
            c.execute("""
                INSERT INTO official_rankings_raw
                  (org, weightClass, `rank`, fighterName, isChampion, isInterim, sourceUrl)
                VALUES (%s, %s, 0, %s, 1, 0, %s)
            """, (org, wc, div["champion"], source_url))
            rows_inserted += 1

        # Campeão interino (rank=-1)
        if div["interim"]:
            c.execute("""
                INSERT INTO official_rankings_raw
                  (org, weightClass, `rank`, fighterName, isChampion, isInterim, sourceUrl)
                VALUES (%s, %s, -1, %s, 0, 1, %s)
            """, (org, wc, div["interim"], source_url))
            rows_inserted += 1

        # Rankeados #1–#15
        for rank_num, name in div["ranked"]:
            c.execute("""
                INSERT INTO official_rankings_raw
                  (org, weightClass, `rank`, fighterName, isChampion, isInterim, sourceUrl)
                VALUES (%s, %s, %s, %s, 0, 0, %s)
            """, (org, wc, rank_num, name, source_url))
            rows_inserted += 1

    db.commit()
    c.close()
    db.close()
    return rows_inserted


# Alias mantém compatibilidade com chamadas antigas
save_to_db = save_to_raw


# NOTA: sync_fighter_flags() foi removida daqui. Esse passo (atualizar
# fighters.isChampion / isInterim) agora é feito pela ETL canônica em
# `modulo_2b_etl/etl_rankings.py::sync_fighter_champion_flags`.


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--org", default="UFC")
    args = parser.parse_args()

    print(f"[{datetime.now():%H:%M:%S}] Scraping rankings oficiais UFC...")
    rankings = scrape_ufc_rankings()
    print(f"  {len(rankings)} divisões encontradas")

    rows = save_to_raw(rankings, org=args.org, source_url="https://www.ufc.com.br/rankings")
    print(f"  {rows} entradas em official_rankings_raw (snapshot append-only).")
    print(f"  Para promover ao enriched, rode: python3 modulo_2b_etl/etl_rankings.py")

    # sync_fighter_flags faz parte do recompute_fighter_stats agora
    # (rankings → fighters.isChampion deve ser feito pelo ETL, não aqui)

    # Resumo
    for div in rankings:
        champ_str = div["champion"] or "(vago)"
        interim_str = f" | interino: {div['interim']}" if div["interim"] else ""
        print(f"  {div['division']:28s} {champ_str}{interim_str}  ({len(div['ranked'])} rankeados)")


if __name__ == "__main__":
    main()
