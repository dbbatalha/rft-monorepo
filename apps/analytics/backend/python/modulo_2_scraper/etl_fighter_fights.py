#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL: Scrape full fight history from each fighter's UFC Stats profile page.
Reads fighters from the dashboard DB (those with externalId = UFC Stats URL),
scrapes their individual fight history, and inserts into the `fights` table.

Usage:
    python3 etl_fighter_fights.py
    python3 etl_fighter_fights.py --delay 1.5 --limit 50
"""

import sys
import re
import logging
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from mma_scraper_v2 import HTTPClient, clean_text, parse_time, safe_int

import mysql.connector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ETL_FIGHTS")

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


# ─── Helpers ─────────────────────────────────────────────────────────────────

def map_method_category(method: str) -> str:
    m = (method or "").upper()
    if "KO" in m or "TKO" in m:
        return "KO_TKO"
    elif "SUB" in m:
        return "SUBMISSION"
    elif "DEC" in m:
        return "DECISION"
    return "OTHER"


def parse_fight_date(date_str: str):
    if not date_str:
        return None
    for fmt in ("%b. %d, %Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return date_str.strip()[:20] or None


def parse_time_to_seconds(time_str: str, round_num: int) -> int:
    if not time_str:
        return 0
    m = re.match(r"(\d+):(\d+)", time_str)
    if m:
        mins, secs = int(m.group(1)), int(m.group(2))
        return (max(1, round_num) - 1) * 5 * 60 + mins * 60 + secs
    return 0


# ─── Scraper ─────────────────────────────────────────────────────────────────

def scrape_fighter_fight_history(http: HTTPClient, fighter_url: str, fighter_name: str) -> list:
    """
    Scrape the fight history table from a UFC Stats fighter profile page.
    Returns a list of fight dicts.
    """
    soup = http.get(fighter_url)
    if not soup:
        return []

    fights = []

    # Fight history rows — select all table rows and skip headers/empty ones
    rows = soup.select("tr.b-fight-details__table-row")

    for row in rows:
        cells = row.select("td.b-fight-details__table-col")
        if len(cells) < 8:
            continue

        # ── Result ─────────────────────────────────────────────────────────
        result_el = cells[0].select_one("i")
        result_text = clean_text(result_el.text).lower() if result_el else ""
        # Skip upcoming fights or header rows
        if result_text in ("next", ""):
            continue
        if result_text == "win":
            result = "win"
        elif result_text == "loss":
            result = "loss"
        elif result_text == "draw":
            result = "draw"
        else:
            result = "no_contest"

        # ── Fighters ───────────────────────────────────────────────────────
        fighter_links = cells[1].select("a")
        if len(fighter_links) < 2:
            continue
        f1_name = clean_text(fighter_links[0].text)
        f2_name = clean_text(fighter_links[1].text)
        # The current fighter is f1; opponent is f2
        opponent = f2_name if f1_name == fighter_name else f1_name

        # ── Method ─────────────────────────────────────────────────────────
        # cells[7] = method in the event-level table, but on fighter page:
        # col order: result | fighters | KD | str | td | sub | event | method | round | time
        method_raw = clean_text(cells[7].text) if len(cells) > 7 else ""
        method_parts = [p.strip() for p in method_raw.split("\n") if p.strip()]
        method_main = method_parts[0] if method_parts else ""
        method_detail = method_parts[1] if len(method_parts) > 1 else ""

        # ── Event + Date ───────────────────────────────────────────────────
        event_cell = cells[6] if len(cells) > 6 else None
        event_name = ""
        event_date = None
        if event_cell:
            paras = event_cell.select("p")
            if paras:
                event_name = clean_text(paras[0].text)
            if len(paras) > 1:
                event_date = parse_fight_date(clean_text(paras[1].text))

        # ── Round & Time ───────────────────────────────────────────────────
        round_num = safe_int(cells[8].text) if len(cells) > 8 else 0
        time_str = parse_time(cells[9].text) if len(cells) > 9 else ""
        elapsed = parse_time_to_seconds(time_str, round_num)

        fights.append({
            "opponent": opponent,
            "result": result,
            "methodCategory": map_method_category(method_main),
            "methodDetail": method_detail or None,
            "round": round_num or None,
            "timeInRound": time_str or None,
            "elapsedTimeSeconds": elapsed or None,
            "event": event_name or None,
            "fightDate": event_date,
            "promotion": "UFC",
        })

    return fights


# ─── DB Insert ───────────────────────────────────────────────────────────────

def insert_fight(cursor, fighter_id: int, fight: dict) -> bool:
    """Insert a fight record; return False if it already exists."""
    cursor.execute(
        "SELECT id FROM fights WHERE fighterId=%s AND opponent=%s AND fightDate=%s",
        (fighter_id, fight["opponent"], fight["fightDate"]),
    )
    if cursor.fetchone():
        return False

    cursor.execute(
        """INSERT INTO fights (
            fighterId, opponent, fightDate, result,
            methodCategory, methodDetail, `round`, timeInRound,
            elapsedTimeSeconds, promotion, event
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
        (
            fighter_id,
            fight["opponent"],
            fight["fightDate"],
            fight["result"],
            fight["methodCategory"],
            fight["methodDetail"],
            fight["round"],
            fight["timeInRound"],
            fight["elapsedTimeSeconds"],
            fight["promotion"],
            fight["event"],
        ),
    )
    return True


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Scrape full fight history for all fighters")
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--limit", type=int, default=0, help="Max fighters to process (0=all)")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("ETL: Fighter Fight Histories → Dashboard DB")
    logger.info("=" * 60)

    conn, cursor = get_db()
    logger.info("Connected to MySQL (port 3308)")

    # Load all fighters with UFC Stats URLs
    cursor.execute(
        "SELECT id, name, externalId FROM fighters WHERE externalId IS NOT NULL ORDER BY name"
    )
    fighters = cursor.fetchall()
    if args.limit:
        fighters = fighters[: args.limit]

    logger.info(f"Processing {len(fighters)} fighters...")

    http = HTTPClient(delay=args.delay)
    # Increase timeout
    _orig = http.session.get
    def _slow(url, **kw):
        kw["timeout"] = max(kw.get("timeout", 0), 45)
        return _orig(url, **kw)
    http.session.get = _slow

    total_inserted = 0
    total_skipped = 0

    for i, fighter in enumerate(fighters):
        fid = fighter["id"]
        name = fighter["name"]
        url = fighter["externalId"]

        logger.info(f"[{i+1}/{len(fighters)}] {name}")

        try:
            fights = scrape_fighter_fight_history(http, url, name)
        except Exception as exc:
            logger.warning(f"  Error scraping {name}: {exc}")
            continue

        inserted = 0
        for fight in fights:
            try:
                ok = insert_fight(cursor, fid, fight)
                if ok:
                    inserted += 1
                    total_inserted += 1
                else:
                    total_skipped += 1
            except Exception as exc:
                logger.warning(f"  Insert error: {exc}")

        conn.commit()
        logger.info(f"  +{inserted} lutas  (total histórico: {len(fights)})")

    cursor.close()
    conn.close()

    logger.info("\n" + "=" * 60)
    logger.info("COMPLETE")
    logger.info(f"  Fight records inserted : {total_inserted}")
    logger.info(f"  Duplicates skipped     : {total_skipped}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
