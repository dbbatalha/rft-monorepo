#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# RFT — Sobe site institucional + plataforma de scouting (frontend + backend).
#
# Variáveis de ambiente (override opcional):
#   SITE_PORT          (default 8009)  — site institucional (Vite dev)
#   ANALYTICS_FE_PORT  (default 8011)  — analytics frontend (Vite dev)
#   ANALYTICS_BE_PORT  (default 8010)  — analytics backend  (Express + tRPC)
#
# Flags:
#   --site-only        sobe só o site institucional
#   --analytics-only   sobe só os dois processos do analytics (fe + be)
#   --no-install       pula o pnpm install
# ----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

SITE_PORT="${SITE_PORT:-8009}"
ANALYTICS_FE_PORT="${ANALYTICS_FE_PORT:-8011}"
ANALYTICS_BE_PORT="${ANALYTICS_BE_PORT:-8010}"

WANT_SITE=1
WANT_ANALYTICS=1
DO_INSTALL=1
for arg in "$@"; do
  case "$arg" in
    --site-only)      WANT_ANALYTICS=0 ;;
    --analytics-only) WANT_SITE=0 ;;
    --no-install)     DO_INSTALL=0 ;;
    -h|--help)
      sed -n '2,16p' "$0"; exit 0 ;;
  esac
done

cd "$ROOT_DIR"

# pnpm fallback via corepack
if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable pnpm >/dev/null 2>&1 || true
  else
    echo "[start] ERRO: pnpm não encontrado e corepack indisponível."
    exit 1
  fi
fi

if [ "$DO_INSTALL" = "1" ] && [ ! -d node_modules ]; then
  echo "[start] pnpm install (root)..."
  pnpm install
fi

start_app() {
  local name="$1"
  local cmd="$2"
  local port="$3"
  local pidfile="$PID_DIR/$name.pid"
  local logfile="$LOG_DIR/$name.log"

  if [ -f "$pidfile" ] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "[start] $name já rodando (PID $(cat "$pidfile")). Use ./stop.sh primeiro."
    return 0
  fi

  echo "[start] subindo $name na porta $port..."
  nohup bash -c "$cmd" >"$logfile" 2>&1 &
  echo $! > "$pidfile"
  sleep 1

  if kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "[start]   ✓ $name PID $(cat "$pidfile") — log: $logfile"
  else
    echo "[start]   ✗ $name falhou. Veja $logfile"
    rm -f "$pidfile"
  fi
}

if [ "$WANT_SITE" = "1" ]; then
  start_app "site" \
    "SITE_PORT=$SITE_PORT pnpm --filter @rft/site-frontend dev" \
    "$SITE_PORT"
fi

if [ "$WANT_ANALYTICS" = "1" ]; then
  start_app "analytics-be" \
    "ANALYTICS_BE_PORT=$ANALYTICS_BE_PORT pnpm --filter @rft/analytics-backend dev" \
    "$ANALYTICS_BE_PORT"
  start_app "analytics-fe" \
    "ANALYTICS_FE_PORT=$ANALYTICS_FE_PORT ANALYTICS_BE_PORT=$ANALYTICS_BE_PORT pnpm --filter @rft/analytics-frontend dev" \
    "$ANALYTICS_FE_PORT"
fi

echo ""
echo "[start] Pronto."
[ "$WANT_SITE" = "1" ]      && echo "        Site:           http://localhost:$SITE_PORT/"
[ "$WANT_ANALYTICS" = "1" ] && echo "        Analytics (FE): http://localhost:$ANALYTICS_FE_PORT/analytics/"
[ "$WANT_ANALYTICS" = "1" ] && echo "        Analytics (BE): http://localhost:$ANALYTICS_BE_PORT/"
echo ""
echo "        Stop tudo:  ./stop.sh"
echo "        Logs em:    $LOG_DIR/"
