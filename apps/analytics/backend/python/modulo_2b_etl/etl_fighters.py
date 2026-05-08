#!/usr/bin/env python3
"""
ETL: fighters_raw + fights_raw + fight_stats_raw  →  fighters + fights + fight_stats

Estratégia (idempotente):
    1. Para cada (source, externalId) em fighters_raw, pega a linha mais recente.
    2. UPSERT em `fighters` por externalId. Recalcula stats agregadas a partir das fights.
    3. Para fight rows: dedupe por (fighterName, opponent, fightDate).
    4. INSERT em `fights` se nova; UPDATE se já existe.
    5. fight_stats: 1:1 com fights via fightId.

Roda na sequência: scrape_* → ETL → train_predictor.
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("etl_fighters")


def upsert_fighter_from_raw(c, raw_row: dict) -> int:
    """Upsert linha enriched a partir do raw mais recente. Retorna fighter id."""
    ext = raw_row.get("externalId")
    name = raw_row["name"]

    # find existing
    if ext:
        c.execute("SELECT id FROM fighters WHERE externalId = %s LIMIT 1", (ext,))
    else:
        c.execute("SELECT id FROM fighters WHERE name = %s LIMIT 1", (name,))
    row = c.fetchone()

    fields = {
        "name":        name,
        "nickname":    raw_row.get("nickname"),
        "nationality": raw_row.get("nationality"),
        "birthDate":   raw_row.get("birthDate"),
        "heightCm":    raw_row.get("heightCm"),
        "reachCm":     raw_row.get("reachCm"),
        "weightKg":    raw_row.get("weightKg"),
        "stance":      raw_row.get("stance"),
        "primaryTeam": raw_row.get("primaryTeam"),
        "weightClass": raw_row.get("weightClass"),
        "sourceUrl":   raw_row.get("sourceUrl"),
        "sourceOrg":   raw_row.get("source"),
        "lastScrapedAt": raw_row.get("scrapedAt"),
    }
    fields = {k: v for k, v in fields.items() if v is not None}

    if row:
        fid = row[0]
        if fields:
            sets = ",".join(f"`{k}`=%s" for k in fields)
            c.execute(f"UPDATE fighters SET {sets} WHERE id=%s",
                      list(fields.values()) + [fid])
        return fid

    if ext:
        fields["externalId"] = ext
    cols = ",".join(f"`{k}`" for k in fields)
    placeholders = ",".join(["%s"] * len(fields))
    c.execute(f"INSERT INTO fighters ({cols}) VALUES ({placeholders})",
              list(fields.values()))
    return c.lastrowid


def latest_fighters_raw(c) -> list[dict]:
    """Pega 1 linha por (source, externalId|name) — a mais recente."""
    c.execute("""
        SELECT r.* FROM fighters_raw r
        JOIN (
            SELECT
                COALESCE(externalId, CONCAT('NAME:', name)) AS k,
                MAX(scrapedAt) AS ts
            FROM fighters_raw
            GROUP BY k
        ) m
          ON COALESCE(r.externalId, CONCAT('NAME:', r.name)) = m.k
         AND r.scrapedAt = m.ts
    """)
    return c.fetchall()


def etl_fighters():
    log.info("ETL fighters_raw → fighters")
    with cursor(dictionary=True, commit=True) as (_, c):
        rows = latest_fighters_raw(c)
        log.info(f"  raw rows distintos: {len(rows)}")
        n = 0
        for r in rows:
            try:
                upsert_fighter_from_raw(c, r)
                n += 1
            except Exception as e:
                log.warning(f"  erro upsert {r.get('name')}: {e}")
        log.info(f"  upserts: {n}")


def etl_fights():
    """Move fights_raw → fights, deduplicado."""
    log.info("ETL fights_raw → fights")
    with cursor(dictionary=True, commit=True) as (_, c):
        c.execute("""
            SELECT r.* FROM fights_raw r
            JOIN (
                SELECT fighterName, opponent, COALESCE(fightDate, '?') AS dt,
                       MAX(scrapedAt) AS ts
                FROM fights_raw
                GROUP BY fighterName, opponent, dt
            ) m
              ON r.fighterName = m.fighterName
             AND r.opponent = m.opponent
             AND COALESCE(r.fightDate, '?') = m.dt
             AND r.scrapedAt = m.ts
        """)
        rows = c.fetchall()
        log.info(f"  raw rows distintos: {len(rows)}")

        n_ins = n_upd = 0
        for r in rows:
            # find fighter id by name
            c.execute("SELECT id FROM fighters WHERE name = %s LIMIT 1", (r["fighterName"],))
            f = c.fetchone()
            if not f:
                continue
            fighter_id = f["id"]

            c.execute("""SELECT id FROM fights
                         WHERE fighterId=%s AND opponent=%s
                           AND COALESCE(fightDate,'?')=COALESCE(%s,'?')
                         LIMIT 1""",
                      (fighter_id, r["opponent"], r.get("fightDate")))
            existing = c.fetchone()

            payload = {
                "fighterId":      fighter_id,
                "opponent":       r["opponent"],
                "fightDate":      r.get("fightDate"),
                "result":         r.get("result"),
                "methodCategory": r.get("methodCategory"),
                "methodDetail":   r.get("methodDetail"),
                "round":          r.get("round"),
                "timeInRound":    r.get("timeInRound"),
                "promotion":      r.get("promotion"),
                "event":          r.get("event"),
                "weightClass":    r.get("weightClass"),
            }
            payload = {k: v for k, v in payload.items() if v is not None}
            if existing:
                sets = ",".join(f"`{k}`=%s" for k in payload)
                c.execute(f"UPDATE fights SET {sets} WHERE id=%s",
                          list(payload.values()) + [existing["id"]])
                n_upd += 1
            else:
                cols = ",".join(f"`{k}`" for k in payload)
                placeholders = ",".join(["%s"] * len(payload))
                c.execute(f"INSERT INTO fights ({cols}) VALUES ({placeholders})",
                          list(payload.values()))
                n_ins += 1
        log.info(f"  inserts: {n_ins}, updates: {n_upd}")


def main():
    etl_fighters()
    etl_fights()
    log.info("ETL fighters/fights concluído.")


if __name__ == "__main__":
    main()
