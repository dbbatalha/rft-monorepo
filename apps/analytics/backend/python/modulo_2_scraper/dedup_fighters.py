#!/usr/bin/env python3
"""
dedup_fighters.py — Remove fighter duplicates created by the expanded UFC scrape.

For each name that appears more than once:
  - Keep the fighter with actual fight history (fights_in_db > 0)
  - If tie, keep the one with more total fights (wins+losses+draws)
  - Update the keeper's stats with the best available data
  - Copy externalId from the duplicate to the keeper (for future scrape dedup)
  - Delete the losers
"""

import mysql.connector

DB_CONFIG = {
    "host": "127.0.0.1", "port": 3308,
    "user": "mma_user", "password": "mma_password",
    "database": "mma_analytics",
}

def main():
    db = mysql.connector.connect(**DB_CONFIG, buffered=True)
    c  = db.cursor(dictionary=True)

    # Get all duplicate names
    c.execute("""
        SELECT name FROM fighters
        GROUP BY name HAVING COUNT(*) > 1
        ORDER BY name
    """)
    dup_names = [r["name"] for r in c.fetchall()]
    print(f"Found {len(dup_names)} duplicate names — deduplicating...")

    kept = 0
    deleted = 0

    for name in dup_names:
        c.execute("""
            SELECT f.id, f.externalId, f.sourceOrg, f.wins, f.losses, f.draws,
                   f.totalFightsPro, f.weightClass, f.heightCm, f.reachCm,
                   f.nationality, f.nickname, f.primaryTeam, f.stance, f.birthDate,
                   f.koTkoWins, f.submissionWins, f.decisionWins,
                   (SELECT COUNT(*) FROM fights fi WHERE fi.fighterId = f.id) AS fight_count
            FROM fighters f
            WHERE f.name = %s
            ORDER BY fight_count DESC, (f.wins + f.losses + f.draws) DESC
        """, (name,))
        rows = c.fetchall()

        if len(rows) < 2:
            continue

        # First row = best candidate (most fights in DB, then most total fights)
        keeper = rows[0]
        losers = rows[1:]

        # If keeper has 0 fights but a loser has more — swap (shouldn't happen after ORDER BY)
        # Collect best stats across all versions
        best_wins     = max(r["wins"] or 0 for r in rows)
        best_losses   = max(r["losses"] or 0 for r in rows)
        best_draws    = max(r["draws"] or 0 for r in rows)
        best_total    = max(r["totalFightsPro"] or 0 for r in rows)
        best_ko       = max(r["koTkoWins"] or 0 for r in rows)
        best_sub      = max(r["submissionWins"] or 0 for r in rows)
        best_dec      = max(r["decisionWins"] or 0 for r in rows)
        best_wc       = next((r["weightClass"] for r in rows if r["weightClass"]), None)
        best_h        = next((r["heightCm"] for r in rows if r["heightCm"]), None)
        best_reach    = next((r["reachCm"] for r in rows if r["reachCm"]), None)
        best_nat      = next((r["nationality"] for r in rows if r["nationality"]), None)
        best_nick     = next((r["nickname"] for r in rows if r["nickname"]), None)
        best_team     = next((r["primaryTeam"] for r in rows if r["primaryTeam"]), None)
        best_stance   = next((r["stance"] for r in rows if r["stance"]), None)
        best_birth    = next((r["birthDate"] for r in rows if r["birthDate"]), None)
        # Prefer externalId from UFC version (for future dedup)
        best_ext_id   = next((r["externalId"] for r in rows if r["externalId"]), None)
        # Prefer sourceOrg=NULL (original) over 'UFC' for the keep
        best_org      = next((r["sourceOrg"] for r in rows if not r["sourceOrg"]), keeper["sourceOrg"])

        # Update keeper with merged best stats
        c.execute("""
            UPDATE fighters SET
                wins=%s, losses=%s, draws=%s, totalFightsPro=%s,
                koTkoWins=%s, submissionWins=%s, decisionWins=%s,
                weightClass=COALESCE(%s, weightClass),
                heightCm=COALESCE(%s, heightCm),
                reachCm=COALESCE(%s, reachCm),
                nationality=COALESCE(%s, nationality),
                nickname=COALESCE(%s, nickname),
                primaryTeam=COALESCE(%s, primaryTeam),
                stance=COALESCE(%s, stance),
                birthDate=COALESCE(%s, birthDate),
                externalId=COALESCE(%s, externalId),
                sourceOrg=%s,
                winRate=IF(%s > 0, %s/%s, 0)
            WHERE id=%s
        """, (
            best_wins, best_losses, best_draws, best_total,
            best_ko, best_sub, best_dec,
            best_wc, best_h, best_reach,
            best_nat, best_nick, best_team, best_stance, best_birth,
            best_ext_id, best_org,
            best_total, best_wins, best_total,
            keeper["id"]
        ))

        # Reassign any fights from losers to keeper (shouldn't have any, but safety)
        loser_ids = [r["id"] for r in losers]
        for lid in loser_ids:
            c.execute("UPDATE fights SET fighterId=%s WHERE fighterId=%s", (keeper["id"], lid))

        # Delete losers
        for lid in loser_ids:
            c.execute("DELETE FROM fighters WHERE id=%s", (lid,))
            deleted += 1

        kept += 1

    db.commit()
    c.close()
    db.close()
    print(f"Done: kept {kept} fighters, deleted {deleted} duplicates.")

if __name__ == "__main__":
    main()
