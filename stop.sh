#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# RFT — Para todos os processos iniciados pelo start.sh.
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

if [ ! -d "$PID_DIR" ]; then
  echo "[stop] Nada para parar (sem $PID_DIR)."
  exit 0
fi

stop_app() {
  local pidfile="$1"
  local name
  name="$(basename "$pidfile" .pid)"
  if [ ! -f "$pidfile" ]; then return; fi

  local pid
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    echo "[stop] matando $name (PID $pid)..."
    # Mata o grupo de processos para garantir que filhos (vite/tsx) caiam
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$pidfile"
}

shopt -s nullglob
for pidfile in "$PID_DIR"/*.pid; do
  stop_app "$pidfile"
done

# Cleanup orphans (defensive — nem sempre o pkill -P pega tudo)
pkill -f "vite.*--port ${SITE_PORT:-8009}" 2>/dev/null || true
pkill -f "vite.*--port ${ANALYTICS_FE_PORT:-8011}" 2>/dev/null || true
pkill -f "tsx watch src/index.ts" 2>/dev/null || true

echo "[stop] OK"
