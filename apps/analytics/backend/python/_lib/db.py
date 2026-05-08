"""
Conexão e helpers compartilhados de DB para os scrapers e ETL.

Convenções:
    - Scrapers escrevem APENAS em tabelas *_raw (append-only, history via scrapedAt).
    - ETL lê *_raw e faz upsert em tabelas enriched (createdAt + updatedAt).
    - Site (tRPC) lê APENAS enriched. Nunca aciona scraper live.
"""
from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterable

import mysql.connector
from mysql.connector import Error as MySQLError

DB_CONFIG = {
    "host":     os.environ.get("DB_HOST", "127.0.0.1"),
    "port":     int(os.environ.get("DB_PORT", "3308")),
    "user":     os.environ.get("DB_USER", "mma_user"),
    "password": os.environ.get("DB_PASSWORD", "mma_password"),
    "database": os.environ.get("DB_NAME", "mma_analytics"),
}


def get_connection():
    return mysql.connector.connect(**DB_CONFIG)


@contextmanager
def cursor(dictionary: bool = False, commit: bool = True):
    """Yield (conn, cursor) and auto-commit/close."""
    conn = get_connection()
    cur  = conn.cursor(dictionary=dictionary)
    try:
        yield conn, cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def _to_json(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# RAW INSERTS (append-only)
# ---------------------------------------------------------------------------

def insert_fighter_raw(c, **fields) -> int:
    """fields: source, externalId, name, nickname, nationality, birthDate,
              heightCm, reachCm, weightKg, stance, primaryTeam, weightClass,
              sourceUrl, recordRaw, payload (any → JSON)."""
    fields["payload"] = _to_json(fields.get("payload"))
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO fighters_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_fight_raw(c, **fields) -> int:
    """fields: source, fighterExternalId, fighterName, opponent, fightDate,
              result, methodCategory, methodDetail, round, timeInRound,
              promotion, event, weightClass, payload."""
    fields["payload"] = _to_json(fields.get("payload"))
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO fights_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_fight_stats_raw(c, **fields) -> int:
    fields["payload"] = _to_json(fields.get("payload"))
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO fight_stats_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_official_ranking_raw(c, **fields) -> int:
    fields["payload"] = _to_json(fields.get("payload"))
    # Quote `rank` since it's a MySQL reserved word
    keys = list(fields.keys())
    cols = ",".join(f"`{k}`" for k in keys)
    placeholders = ",".join(["%s"] * len(keys))
    c.execute(f"INSERT INTO official_rankings_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_upcoming_event_raw(c, **fields) -> int:
    fields["payload"] = _to_json(fields.get("payload"))
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO upcoming_events_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_upcoming_bout_raw(c, **fields) -> int:
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO upcoming_bouts_raw ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def insert_kaggle_row(c, **fields) -> int:
    """fields: dataset, rowFormat, fighterName, opponent, eventName, eventDate,
              weightClass, payload (full CSV row)."""
    fields["payload"] = _to_json(fields.get("payload"))
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO kaggle_imports ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


# ---------------------------------------------------------------------------
# ENRICHED UPSERTS (used by ETL)
# ---------------------------------------------------------------------------

def upsert_fighter(c, *, externalId: str | None, **data):
    """Upsert into `fighters` keyed by externalId.
    Returns the fighter id."""
    if externalId:
        c.execute("SELECT id FROM fighters WHERE externalId = %s LIMIT 1", (externalId,))
        row = c.fetchone()
        if row:
            fid = row[0]
            sets = ",".join(f"`{k}`=%s" for k in data)
            c.execute(f"UPDATE fighters SET {sets} WHERE id=%s",
                      list(data.values()) + [fid])
            return fid
        data = {**data, "externalId": externalId}
    cols = ",".join(f"`{k}`" for k in data)
    placeholders = ",".join(["%s"] * len(data))
    c.execute(f"INSERT INTO fighters ({cols}) VALUES ({placeholders})",
              list(data.values()))
    return c.lastrowid


def replace_official_rankings(c, org: str, rows: Iterable[dict]):
    """Replace all official_rankings rows for `org` with the given snapshot."""
    c.execute("DELETE FROM official_rankings WHERE org = %s", (org,))
    for r in rows:
        keys = list(r.keys())
        cols = ",".join(f"`{k}`" for k in keys)
        placeholders = ",".join(["%s"] * len(keys))
        c.execute(f"INSERT INTO official_rankings ({cols}) VALUES ({placeholders})",
                  list(r.values()))


def replace_upcoming_for_org(c, org: str, events: list[dict]) -> tuple[int, int]:
    """Replace upcoming_events + bouts for org. Each event:
        { name, eventDate, location, source, url, bouts: [{fighter1, fighter2, weightClass}, ...] }
    """
    c.execute("DELETE FROM upcoming_events WHERE org = %s", (org,))
    ev_count = 0
    bt_count = 0
    for ev in events:
        if not ev.get("url") or not ev.get("name"):
            continue
        c.execute(
            """INSERT INTO upcoming_events
                 (org, source, name, eventDate, location, url)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (
                org,
                ev.get("source", ""),
                ev["name"],
                ev.get("eventDate") or None,
                ev.get("location") or None,
                ev["url"],
            ),
        )
        event_id = c.lastrowid
        ev_count += 1
        for i, b in enumerate(ev.get("bouts") or []):
            c.execute(
                """INSERT INTO upcoming_bouts
                     (eventId, position, fighter1, fighter2, weightClass)
                   VALUES (%s,%s,%s,%s,%s)""",
                (event_id, i, b["fighter1"], b["fighter2"], b.get("weightClass") or None),
            )
            bt_count += 1
    return ev_count, bt_count
