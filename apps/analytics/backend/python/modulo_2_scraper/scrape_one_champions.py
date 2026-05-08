#!/usr/bin/env python3
"""
scrape_one_champions.py — Scrapa os campeões MMA do ONE Championship
via onefc.com/world-champions/

Estrutura da página:
  <h4 class="champion-title">Heavyweight MMA</h4>
  <a class="title">Nome do Campeão</a>

Salva apenas divisões com "MMA" no título (exclui Muay Thai, Kickboxing, etc.).
Quando um atleta é campeão de duas divisões ("LW MMA & WW MMA"), cria dois registros.

Uso:
    python3 scrape_one_champions.py
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

# Normalize ONE's division names to canonical format
def normalize_one_division(raw: str) -> str:
    """'Heavyweight MMA' → 'Heavyweight', 'Women's Atomweight MMA' → \"Women's Atomweight\" """
    text = re.sub(r"\bMMA\b", "", raw, flags=re.I).strip()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_name(raw: str) -> str:
    """Remove nickname quotes if the whole string is a nickname, otherwise keep full name."""
    # Strip leading/trailing quote artifacts
    name = raw.strip().strip('"').strip('"').strip('"')
    # If name contains a quoted nickname like: "Reug Reug" Oumar Kane → keep as-is
    return raw.strip()


def scrape_one_mma_champions() -> list[dict]:
    resp = requests.get("https://www.onefc.com/world-champions/", headers=HEADERS, timeout=25)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    seen: set[str] = set()

    # Each champion block: h4.champion-title followed by a.title (the champion's link/name)
    for h4 in soup.select("h4.champion-title"):
        title_text = h4.get_text(strip=True)

        # Split by "&" in case of dual-division champions
        segments = [s.strip() for s in title_text.split("&")]
        mma_segments = [s for s in segments if re.search(r"\bMMA\b", s, re.I)]

        if not mma_segments:
            continue

        # Find the champion name: next a.title sibling or h3 sibling
        name_el = h4.find_next("a", class_="title") or h4.find_next("h3")
        if not name_el:
            continue
        champion = name_el.get_text(strip=True)

        for seg in mma_segments:
            is_interim = bool(re.search(r"\binterim\b", seg, re.I))
            division_raw = re.sub(r"\b(interim|mma)\b", "", seg, flags=re.I).strip()
            division_raw = re.sub(r"\s+", " ", division_raw).strip()
            # Title-case
            division = " ".join(w.capitalize() for w in division_raw.split())

            key = (division.lower(), champion.lower())
            if key in seen:
                continue
            seen.add(key)
            results.append({"division": division, "champion": champion, "interim": is_interim})

    return results


def save_to_db(champions: list[dict], org: str = "ONE Championship") -> int:
    db = mysql.connector.connect(**DB_CONFIG, buffered=True)
    c = db.cursor()

    c.execute("DELETE FROM official_rankings WHERE org=%s AND (isChampion=1 OR isInterim=1)", (org,))

    inserted = 0
    for entry in champions:
        is_interim = 1 if entry.get("interim") else 0
        is_champ   = 0 if is_interim else 1
        rank_val   = -1 if is_interim else 0
        c.execute("""
            INSERT INTO official_rankings (org, weightClass, `rank`, fighterName, isChampion, isInterim)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (org, entry["division"], rank_val, entry["champion"], is_champ, is_interim))
        inserted += 1

    db.commit()
    c.close()
    db.close()
    return inserted


def main():
    print(f"[{datetime.now():%H:%M:%S}] Scraping campeões MMA ONE Championship...")
    champions = scrape_one_mma_champions()

    if not champions:
        print("  Nenhum campeão MMA encontrado.")
        return

    print(f"  {len(champions)} campeões/interinos MMA encontrados:")
    for ch in champions:
        tag = " [INTERINO]" if ch.get("interim") else ""
        print(f"    {ch['division']:<30} {ch['champion']}{tag}")

    n = save_to_db(champions)
    print(f"  {n} entradas salvas em official_rankings (org=ONE Championship)")


if __name__ == "__main__":
    main()
