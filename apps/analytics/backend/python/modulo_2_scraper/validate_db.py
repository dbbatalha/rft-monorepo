#!/usr/bin/env python3
"""
validate_db.py — Validação de integridade do banco mma_analytics

Verifica:
  1. Lutadores e lutas por organização
  2. Campeões conhecidos por organização presentes no DB
  3. Lutadores sem categoria de peso
  4. Lutadores sem nenhuma luta registrada
  5. Cartel impossível (wins+losses+draws ≠ totalFightsPro)
  6. winRate inconsistente
  7. Lutas com resultado NULL
  8. Lutas sem promotion
  9. Duplicatas de nome exato
 10. Categorias de peso inválidas (catchweights, etc.)

Usage:
    python3 validate_db.py
    python3 validate_db.py --fix   # corrige automaticamente o que for seguro
    python3 validate_db.py --org UFC  # valida só uma organização
"""

import argparse
import mysql.connector

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3308,
    "user": "mma_user",
    "password": "mma_password",
    "database": "mma_analytics",
}

# Campeões / atletas de referência por organização
# Usados para verificar se o DB tem cobertura adequada
# Campeões verificados em abril/2026 via ufc.com.br e ESPN
KNOWN_CHAMPIONS = {
    "UFC": {
        "Flyweight":             "Joshua Van",
        "Bantamweight":          "Petr Yan",
        "Featherweight":         "Alexander Volkanovski",
        "Lightweight":           "Ilia Topuria",
        "Welterweight":          "Islam Makhachev",
        "Middleweight":          "Khamzat Chimaev",
        "Light Heavyweight":     "Carlos Ulberg",
        "Heavyweight":           "Tom Aspinall",
        "Women's Strawweight":   "Mackenzie Dern",
        "Women's Flyweight":     "Valentina Shevchenko",
        "Women's Bantamweight":  "Kayla Harrison",
    },
    "PFL": {
        "Heavyweight":           "Vadim Nemkov",
        "Light Heavyweight":     "Corey Anderson",
        "Middleweight":          "Costello van Steenis",
        "Women's Featherweight": "Cris Cyborg",
    },
    "LFA": {
        "Flyweight":          "",   # sem campeão fixo — verifica só cobertura
        "Bantamweight":       "",
        "Lightweight":        "",
        "Welterweight":       "",
    },
    "Jungle Fight": {
        "Lightweight":        "",
        "Welterweight":       "",
    },
}

VALID_WEIGHT_CLASSES = {
    "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
    "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
    "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
    "Women's Featherweight", "Strawweight",
}

PASS = "\033[92m✔\033[0m"
WARN = "\033[93m⚠\033[0m"
FAIL = "\033[91m✘\033[0m"
INFO = "\033[94m·\033[0m"

def get_conn():
    return mysql.connector.connect(**DB_CONFIG, buffered=True)

def cur(db):
    return db.cursor(dictionary=True)

def section(title):
    print(f"\n{'─'*64}")
    print(f"  {title}")
    print(f"{'─'*64}")

