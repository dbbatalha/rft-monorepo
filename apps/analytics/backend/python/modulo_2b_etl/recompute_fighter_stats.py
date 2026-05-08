#!/usr/bin/env python3
"""
Recalcula estatísticas agregadas em `fighters` a partir de `fights`:
  wins, losses, draws, totalFightsPro,
  winRate, finishRate, submissionWinRate,
  koTkoWins, submissionWins, decisionWins,
  currentStreak, currentStreakCount, longestWinStreak,
  avgFightTimeSeconds.

Roda DEPOIS do etl_fighters/etl_fights, antes do treino do modelo.
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("recompute_fighter_stats")


def compute_for_fighter(c, fighter_id: int):
    c.execute("""SELECT result, methodCategory, elapsedTimeSeconds, fightDate
                 FROM fights WHERE fighterId=%s
                 ORDER BY fightDate DESC""", (fighter_id,))
    rows = c.fetchall()
    if not rows:
        return

    wins = sum(1 for r in rows if r["result"] == "win")
    losses = sum(1 for r in rows if r["result"] == "loss")
    draws = sum(1 for r in rows if r["result"] == "draw")
    total = wins + losses + draws
    if total == 0:
        return

    ko_w  = sum(1 for r in rows if r["result"] == "win" and r["methodCategory"] == "KO_TKO")
    sub_w = sum(1 for r in rows if r["result"] == "win" and r["methodCategory"] == "SUBMISSION")
    dec_w = sum(1 for r in rows if r["result"] == "win" and r["methodCategory"] == "DECISION")

    win_rate    = wins / total
    finish_rate = (ko_w + sub_w) / wins if wins else 0
    sub_rate    = sub_w / wins if wins else 0

    # Streak (a partir das mais recentes)
    streak_type = None
    streak_count = 0
    for r in rows:
        if r["result"] not in ("win", "loss"):
            break
        cur = "W" if r["result"] == "win" else "L"
        if streak_type is None:
            streak_type = cur
            streak_count = 1
        elif cur == streak_type:
            streak_count += 1
        else:
            break

    # Longest win streak
    longest = cur_run = 0
    for r in reversed(rows):  # cronológico crescente
        if r["result"] == "win":
            cur_run += 1
            longest = max(longest, cur_run)
        else:
            cur_run = 0

    times = [r["elapsedTimeSeconds"] for r in rows if r.get("elapsedTimeSeconds")]
    avg_time = sum(times) / len(times) if times else None

    c.execute("""UPDATE fighters SET
                   wins=%s, losses=%s, draws=%s, totalFightsPro=%s,
                   winRate=%s, finishRate=%s, submissionWinRate=%s,
                   koTkoWins=%s, submissionWins=%s, decisionWins=%s,
                   currentStreak=%s, currentStreakCount=%s,
                   longestWinStreak=%s, avgFightTimeSeconds=%s
                 WHERE id=%s""",
              (wins, losses, draws, total,
               win_rate, finish_rate, sub_rate,
               ko_w, sub_w, dec_w,
               streak_type, streak_count,
               longest, avg_time,
               fighter_id))


def main():
    log.info("Recompute fighter stats")
    with cursor(dictionary=True, commit=True) as (_, c):
        c.execute("SELECT id FROM fighters")
        ids = [r["id"] for r in c.fetchall()]
        log.info(f"  fighters: {len(ids)}")
        for i, fid in enumerate(ids, 1):
            compute_for_fighter(c, fid)
            if i % 200 == 0:
                log.info(f"    {i}/{len(ids)}")
    log.info("Done.")


if __name__ == "__main__":
    main()
