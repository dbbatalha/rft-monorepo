#!/usr/bin/env python3
"""
scrape_pfl_rankings.py — Scrapa os campeões da PFL em pflmma.com/rankings

Estrutura da página (server-rendered):
  <h5>DIVISION NAME <i ...></i></h5>
  <h4 class="mb-2">FirstName<br/>LastName</h4>

A PFL exibe apenas o campeão por divisão no HTML estático.
Os lutadores rankeados #1-#10 são carregados via JS e requerem Selenium.

Uso:
    python3 scrape_pfl_rankings.py
"""

import re
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
    "Accept-Language": "en-US,en;q=0.9",
}

SKIP_DIVISIONS = {"men's p4p top rank", "women's p4p top rank", "p4p"}

PFL_DIV_MAP = {
    "BANTAMWEIGHT":      "Bantamweight",
    "FEATHERWEIGHT":     "Featherweight",
    "LIGHTWEIGHT":       "Lightweight",
    "WELTERWEIGHT":      "Welterweight",
    "MIDDLEWEIGHT":      "Middleweight",
    "LIGHT HEAVYWEIGHT": "Light Heavyweight",
    "HEAVYWEIGHT":       "Heavyweight",
    "WOMEN'S FLYWEIGHT": "Women's Flyweight",
}


def clean_division(text: str) -> str:
    """Strip icon text and normalise."""
    # Remove content inside <i> tags (already stripped by get_text, but clean leftover spaces)
    t = re.sub(r"\s+", " ", text).strip()
    return PFL_DIV_MAP.get(t.upper(), t.title())


def parse_name(h4) -> str:
    """Reconstruct 'FirstName LastName' from <h4>First<br/>Last</h4>."""
    parts = [p.strip() for p in h4.get_text(separator=" ", strip=True).split()]
    return " ".join(parts)


def scrape_pfl_champions() -> list[dict]:
    resp = requests.get("https://pflmma.com/rankings", headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    seen: set[str] = set()

    for h5 in soup.select("h5"):
        raw_div = h5.get_text(separator=" ", strip=True)
        # Skip P4P and empty
        if any(skip in raw_div.lower() for skip in SKIP_DIVISIONS):
            continue

        division = clean_division(raw_div)
        if division in seen:
            continue

        h4 = h5.find_next("h4", class_="mb-2")
        if not h4:
            continue

        champion = parse_name(h4)
        if not champion:
            continue

        seen.add(division)
        results.append({"division": division, "champion": champion})

    return results


def save_to_db(champions: list[dict], org: str = "PFL") -> int:
    db = mysql.connector.connect(**DB_CONFIG, buffered=True)
    c = db.cursor()
    c.execute(
        "DELETE FROM official_rankings WHERE org=%s AND isChampion=1",
        (org,),
    )
    inserted = 0
    for entry in champions:
        c.execute(
            "INSERT INTO official_rankings "
            "(org, weightClass, `rank`, fighterName, isChampion, isInterim) "
            "VALUES (%s, %s, 0, %s, 1, 0)",
            (org, entry["division"], entry["champion"]),
        )
        inserted += 1
    db.commit()
    c.close()
    db.close()
    return inserted


def main():
    print(f"[{datetime.now():%H:%M:%S}] Scraping campeões PFL...")
    champions = scrape_pfl_champions()

    if not champions:
        print("  Nenhum campeão encontrado.")
        return

    print(f"  {len(champions)} campeões encontrados:")
    for ch in champions:
        print(f"    {ch['division']:<28} {ch['champion']}")

    n = save_to_db(champions)
    print(f"  {n} entradas salvas em official_rankings (org=PFL)")


if __name__ == "__main__":
    main()
