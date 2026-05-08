#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# RFT Analytics — Pipeline semanal
#
#   1. SCRAPE  → tabelas *_raw (append-only)
#   2. ETL     → raw → enriched (upsert com createdAt + updatedAt)
#   3. TRAIN   → modelo XGBoost a partir do enriched
#
# Cron sugerido (terça às 04:00):
#   0 4 * * 2  /caminho/para/run_weekly.sh >> /var/log/rft_etl.log 2>&1
# ----------------------------------------------------------------------------
set -euo pipefail

PY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$PY_DIR/etl_weekly/logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d_%H%M%S)"

log() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_DIR/run_$TS.log"; }
run() {
  local label="$1"; shift
  log "▶ $label"
  if "$@" >> "$LOG_DIR/run_$TS.log" 2>&1; then
    log "  ✓ $label OK"
  else
    log "  ✗ $label FAIL — abortando"
    exit 1
  fi
}

cd "$PY_DIR"

PY="${PYTHON_BIN:-python3}"

# ─── 1. SCRAPE ──────────────────────────────────────────────────────────────
log "═══ FASE 1: SCRAPE → *_raw ═══"
run "Top 15 UFC (atletas + lutas)"     $PY modulo_2_scraper/scrape_top10_ufc.py
run "Sherdog nationality"              $PY modulo_2_scraper/enrich_nationality.py --limit 200
run "Rankings oficiais (todas orgs)"   $PY modulo_2_scraper/scrape_official_rankings.py
run "Eventos futuros (multi-org)"      $PY modulo_2_scraper/scrape_upcoming.py

# ─── 2. ETL ─────────────────────────────────────────────────────────────────
log "═══ FASE 2: ETL raw → enriched ═══"
run "ETL fighters/fights"              $PY modulo_2b_etl/etl_fighters.py
run "Recompute fighter stats"          $PY modulo_2b_etl/recompute_fighter_stats.py
run "ETL rankings"                     $PY modulo_2b_etl/etl_rankings.py
run "ETL upcoming"                     $PY modulo_2b_etl/etl_upcoming.py

# ─── 3. TRAIN ───────────────────────────────────────────────────────────────
log "═══ FASE 3: TRAIN modelo ═══"
run "Treino XGBoost"                   $PY modulo_3_ml/train_predictor.py
run "Convert PKL → ONNX"               $PY modulo_3_ml/convert_to_onnx.py

log "═══ Pipeline concluído ═══"