def run_validation(fix: bool = False, org_filter: str = None):
    db = get_conn()
    c = cur(db)
    errors = 0
    warnings = 0

    # ── 1. Cobertura por organização ──────────────────────────────────────────
    section("1. Lutadores e lutas por organização")
    c.execute("""
        SELECT COALESCE(sourceOrg, 'UFC') as org, COUNT(*) as fighters
        FROM fighters GROUP BY org ORDER BY fighters DESC
    """)
    org_fighters = {r["org"]: r["fighters"] for r in c.fetchall()}

    c.execute("""
        SELECT COALESCE(promotion, 'SEM ORGANIZAÇÃO') as org, COUNT(*) as fights
        FROM fights GROUP BY org ORDER BY fights DESC
    """)
    org_fights = {r["org"]: r["fights"] for r in c.fetchall()}

    all_orgs = sorted(set(list(org_fighters.keys()) + list(org_fights.keys())))
    print(f"  {'Organização':<28} {'Atletas':>8}  {'Lutas':>8}")
    print(f"  {'─'*28} {'─'*8}  {'─'*8}")
    for org in all_orgs:
        if org_filter and org != org_filter:
            continue
        f = org_fighters.get(org, 0)
        fi = org_fights.get(org, 0)
        flag = PASS if f > 0 and fi > 0 else WARN
        print(f"  {flag} {org:<26} {f:>8}  {fi:>8}")

    c.execute("SELECT COUNT(*) as n FROM fighters")
    total_f = c.fetchone()["n"]
    c.execute("SELECT COUNT(*) as n FROM fights")
    total_fi = c.fetchone()["n"]
    print(f"\n  Total: {total_f} atletas | {total_fi} lutas")

    # ── 2. Campeões / atletas de referência no DB ─────────────────────────────
    orgs_to_check = [org_filter] if org_filter else list(KNOWN_CHAMPIONS.keys())
    for org in orgs_to_check:
        if org not in KNOWN_CHAMPIONS:
            continue
        champs = KNOWN_CHAMPIONS[org]
        section(f"2. Atletas de referência — {org}")

        n_fighters = org_fighters.get(org, 0)
        n_fights   = org_fights.get(org, 0)
        print(f"  {INFO} {n_fighters} atletas | {n_fights} lutas no banco\n")

        missing = []
        for wc, champ in champs.items():
            if not champ:
                # Só verifica se há lutadores nesse peso
                if org == "UFC":
                    c.execute("""
                        SELECT COUNT(*) as n FROM fighters
                        WHERE weightClass=%s AND (sourceOrg IS NULL OR sourceOrg='' OR sourceOrg='UFC')
                    """, (wc,))
                else:
                    c.execute("""
                        SELECT COUNT(*) as n FROM fighters
                        WHERE weightClass=%s AND sourceOrg=%s
                    """, (wc, org))
                n = c.fetchone()["n"]
                flag = PASS if n > 0 else WARN
                print(f"  {flag} {wc:<30}  {n} atletas no DB")
                if n == 0:
                    warnings += 1
                continue

            c.execute("SELECT id, name, wins, losses FROM fighters WHERE name=%s", (champ,))
            row = c.fetchone()
            if row:
                print(f"  {PASS} {champ:<30} ({wc})  {row['wins']}W-{row['losses']}L")
            else:
                last = champ.split()[-1]
                c.execute("SELECT name FROM fighters WHERE name LIKE %s LIMIT 1", (f"%{last}%",))
                fuzzy = c.fetchone()
                if fuzzy:
                    print(f"  {WARN} {champ:<30} ({wc})  → parcial: {fuzzy['name']}")
                    warnings += 1
                else:
                    print(f"  {FAIL} {champ:<30} ({wc})  NÃO ENCONTRADO")
                    errors += 1
                    missing.append((org, champ))

        if missing:
            if org == "UFC":
                print(f"\n  → Faltam atletas UFC. Scrape em andamento:")
                print(f"     python3 etl_multi_org.py --org ufc --max-fighters 9999")
            elif org == "Bellator":
                print(f"\n  → Execute: python3 etl_multi_org.py --org bellator --max-events 30")
            elif org == "PFL":
                print(f"\n  → Execute: python3 etl_multi_org.py --org pfl --max-events 20")
            elif org == "LFA":
                print(f"\n  → Execute: python3 etl_multi_org.py --org lfa --max-events 20")

    # ── 3. Lutadores sem weightClass ──────────────────────────────────────────
    section("3. Lutadores sem categoria de peso")
    c.execute("SELECT COUNT(*) as n FROM fighters WHERE weightClass IS NULL OR weightClass=''")
    n = c.fetchone()["n"]
    flag = PASS if n == 0 else WARN
    print(f"  {flag} {n} lutadores sem weightClass")
    if n > 0:
        warnings += 1
        if fix:
            db2 = get_conn()
            c2 = cur(db2)
            c2.execute("""
                UPDATE fighters f
                JOIN (
                  SELECT fighterId, weightClass
                  FROM (
                    SELECT fighterId, weightClass,
                           ROW_NUMBER() OVER (PARTITION BY fighterId ORDER BY COUNT(*) DESC) as rn
                    FROM fights
                    WHERE weightClass IN (
                      'Flyweight','Bantamweight','Featherweight','Lightweight',
                      'Welterweight','Middleweight','Light Heavyweight','Heavyweight',
                      "Women's Strawweight","Women's Flyweight","Women's Bantamweight",
                      "Women's Featherweight","Strawweight"
                    )
                    GROUP BY fighterId, weightClass
                  ) t WHERE rn = 1
                ) best ON best.fighterId = f.id
                SET f.weightClass = best.weightClass
                WHERE f.weightClass IS NULL OR f.weightClass=''
            """)
            db2.commit()
            c2.close()
            db2.close()
            print(f"    → CORRIGIDO a partir do histórico de lutas")

    # ── 4. Categorias inválidas ───────────────────────────────────────────────
    section("4. Categorias de peso inválidas (catchweights, title prefix)")
    c.execute("""
        SELECT weightClass, COUNT(*) as n FROM fighters
        WHERE weightClass IS NOT NULL
          AND weightClass NOT IN ('Flyweight','Bantamweight','Featherweight',
            'Lightweight','Welterweight','Middleweight','Light Heavyweight',
            'Heavyweight',"Women's Strawweight","Women's Flyweight",
            "Women's Bantamweight","Women's Featherweight","Strawweight")
        GROUP BY weightClass ORDER BY n DESC
    """)
    invalid = c.fetchall()
    if not invalid:
        print(f"  {PASS} Nenhuma categoria inválida")
    else:
        print(f"  {WARN} {len(invalid)} categorias não-padrão:")
        warnings += 1
        for row in invalid:
            print(f"    • {row['weightClass']:35s} ({row['n']} atletas)")
        if fix:
            c.execute("""
                UPDATE fighters
                SET weightClass = NULL
                WHERE weightClass REGEXP '[0-9]+lb'
                   OR weightClass LIKE 'TITLE FIGHT %'
            """)
            db.commit()
            print(f"    → Catchweights e prefixos TITLE FIGHT removidos")

    # ── 5. Lutadores sem lutas ────────────────────────────────────────────────
    section("5. Lutadores sem nenhuma luta registrada")
    c.execute("""
        SELECT COUNT(*) as n FROM fighters f
        WHERE NOT EXISTS (SELECT 1 FROM fights fi WHERE fi.fighterId = f.id)
    """)
    n = c.fetchone()["n"]
    flag = PASS if n == 0 else WARN
    print(f"  {flag} {n} atletas sem histórico de lutas")
    if n > 0:
        warnings += 1
        c.execute("""
            SELECT name, COALESCE(sourceOrg,'UFC') as org FROM fighters f
            WHERE NOT EXISTS (SELECT 1 FROM fights fi WHERE fi.fighterId = f.id)
            ORDER BY org, name LIMIT 10
        """)
        for r in c.fetchall():
            print(f"    • {r['name']} ({r['org']})")
        if n > 10:
            print(f"    ... e mais {n-10}")

    # ── 6. Cartel inconsistente ───────────────────────────────────────────────
    section("6. Cartel inconsistente (wins+losses+draws vs totalFightsPro)")
    c.execute("""
        SELECT COUNT(*) as n FROM fighters
        WHERE totalFightsPro > 0
          AND ABS((wins + losses + draws) - totalFightsPro) > 2
    """)
    n = c.fetchone()["n"]
    flag = PASS if n == 0 else WARN
    print(f"  {flag} {n} atletas com cartel possivelmente incorreto")
    if n > 0:
        warnings += 1
        c.execute("""
            SELECT name, COALESCE(sourceOrg,'UFC') as org,
                   wins, losses, draws, totalFightsPro
            FROM fighters
            WHERE totalFightsPro > 0
              AND ABS((wins + losses + draws) - totalFightsPro) > 2
            ORDER BY totalFightsPro DESC LIMIT 8
        """)
        for r in c.fetchall():
            print(f"    • {r['name']:30s} ({r['org']})  "
                  f"rec={r['wins']}W/{r['losses']}L/{r['draws']}D  total={r['totalFightsPro']}")

    # ── 7. winRate inconsistente ──────────────────────────────────────────────
    section("7. winRate incorreto")
    c.execute("""
        SELECT COUNT(*) as n FROM fighters
        WHERE totalFightsPro > 0
          AND ABS(winRate - wins/totalFightsPro) > 0.02
    """)
    n = c.fetchone()["n"]
    flag = PASS if n == 0 else WARN
    print(f"  {flag} {n} atletas com winRate desalinhado")
    if n > 0:
        warnings += 1
        if fix:
            c.execute("""
                UPDATE fighters
                SET winRate = IF(totalFightsPro > 0, wins/totalFightsPro, 0)
                WHERE totalFightsPro > 0
                  AND ABS(winRate - wins/totalFightsPro) > 0.02
            """)
            db.commit()
            print(f"    → CORRIGIDO")

    # ── 8. Lutas sem resultado ────────────────────────────────────────────────
    section("8. Lutas sem resultado registrado")
    c.execute("SELECT COUNT(*) as n FROM fights WHERE result IS NULL")
    n = c.fetchone()["n"]
    flag = PASS if n == 0 else WARN
    print(f"  {flag} {n} lutas sem resultado")
    if n > 0:
        warnings += 1

    # ── 9. Duplicatas ─────────────────────────────────────────────────────────
    section("9. Nomes duplicados de lutadores")
    c.execute("""
        SELECT name, COUNT(*) as cnt FROM fighters
        GROUP BY name HAVING cnt > 1 ORDER BY cnt DESC
    """)
    dups = c.fetchall()
    if not dups:
        print(f"  {PASS} Nenhum nome duplicado")
    else:
        print(f"  {FAIL} {len(dups)} nomes duplicados:")
        errors += 1
        for d in dups[:10]:
            print(f"    • {d['name']} ({d['cnt']}x)")

    # ── 10. Distribuição de pesos (top 12) ────────────────────────────────────
    section("10. Distribuição de atletas por categoria de peso")
    c.execute("""
        SELECT weightClass, COUNT(*) as n FROM fighters
        WHERE weightClass IS NOT NULL
        GROUP BY weightClass ORDER BY n DESC LIMIT 12
    """)
    for row in c.fetchall():
        bar = "█" * min(int(row["n"] / 5), 20)
        print(f"  {row['weightClass']:28s} {bar:<20} {row['n']:>4}")

    # ── RESUMO ────────────────────────────────────────────────────────────────
    section("RESUMO")
    print(f"  Erros críticos : {errors}")
    print(f"  Avisos         : {warnings}")
    print()
    if errors == 0 and warnings == 0:
        print(f"  {PASS} Banco sem problemas detectados!")
    elif errors > 0:
        print(f"  {FAIL} Existem erros críticos — corrija antes de usar em produção.")
    else:
        print(f"  {WARN} Banco funcional com avisos.")

    if not fix and (errors > 0 or warnings > 0):
        print(f"\n  Dica: execute com --fix para correções automáticas seguras")

    c.close()
    db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valida integridade do banco mma_analytics")
    parser.add_argument("--fix", action="store_true", help="Corrige automaticamente problemas seguros")
    parser.add_argument("--org", help="Filtra validação para uma organização específica (ex: UFC, Bellator, LFA)")
    args = parser.parse_args()
    run_validation(fix=args.fix, org_filter=args.org)
