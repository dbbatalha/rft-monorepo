#!/usr/bin/env python3
"""
Exporta o estado atual do MySQL como JSONs estáticos pra o frontend de analytics
consumir via fetch() — substitui as procedures tRPC numa hospedagem só-estática.

Saída:  apps/analytics/frontend/public/data/

Estrutura:
    stats.json                       # dashboard.stats
    orgs.json                        # dashboard.organizations
    ranking-orgs.json                # dashboard.rankingOrganizations
    fighters.json                    # fighters.listAlpha (lista alfabética completa, ~2 MB)
    fighters-light.json              # fighters.list (id+name+wc+record, ~200 KB)
    fighters-recent.json             # fighters.recent (top 20)
    top10-names.json                 # fighters.top10Names
    rankings/<org>.json              # fighters.rankings (1 arquivo por org)
    upcoming/<org>.json              # events.upcoming (1 arquivo por org)
    fighters/<id>.json               # fighters.getById (1 arquivo por atleta — lazy)
    fights-by-fighter/<id>.json      # fights.byFighter (1 arquivo por atleta — lazy)
"""
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor

OUT = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "public" / "data"

WEIGHT_CLASS_ORDER = [
    "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
    "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
    "Women's Strawweight", "Women's Flyweight",
    "Women's Bantamweight", "Women's Featherweight",
]


def write(path: Path, data) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, default=str, ensure_ascii=False, separators=(",", ":"))
    path.write_text(payload, encoding="utf-8")
    return len(payload)


# ---------------------------------------------------------------------------
# fighters.listAlpha + fighters.list
# ---------------------------------------------------------------------------

NOT_BELLATOR = "(f.sourceOrg IS NULL OR f.sourceOrg <> 'Bellator')"
HAS_DATA = """((f.wins > 0 OR f.losses > 0 OR f.draws > 0)
               AND EXISTS (SELECT 1 FROM fights WHERE fights.fighterId = f.id))"""


def export_fighters_alpha(c) -> int:
    c.execute(f"""
        SELECT f.* FROM fighters f
        WHERE {NOT_BELLATOR} AND {HAS_DATA}
        ORDER BY f.name
    """)
    rows = c.fetchall()
    return write(OUT / "fighters.json", rows)


def export_fighters_light(c) -> int:
    """Versão enxuta do fighters.list — pra autocompletes/dropdowns sem bundle pesado."""
    c.execute(f"""
        SELECT f.id, f.name, f.nickname, f.weightClass, f.wins, f.losses, f.draws,
               f.isChampion, f.sourceOrg
        FROM fighters f
        WHERE {NOT_BELLATOR} AND {HAS_DATA}
        ORDER BY f.name
    """)
    return write(OUT / "fighters-light.json", c.fetchall())


def export_fighters_recent(c, limit: int = 20) -> int:
    c.execute("""
        SELECT fighterId
        FROM fights
        WHERE fightDate IS NOT NULL AND fighterId IS NOT NULL
        GROUP BY fighterId
        ORDER BY MAX(fightDate) DESC
        LIMIT %s
    """, (limit,))
    fighter_ids = [r["fighterId"] for r in c.fetchall()]
    if not fighter_ids:
        return write(OUT / "fighters-recent.json", [])
    placeholders = ",".join(["%s"] * len(fighter_ids))
    c.execute(f"SELECT * FROM fighters WHERE id IN ({placeholders})", fighter_ids)
    by_id = {r["id"]: r for r in c.fetchall()}
    ordered = [by_id[fid] for fid in fighter_ids if fid in by_id]
    return write(OUT / "fighters-recent.json", ordered)


# ---------------------------------------------------------------------------
# fighters.getById  +  fights.byFighter   (1 arquivo por atleta — lazy load)
# ---------------------------------------------------------------------------

