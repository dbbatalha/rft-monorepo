#!/usr/bin/env python3
"""
ETL: upcoming_events_raw + upcoming_bouts_raw  →  upcoming_events + upcoming_bouts

Para cada org, pega o batch mais recente (max scrapedAt) e substitui o estado atual.
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("etl_upcoming")


def main():
    log.info("ETL upcoming_*_raw → upcoming_*")
    with cursor(dictionary=True, commit=True) as (_, c):
        c.execute("SELECT DISTINCT org FROM upcoming_events_raw")
        orgs = [r["org"] for r in c.fetchall()]

        for org in orgs:
            # Snapshot mais recente da org
            c.execute("""SELECT MAX(scrapedAt) AS ts
                         FROM upcoming_events_raw
                         WHERE org = %s""", (org,))
            ts = c.fetchone()["ts"]
            if not ts:
                continue

            # Eventos
            c.execute("""SELECT * FROM upcoming_events_raw
                         WHERE org = %s AND scrapedAt = %s""", (org, ts))
            events_raw = c.fetchall()
            if not events_raw:
                continue

            # Wipe enriched para essa org
            c.execute("DELETE FROM upcoming_events WHERE org = %s", (org,))

            ev_count = bt_count = 0
            for ev in events_raw:
                c.execute("""INSERT INTO upcoming_events
                              (org, source, name, eventDate, location, url)
                             VALUES (%s,%s,%s,%s,%s,%s)""",
                          (org, ev["source"], ev["name"], ev.get("eventDate"),
                           ev.get("location"), ev["url"]))
                event_id = c.lastrowid
                ev_count += 1

                # Bouts daquele evento_raw
                c.execute("""SELECT * FROM upcoming_bouts_raw
                             WHERE eventRawId = %s
                             ORDER BY position""",
                          (ev["id"],))
                for b in c.fetchall():
                    c.execute("""INSERT INTO upcoming_bouts
                                  (eventId, position, fighter1, fighter2, weightClass)
                                 VALUES (%s,%s,%s,%s,%s)""",
                              (event_id, b["position"], b["fighter1"], b["fighter2"],
                               b.get("weightClass")))
                    bt_count += 1

            log.info(f"  {org}: {ev_count} eventos, {bt_count} lutas")

    log.info("ETL upcoming concluído.")


if __name__ == "__main__":
    main()
