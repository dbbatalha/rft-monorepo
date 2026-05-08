#!/usr/bin/env python3
"""
ETL: official_rankings_raw  →  official_rankings (substituição completa)

Para cada org, pega o snapshot mais recente e substitui os ranks.
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor, replace_official_rankings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("etl_rankings")


def latest_org_snapshot(c, org: str) -> list[dict]:
    """Pega todas as linhas com o scrapedAt máximo da org."""
    c.execute("SELECT MAX(scrapedAt) AS ts FROM official_rankings_raw WHERE org = %s", (org,))
    ts = c.fetchone()["ts"]
    if not ts:
        return []
    c.execute("""SELECT org, weightClass, `rank`, fighterName, isChampion, isInterim
                 FROM official_rankings_raw
                 WHERE org = %s AND scrapedAt = %s""", (org, ts))
    return c.fetchall()


def sync_fighter_champion_flags(c):
    """Sincroniza fighters.isChampion / isInterim a partir do enriched."""
    c.execute("UPDATE fighters SET isChampion=0, isInterim=0")
    c.execute("""SELECT DISTINCT fighterName FROM official_rankings
                 WHERE isChampion=1""")
    champs = [r["fighterName"] for r in c.fetchall()]
    c.execute("""SELECT DISTINCT fighterName FROM official_rankings
                 WHERE isInterim=1""")
    interims = [r["fighterName"] for r in c.fetchall()]
    for name in champs:
        c.execute("UPDATE fighters SET isChampion=1 WHERE name=%s", (name,))
    for name in interims:
        c.execute("UPDATE fighters SET isInterim=1 WHERE name=%s", (name,))
    return len(champs), len(interims)


def main():
    log.info("ETL official_rankings_raw → official_rankings")
    with cursor(dictionary=True, commit=True) as (_, c):
        c.execute("SELECT DISTINCT org FROM official_rankings_raw")
        orgs = [r["org"] for r in c.fetchall()]

        for org in orgs:
            snap = latest_org_snapshot(c, org)
            if not snap:
                continue
            replace_official_rankings(c, org, snap)
            log.info(f"  {org}: {len(snap)} ranks substituídos")

        ch, it = sync_fighter_champion_flags(c)
        log.info(f"  fighters.isChampion={ch}, fighters.isInterim={it}")
    log.info("ETL rankings concluído.")


if __name__ == "__main__":
    main()