def export_fighter_details(c) -> tuple[int, int]:
    """Pra cada atleta com dados, escreve 2 arquivos:
       - fighters/<id>.json      (perfil)
       - fights-by-fighter/<id>.json  (lutas)
    """
    c.execute(f"""SELECT f.id FROM fighters f WHERE {NOT_BELLATOR} AND {HAS_DATA}""")
    ids = [r["id"] for r in c.fetchall()]

    n_profile = n_fights = 0
    fighters_dir = OUT / "fighters"
    fights_dir = OUT / "fights-by-fighter"
    if fighters_dir.exists(): shutil.rmtree(fighters_dir)
    if fights_dir.exists(): shutil.rmtree(fights_dir)
    fighters_dir.mkdir(parents=True, exist_ok=True)
    fights_dir.mkdir(parents=True, exist_ok=True)

    for fid in ids:
        c.execute("SELECT * FROM fighters WHERE id = %s", (fid,))
        profile = c.fetchone()
        if not profile:
            continue
        n_profile += write(fighters_dir / f"{fid}.json", profile)

        c.execute("""SELECT * FROM fights WHERE fighterId = %s
                     ORDER BY fightDate DESC, id DESC""", (fid,))
        fights = c.fetchall()
        n_fights += write(fights_dir / f"{fid}.json", fights)
    return len(ids), n_profile + n_fights


# ---------------------------------------------------------------------------
# fighters.rankings — 1 arquivo por org
# ---------------------------------------------------------------------------

def export_rankings(c) -> int:
    c.execute("SELECT DISTINCT org FROM official_rankings_raw")
    orgs = [r["org"] for r in c.fetchall()]
    if not orgs:
        c.execute("SELECT DISTINCT org FROM official_rankings")
        orgs = [r["org"] for r in c.fetchall()]

    total = 0
    rankings_dir = OUT / "rankings"
    if rankings_dir.exists(): shutil.rmtree(rankings_dir)
    rankings_dir.mkdir(parents=True, exist_ok=True)

    for org in orgs:
        c.execute("""SELECT * FROM official_rankings WHERE org = %s
                     ORDER BY weightClass, `rank`""", (org,))
        official = c.fetchall()
        if not official:
            payload = [{"weightClass": wc, "fighters": []} for wc in WEIGHT_CLASS_ORDER]
            total += write(rankings_dir / f"{org}.json", payload)
            continue

        # name → profile lookup
        names = list({r["fighterName"] for r in official})
        profile_map = {}
        for i in range(0, len(names), 50):
            chunk = names[i:i+50]
            ph = ",".join(["%s"] * len(chunk))
            c.execute(f"""
                SELECT id, name, wins, losses, draws, nickname, winRate, isChampion, nationality
                FROM fighters WHERE name IN ({ph})
            """, chunk)
            for r in c.fetchall():
                profile_map[r["name"]] = r

        # group by weight class preserving order
        class_map: dict[str, list] = {}
        for entry in official:
            wc = entry["weightClass"]
            class_map.setdefault(wc, [])
            p = profile_map.get(entry["fighterName"])
            class_map[wc].append({
                "rank": entry["rank"],
                "isChampion": entry["isChampion"],
                "isInterim": entry["isInterim"],
                "name": entry["fighterName"],
                "id": p["id"] if p else None,
                "wins": p.get("wins") if p else None,
                "losses": p.get("losses") if p else None,
                "draws": p.get("draws") if p else None,
                "nickname": p.get("nickname") if p else None,
                "winRate": p.get("winRate") if p else None,
                "nationality": p.get("nationality") if p else None,
            })

        result = []
        for wc in WEIGHT_CLASS_ORDER:
            result.append({"weightClass": wc, "fighters": class_map.pop(wc, [])})
        for wc, entries in class_map.items():
            if "P4P" not in wc:
                result.append({"weightClass": wc, "fighters": entries})

        total += write(rankings_dir / f"{org}.json", result)
    return total


# ---------------------------------------------------------------------------
# events.upcoming — 1 arquivo por org
# ---------------------------------------------------------------------------

