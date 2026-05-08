#!/usr/bin/env python3
"""
Recompute all fighter stats from the fights table.
Updates: wins, losses, draws, winRate, finishRate, submissionWinRate,
         koTkoWins, submissionWins, decisionWins, totalFightsPro,
         currentStreak, currentStreakCount, longestWinStreak, avgFightTimeSeconds
"""

import mysql.connector

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3308,
    "user": "mma_user",
    "password": "mma_password",
    "database": "mma_analytics",
}


def compute_streak(results):
    """Given results list (oldest first), compute current streak and longest win streak."""
    if not results:
        return "W", 0, 0

    # Current streak
    current_result = results[-1]
    current_count = 0
    for r in reversed(results):
        if r == current_result:
            current_count += 1
        else:
            break

    # Longest win streak
    longest = 0
    streak = 0
    for r in results:
        if r == "win":
            streak += 1
            longest = max(longest, streak)
        else:
            streak = 0

    return current_result, current_count, longest


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor(dictionary=True)

    # Get all fighters
    cur.execute("SELECT id FROM fighters ORDER BY id")
    fighter_ids = [row["id"] for row in cur.fetchall()]

    updated = 0
    for fid in fighter_ids:
        # Get all fights ordered by date
        cur.execute("""
            SELECT result, methodCategory, elapsedTimeSeconds, fightDate
            FROM fights
            WHERE fighterId = %s AND fightDate IS NOT NULL
            ORDER BY fightDate ASC
        """, (fid,))
        fights = cur.fetchall()

        if not fights:
            continue

        total = len(fights)
        wins = sum(1 for f in fights if f["result"] == "win")
        losses = sum(1 for f in fights if f["result"] == "loss")
        draws = sum(1 for f in fights if f["result"] == "draw")

        ko_wins = sum(1 for f in fights if f["result"] == "win" and f["methodCategory"] == "KO_TKO")
        sub_wins = sum(1 for f in fights if f["result"] == "win" and f["methodCategory"] == "SUBMISSION")
        dec_wins = sum(1 for f in fights if f["result"] == "win" and f["methodCategory"] == "DECISION")

        win_rate = wins / total if total > 0 else 0.0
        finish_wins = ko_wins + sub_wins
        finish_rate = finish_wins / wins if wins > 0 else 0.0
        sub_win_rate = sub_wins / wins if wins > 0 else 0.0

        elapsed = [f["elapsedTimeSeconds"] for f in fights if f["elapsedTimeSeconds"]]
        avg_time = sum(elapsed) / len(elapsed) if elapsed else None

        results_list = [f["result"] for f in fights]
        current_result, current_count, longest_win_streak = compute_streak(results_list)
        streak_label = "W" if current_result == "win" else ("L" if current_result == "loss" else "D")

        cur.execute("""
            UPDATE fighters SET
                totalFightsPro   = %s,
                wins             = %s,
                losses           = %s,
                draws            = %s,
                winRate          = %s,
                finishRate       = %s,
                submissionWinRate= %s,
                koTkoWins        = %s,
                submissionWins   = %s,
                decisionWins     = %s,
                currentStreak    = %s,
                currentStreakCount= %s,
                longestWinStreak = %s,
                avgFightTimeSeconds = %s
            WHERE id = %s
        """, (
            total, wins, losses, draws,
            round(win_rate, 4), round(finish_rate, 4), round(sub_win_rate, 4),
            ko_wins, sub_wins, dec_wins,
            streak_label, current_count, longest_win_streak,
            avg_time,
            fid,
        ))
        updated += 1

    conn.commit()
    print(f"Recomputed stats for {updated} fighters.")

    # Quick sanity check
    cur.execute("""
        SELECT name, wins, losses, koTkoWins, submissionWins, decisionWins,
               ROUND(winRate*100,1) as winPct
        FROM fighters
        ORDER BY wins DESC
        LIMIT 10
    """)
    print("\nTop 10 by wins:")
    for r in cur.fetchall():
        print(f"  {r['name']:<30} {r['wins']}W-{r['losses']}L | "
              f"KO:{r['koTkoWins']} Sub:{r['submissionWins']} Dec:{r['decisionWins']} | "
              f"{r['winPct']}%")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
