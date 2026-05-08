#!/usr/bin/env python3
"""
scrape_jungle_champions.py — Scrapa o Hall dos Campeões do Jungle Fight
via junglefc.com.br/hall-dos-campeoes/

Estrutura da página:
  <h3 class="title">Peso Pesado</h3>
  <p class="icon-box-description">Nome\nAcademia\nCidade</p>

"VAGO" = título vago, não inserido.

Uso:
    python3 scrape_jungle_champions.py
"""

from typing import Optional
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
    "Accept-Language": "pt-BR,pt;q=0.9",
}

DIV_MAP = {
    "peso pesado":           "Heavyweight",
    "peso meio pesado":      "Light Heavyweight",
    "peso médio":            "Middleweight",
    "peso medio":            "Middleweight",
    "peso meio-médio":       "Welterweight",
    "peso meio-medio":       "Welterweight",
    "peso leve":             "Lightweight",
    "peso pena":             "Featherweight",
    "peso galo":             "Bantamweight",
    "peso mosca":            "Flyweight",
    "peso galo - feminino":  "Women's Bantamweight",
    "peso mosca feminino":   "Women's Flyweight",
    "peso palha - feminino": "Women's Strawweight",
    "peso palha feminino":   "Women's Strawweight",
}


def normalize_division(text: str) -> str:
    t = text.lower().strip()
    for pt, en in DIV_MAP.items():
        if pt == t:
            return en
    return " ".join(w.capitalize() for w in text.strip().split())


def extract_name(raw: str) -> Optional[str]:
    lines = [line.strip() for line in raw.split("\n") if line.strip()]
    if not lines:
        return None
    name = lines[0]
    return None if name.upper() == "VAGO" else name


def scrape_jungle_champions() -> list[dict]:
    resp = requests.get(
        "https://junglefc.com.br/hall-dos-campeoes/",
        headers=HEADERS,
        timeout=20,
    )
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    seen: set[str] = set()

    for h3 in soup.select("h3.title"):
        division = normalize_division(h3.get_text(strip=True))
        desc_p = h3.find_next("p", class_="icon-box-description")
        if not desc_p:
            continue
        name = extract_name(desc_p.get_text(separator="\n", strip=True))
        if not name or division in seen:
            continue
        seen.add(division)
        results.append({"division": division, "champion": name})

    return results


def save_to_db(champions: list[dict], org: str = "Jungle Fight") -> int:
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
    print(f"[{datetime.now():%H:%M:%S}] Scraping campeões Jungle Fight...")
    champions = scrape_jungle_champions()

    if not champions:
        print("  Nenhum campeão encontrado.")
        return

    print(f"  {len(champions)} campeões encontrados:")
    for ch in champions:
        print(f"    {ch['division']:<30} {ch['champion']}")

    n = save_to_db(champions)
    print(f"  {n} entradas salvas em official_rankings (org=Jungle Fight)")


if __name__ == "__main__":
    main()
