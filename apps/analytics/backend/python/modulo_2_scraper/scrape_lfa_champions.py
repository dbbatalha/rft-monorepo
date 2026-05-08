#!/usr/bin/env python3
"""
scrape_lfa_champions.py — Scrapa os campeões da LFA em lfa.com/champions/

Estrutura da página: <p> tags alternando DIVISÃO (MAIÚSCULAS) e nome do campeão.
"VACANT" significa título vago — não é inserido.

Uso:
    python3 scrape_lfa_champions.py
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
}

# Nomes das divisões em maiúsculas como aparecem na página → formato canônico
DIVISION_NAMES = {
    "HEAVYWEIGHT":          "Heavyweight",
    "LIGHT-HEAVYWEIGHT":    "Light Heavyweight",
    "LIGHT HEAVYWEIGHT":    "Light Heavyweight",
    "MIDDLEWEIGHT":         "Middleweight",
    "WELTERWEIGHT":         "Welterweight",
    "LIGHTWEIGHT":          "Lightweight",
    "FEATHERWEIGHT":        "Featherweight",
    "BANTAMWEIGHT":         "Bantamweight",
    "FLYWEIGHT":            "Flyweight",
    "WOMEN'S BANTAMWEIGHT": "Women's Bantamweight",
    "WOMEN'S FLYWEIGHT":    "Women's Flyweight",
    "WOMEN'S STRAWWEIGHT":  "Women's Strawweight",
    "ATOMWEIGHT":           "Atomweight",
}


def _is_valid_name(text: str) -> bool:
    """Reject footer text, URLs, and non-name strings."""
    if "©" in text or "http" in text or "@" in text:
        return False
    # Must have at least 2 words, each starting with a letter
    words = [w for w in text.split() if w.replace(".", "").replace("-", "").replace("\"", "").isalpha() or w[0].isalpha()]
    return len(words) >= 2 and len(text) < 80


def scrape_lfa_champions() -> list[dict]:
    resp = requests.get("https://www.lfa.com/champions/", headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if p.get_text(strip=True)]

    i = 0
    while i < len(paragraphs):
        text = paragraphs[i]
        normalized = text.upper().replace("-", " ").strip()

        # Check if this paragraph is a known division name
        canon = DIVISION_NAMES.get(text.upper()) or DIVISION_NAMES.get(normalized)
        if canon:
            skip = 1  # will skip at least the division paragraph itself
            # Collect champion and any interim that follows
            j = i + 1
            while j < len(paragraphs):
                name = paragraphs[j]
                # Stop if we hit another division name
                norm_next = name.upper().replace("-", " ").strip()
                if DIVISION_NAMES.get(name.upper()) or DIVISION_NAMES.get(norm_next):
                    break
                if name.upper() != "VACANT" and _is_valid_name(name):
                    is_interim = bool(re.search(r"\(interim\)", name, re.I))
                    clean = re.sub(r"\s*\(Interim\)\s*", "", name, flags=re.I).strip()
                    results.append({
                        "division": canon,
                        "champion": clean,
                        "interim": is_interim,
                    })
                skip += 1
                j += 1
            i += skip
            continue
        i += 1

    return results


def save_to_db(champions: list[dict], org: str = "LFA") -> int:
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
    print(f"[{datetime.now():%H:%M:%S}] Scraping campeões LFA...")
    champions = scrape_lfa_champions()

    if not champions:
        print("  Nenhum campeão encontrado.")
        return

    print(f"  {len(champions)} campeões/interinos encontrados:")
    for ch in champions:
        tag = " [INTERINO]" if ch.get("interim") else ""
        print(f"    {ch['division']:<30} {ch['champion']}{tag}")

    n = save_to_db(champions)
    print(f"  {n} entradas salvas em official_rankings (org=LFA)")


if __name__ == "__main__":
    main()
