# Plataforma de Scouting RFT (Analytics)

Plataforma interna para coaches/managers: perfil de atletas, rankings oficiais, próximos eventos, preditor de lutas (XGBoost / ONNX), relatórios de scouting, advanced analytics.

- URL pública: `https://rftbrasil.com/analytics/`
- Backend: Express + tRPC + Drizzle + MySQL (`mma_analytics`, porta 3308)
- ML: modelo XGBoost (AUC 0.823) servido via ONNX Runtime no Node + fallback Python

## Subdiretórios

```
apps/analytics/
├── frontend/   Vite + React (base /analytics/)
└── backend/    Express + tRPC + Drizzle + scrapers/ETL Python
    ├── src/
    ├── drizzle/  schema + migrations
    └── python/
        ├── modulo_1_kaggle/     # import de datasets Kaggle
        ├── modulo_2_scraper/    # scrapers (UFC, Sherdog, Tapology, etc.)
        ├── modulo_2b_etl/       # raw → enriched
        ├── modulo_3_ml/         # treino + predict + ONNX
        └── etl_weekly/run_weekly.sh
```

## Comandos

```bash
# do root do monorepo
pnpm dev:analytics:fe      # http://localhost:8011/analytics/
pnpm dev:analytics:be      # http://localhost:8010/  (Express)

# os dois juntos com hot-reload
./start.sh --analytics-only

# build
pnpm build:analytics

# typecheck
pnpm --filter @rft/analytics-frontend typecheck
pnpm --filter @rft/analytics-backend  typecheck

# DB
pnpm --filter @rft/analytics-backend db:push     # gera + aplica migrations
```

## Pipeline de dados

```
SCRAPE (Python)              →  *_raw           (append-only history)
ETL (Python)                 →  enriched tables (current state, com createdAt + updatedAt)
SITE (tRPC, Express)         lê só enriched
```

Detalhes em [docs/RAW_LAYER.md](../../docs/RAW_LAYER.md) (em construção).

## Imports

- `@/...`             → `apps/analytics/frontend/src/...` (no frontend) ou `apps/analytics/backend/src/...` (no backend)
- `@rft/shared/...`   → `packages/shared/src/...` (compartilhado com site)
- `@rft/backend/...`  → `apps/analytics/backend/src/...` (frontend importa tipos do tRPC daqui)
