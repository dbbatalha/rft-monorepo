#!/usr/bin/env python3
"""
Scrape upcoming UFC events from ufcstats.com and store fight cards in the DB.

Run manually:
    python3 scrape_upcoming_events.py

Via crontab (runs at 2am daily):
    0 2 * * * /path/to/.venv/bin/python /path/to/scrape_upcoming_events.py >> /tmp/ufc_scrape.log 2>&1

Tables used:
    upcoming_events  (id, name, date, location, ufc_url, fetched_at)
    upcoming_bouts   (id, event_id, fighter1, fighter2, weight_class, order_num)
"""

import re
import time
import random
import logging
import mysql.connector
from datetime import datetime

import requests
from bs4 import BeautifulSoup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scrape_upcoming")

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3308,
    "user": "mma_user",
    "password": "mma_password",
    "database": "mma_analytics",
}

UFCSTATS_BASE = "http://ufcstats.com"
UPCOMING_URL  = f"{UFCSTATS_BASE}/statistics/events/upcoming?page=all"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch(url: str) -> BeautifulSoup | None:
    time.sleep(random.uniform(1.2, 2.5))
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"Failed to fetch {url}: {e}")
        return None


def get_upcoming_event_list() -> list[dict]:
    """Return [{name, date, location, url}, ...]"""
    soup = fetch(UPCOMING_URL)
    if not soup:
        return []

    events = []
    for row in soup.select("tr.b-statistics__table-row"):
        link = row.select_one("a.b-link")
        if not link:
            continue
        name = link.get_text(strip=True)
        url  = link.get("href", "").strip()
        cells = row.select("td")
        date     = cells[1].get_text(strip=True) if len(cells) > 1 else ""
        location = cells[2].get_text(strip=True) if len(cells) > 2 else ""
        if name and url:
            events.append({"name": name, "date": date, "location": location, "url": url})

    log.info(f"Found {len(events)} upcoming events")
    return events


def get_event_bouts(event_url: str) -> list[dict]:
    """Return [{fighter1, fighter2, weight_class, order_num}, ...]"""
    soup = fetch(event_url)
    if not soup:
        return []

    bouts = []
    order = 0
    for row in soup.select("tr.b-fight-details__table-row"):
        links = row.select("a.b-link[href*='fighter-details']")
        if len(links) < 2:
            continue
        f1 = links[0].get_text(strip=True)
        f2 = links[1].get_text(strip=True)
        if not f1 or not f2:
            continue

        # Weight class
        wc = ""
        for td in row.select("td"):
            text = td.get_text(separator=" ", strip=True)
            m = re.search(r"(?:Women's\s+)?[A-Z][a-z]+weight", text)
            if m:
                wc = m.group(0)
                break

        order += 1
        bouts.append({"fighter1": f1, "fighter2": f2, "weight_class": wc, "order_num": order})

    log.info(f"  → {len(bouts)} bouts found at {event_url}")
    return bouts


def ensure_tables(conn):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS upcoming_events (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            name       VARCHAR(300) NOT NULL,
            date       VARCHAR(50),
            location   VARCHAR(300),
            ufc_url    VARCHAR(500) UNIQUE NOT NULL,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_url (ufc_url(255))
        ) DEFAULT CHARSET=utf8mb4
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS upcoming_bouts (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            event_id     INT NOT NULL,
            fighter1     VARCHAR(200) NOT NULL,
            fighter2     VARCHAR(200) NOT NULL,
            weight_class VARCHAR(100),
            order_num    INT DEFAULT 0,
            FOREIGN KEY (event_id) REFERENCES upcoming_events(id) ON DELETE CASCADE
        ) DEFAULT CHARSET=utf8mb4
    """)
    conn.commit()
    cur.close()


def upsert_event(cur, event: dict) -> int:
    cur.execute("""
        INSERT INTO upcoming_events (name, date, location, ufc_url)
        VALUES (%s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name=VALUES(name), date=VALUES(date),
            location=VALUES(location), fetched_at=NOW()
    """, (event["name"], event["date"], event["location"], event["url"]))
    cur.execute("SELECT id FROM upcoming_events WHERE ufc_url=%s", (event["url"],))
    row = cur.fetchone()
    return row[0]


def replace_bouts(cur, event_id: int, bouts: list[dict]):
    cur.execute("DELETE FROM upcoming_bouts WHERE event_id=%s", (event_id,))
    for b in bouts:
        cur.execute("""
            INSERT INTO upcoming_bouts (event_id, fighter1, fighter2, weight_class, order_num)
            VALUES (%s, %s, %s, %s, %s)
        """, (event_id, b["fighter1"], b["fighter2"], b["weight_class"], b["order_num"]))


def main():
    log.info("=== Scraping upcoming UFC events ===")
    events = get_upcoming_event_list()
    if not events:
        log.warning("No upcoming events found. Exiting.")
        return

    conn = mysql.connector.connect(**DB_CONFIG)
    ensure_tables(conn)
    cur = conn.cursor()

    saved = 0
    for ev in events:
        log.info(f"Processing: {ev['name']} ({ev['date']})")
        bouts = get_event_bouts(ev["url"])
        if not bouts:
            log.warning(f"  No bouts found — skipping.")
            continue

        event_id = upsert_event(cur, ev)
        replace_bouts(cur, event_id, bouts)
        conn.commit()
        saved += 1
        log.info(f"  Saved event_id={event_id} with {len(bouts)} bouts.")

    cur.close()
    conn.close()
    log.info(f"Done. {saved}/{len(events)} events saved.")


if __name__ == "__main__":
    main()