def export_upcoming(c) -> int:
    c.execute("SELECT DISTINCT org FROM upcoming_events")
    orgs = [r["org"] for r in c.fetchall()]
    total = 0
    upcoming_dir = OUT / "upcoming"
    if upcoming_dir.exists(): shutil.rmtree(upcoming_dir)
    upcoming_dir.mkdir(parents=True, exist_ok=True)

    for org in orgs:
        c.execute("""SELECT * FROM upcoming_events
                     WHERE org = %s
                     ORDER BY updatedAt DESC""", (org,))
        events = c.fetchall()
        if not events:
            continue
        ids = [e["id"] for e in events]
        ph = ",".join(["%s"] * len(ids))
        c.execute(f"""SELECT * FROM upcoming_bouts
                      WHERE eventId IN ({ph})
                      ORDER BY eventId, position""", ids)
        bouts_by_event: dict[int, list] = {}
        for b in c.fetchall():
            bouts_by_event.setdefault(b["eventId"], []).append({
                "fighter1": b["fighter1"],
                "fighter2": b["fighter2"],
                "weightClass": b.get("weightClass") or "",
            })
        result = [{
            "name":     e["name"],
            "date":     e.get("eventDate") or "",
            "location": e.get("location")  or "",
            "url":      e["url"],
            "bouts":    bouts_by_event.get(e["id"], []),
        } for e in events]
        total += write(upcoming_dir / f"{org}.json", result)
    return total


# ---------------------------------------------------------------------------
# Top-level singletons
# ---------------------------------------------------------------------------

def export_stats(c) -> int:
    c.execute(f"SELECT * FROM fighters f WHERE {NOT_BELLATOR} AND {HAS_DATA}")
    fighters = c.fetchall()
    c.execute("SELECT * FROM fight_predictions ORDER BY createdAt DESC LIMIT 100")
    predictions = c.fetchall()
    avg = sum((f.get("winRate") or 0) for f in fighters) / len(fighters) if fighters else 0
    return write(OUT / "stats.json", {
        "totalFighters":    len(fighters),
        "totalPredictions": len(predictions),
        "avgWinRate":       avg,
        "topFighters":      sorted(fighters, key=lambda f: f.get("wins") or 0, reverse=True)[:5],
    })


def export_orgs(c) -> int:
    c.execute("""
        SELECT DISTINCT name AS name, shortName
        FROM organizations WHERE active = 1
    """)
    orgs = [{"name": r["name"], "shortName": r.get("shortName")} for r in c.fetchall()]
    return write(OUT / "orgs.json", sorted(orgs, key=lambda o: o["name"]))


def export_ranking_orgs(c) -> int:
    c.execute("SELECT DISTINCT org FROM official_rankings")
    return write(OUT / "ranking-orgs.json", [r["org"] for r in c.fetchall()])


def export_top10_names(c) -> int:
    c.execute("""SELECT DISTINCT fighterName FROM official_rankings
                 WHERE `rank` BETWEEN 1 AND 10""")
    return write(OUT / "top10-names.json", [r["fighterName"] for r in c.fetchall()])


# ---------------------------------------------------------------------------

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"➤ Exportando para {OUT}")
    print()

    with cursor(dictionary=True, commit=False) as (_, c):
        size = export_stats(c);             print(f"  stats.json              {size:>10,}b")
        size = export_orgs(c);              print(f"  orgs.json               {size:>10,}b")
        size = export_ranking_orgs(c);      print(f"  ranking-orgs.json       {size:>10,}b")
        size = export_top10_names(c);       print(f"  top10-names.json        {size:>10,}b")
        size = export_fighters_alpha(c);    print(f"  fighters.json           {size:>10,}b")
        size = export_fighters_light(c);    print(f"  fighters-light.json     {size:>10,}b")
        size = export_fighters_recent(c);   print(f"  fighters-recent.json    {size:>10,}b")
        size = export_rankings(c);          print(f"  rankings/*.json         {size:>10,}b total")
        size = export_upcoming(c);          print(f"  upcoming/*.json         {size:>10,}b total")
        n_fighters, total_size = export_fighter_details(c)
        print(f"  fighters/*.json + fights-by-fighter/*.json    {n_fighters} atletas, {total_size:>10,}b")

    print()
    print("✓ Export estático concluído.")


if __name__ == "__main__":
    main()
