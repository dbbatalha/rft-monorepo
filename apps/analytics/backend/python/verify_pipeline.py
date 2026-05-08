#!/usr/bin/env python3
"""
Valida o estado do banco após aplicar a migration 0003_raw_layer.sql:

  1. Conecta no MySQL.
  2. Confere que todas as tabelas (raw + enriched) existem.
  3. Conta linhas em cada uma.
  4. Reporta o que falta.

Uso:
    python3 verify_pipeline.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _lib.db import cursor

RAW_TABLES = [
    "fighters_raw",
    "fights_raw",
    "fight_stats_raw",
    "kaggle_imports",
    "official_rankings_raw",
    "upcoming_events_raw",
    "upcoming_bouts_raw",
]
ENRICHED_TABLES = [
    "fighters",
    "fights",
    "fight_stats",
    "official_rankings",
    "upcoming_events",
    "upcoming_bouts",
]


def main():
    try:
        with cursor(commit=False) as (_, c):
            c.execute("SELECT DATABASE()")
            db_name = c.fetchone()[0]
            print(f"Conectado em DB '{db_name}'.\n")

            c.execute("SHOW TABLES")
            existing = {row[0] for row in c.fetchall()}

            print("RAW LAYER (append-only):")
            for t in RAW_TABLES:
                if t in existing:
                    c.execute(f"SELECT COUNT(*) FROM `{t}`")
                    n = c.fetchone()[0]
                    print(f"  ✓ {t:30s} {n:>9,} linhas")
                else:
                    print(f"  ✗ {t:30s}  FALTANDO  (rode migration 0003)")

            print()
            print("ENRICHED (current state):")
            for t in ENRICHED_TABLES:
                if t in existing:
                    c.execute(f"SELECT COUNT(*) FROM `{t}`")
                    n = c.fetchone()[0]

                    extras = ""
                    cols_to_check = ("createdAt", "updatedAt")
                    c.execute(f"""SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s""", (t,))
                    cols = {r[0] for r in c.fetchall()}
                    missing_cols = [col for col in cols_to_check if col not in cols]
                    if missing_cols:
                        extras = f"  ⚠ falta: {missing_cols}"
                    print(f"  ✓ {t:30s} {n:>9,} linhas{extras}")
                else:
                    print(f"  ✗ {t:30s}  FALTANDO")

            print("\nOK." if all(t in existing for t in RAW_TABLES + ENRICHED_TABLES) else
                  "\n⚠ algumas tabelas faltam — aplique a migration 0003_raw_layer.sql.")
    except Exception as e:
        print(f"\n✗ Erro de conexão: {e}\n")
        print("Cheque DB_HOST/PORT/USER/PASSWORD e se o container MySQL está up.")
        sys.exit(1)


if __name__ == "__main__":
    main()
