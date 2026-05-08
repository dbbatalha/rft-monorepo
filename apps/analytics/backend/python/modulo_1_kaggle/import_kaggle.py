#!/usr/bin/env python3
"""
Importa CSV(s) do Kaggle preservando 100% das colunas em `kaggle_imports.payload`
e populando colunas auxiliares (fighter, opponent, event, date) para join futuro.

Uso:
    python3 import_kaggle.py --csv data/ufc_fights.csv --dataset ufc_fights_2024
    python3 import_kaggle.py --csv data/total_fight_data.csv --dataset rajeev_bhatia_v1 --row-format per_fight

Detecção:
    --row-format per_fight    1 linha por luta (fighter1 vs fighter2 + stats agregadas)
    --row-format per_fighter  1 linha por lutador por luta (default — assume per_fight stats)

Ambos casos preservam 100% no payload. As colunas auxiliares facilitam um JOIN
posterior em `etl_fighters` / `etl_fights` se decidirmos importar histórico no enriched.
"""
import argparse
import csv
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from _lib.db import cursor, insert_kaggle_row

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s",
                    datefmt="%H:%M:%S")
log = logging.getLogger("kaggle_import")


def pick(row: dict, *keys: str) -> str | None:
    """Retorna o primeiro valor não-vazio das chaves candidatas (case-insensitive)."""
    lower = {k.lower(): v for k, v in row.items()}
    for k in keys:
        v = lower.get(k.lower())
        if v not in (None, "", "nan", "NaN"):
            return v
    return None


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv",     required=True, help="Path do CSV")
    p.add_argument("--dataset", required=True, help="Identificador do dataset")
    p.add_argument("--row-format", default="per_fight",
                   choices=["per_fight", "per_fighter"])
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        log.error(f"CSV não encontrado: {csv_path}")
        sys.exit(1)

    with csv_path.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)

    log.info(f"CSV: {csv_path.name}  |  rows: {len(all_rows)}  |  format: {args.row_format}")
    if args.limit:
        all_rows = all_rows[:args.limit]
        log.info(f"  limitado a {args.limit}")

    if args.dry_run:
        log.info("DRY RUN — primeiras 3 chaves:")
        for r in all_rows[:3]:
            log.info(f"  {list(r.keys())[:8]}...")
        return

    n = 0
    with cursor(commit=True) as (_, c):
        for r in all_rows:
            fields = {
                "dataset":     args.dataset,
                "rowFormat":   args.row_format,
                "fighterName": pick(r, "fighter", "fighter_name", "name", "R_fighter"),
                "opponent":    pick(r, "opponent", "opp", "B_fighter"),
                "eventName":   pick(r, "event", "event_name", "Event"),
                "eventDate":   pick(r, "date", "fight_date", "Date", "event_date"),
                "weightClass": pick(r, "weight_class", "WeightClass", "weightClass", "division"),
                "payload":     r,
            }
            insert_kaggle_row(c, **fields)
            n += 1
            if n % 1000 == 0:
                log.info(f"  inseridos: {n}")
    log.info(f"OK — {n} linhas importadas em kaggle_imports (dataset={args.dataset}).")


if __name__ == "__main__":
    main()
