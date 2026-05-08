# Arquitetura — RFT (Site + Analytics)

## Visão geral

```
                           ┌──────────────────────────────────────────────┐
                           │            rftbrasil.com (nginx)             │
                           └──────────────────┬───────────────────────────┘
                                              │
              ┌───────────────────────────────┼─────────────────────────────────┐
              │                               │                                 │
              ▼                               ▼                                 ▼
       /                               /analytics/                       /analytics/api
       site (Vite build, estático)     analytics-frontend (Vite build)   analytics-backend (Express + tRPC)
                                              │                                 │
                                              └─────────────► tRPC ◄────────────┘
                                                                                │
                                                                                ▼
                                                                  MySQL `mma_analytics` :3308
                                                                  (container Docker mma_dashboard_mysql)
```

## Repositório

```
projeto_site_rft/
├── apps/
│   ├── site/frontend          @rft/site-frontend       (Vite + React)
│   └── analytics/
│       ├── frontend           @rft/analytics-frontend  (Vite + React, base /analytics/)
│       └── backend            @rft/analytics-backend   (Express + tRPC + Drizzle)
├── packages/
│   └── shared                 @rft/shared              (utilidades + UI compartilhada)
├── docs/                      arquitetura, runbooks
└── pnpm-workspace.yaml
```

## Camadas de dados (analytics)

```
┌────────────┐   ┌────────────┐   ┌──────────────┐   ┌──────┐
│  scrapers  │──▶│  *_raw     │──▶│  enriched    │──▶│ site │
│  Python    │   │  append    │   │  upsert      │   │ tRPC │
│  (cron)    │   │  history   │   │  createdAt   │   │      │
└────────────┘   └────────────┘   │  updatedAt   │   └──────┘
                                   └──────────────┘
```

- **Raw**: `fighters_raw`, `fights_raw`, `fight_stats_raw`, `kaggle_imports`, `official_rankings_raw`, `upcoming_events_raw`, `upcoming_bouts_raw`. Append-only. `scrapedAt` (= createdAt da linha).
- **Enriched**: `fighters`, `fights`, `fight_stats`, `official_rankings`, `upcoming_events`, `upcoming_bouts`. Estado atual, dedupada, com `createdAt` + `updatedAt`.
- **Site**: tRPC nunca chama scraper live. Sempre `SELECT` na enriched.

## Deployment (proposta)

- **dev**:
  - `start.sh` sobe os 3 processos (site, analytics-fe, analytics-be).
  - Vite do analytics-fe faz proxy de `/trpc` e `/api` para `analytics-be:8010`.
- **prod**:
  - Build estática de cada frontend (`dist/`).
  - nginx serve `/` → `apps/site/frontend/dist/` e `/analytics/` → `apps/analytics/frontend/dist/`.
  - nginx faz `proxy_pass` de `/analytics/api/*` → `analytics-backend:8010`.
  - `analytics-backend` rodando como serviço (systemd ou container).
  - MySQL via Docker (`mma_dashboard_mysql`).

## Variáveis de ambiente (dev)

| Var                | Default | App               |
|--------------------|---------|-------------------|
| `SITE_PORT`        | 8009    | site/frontend     |
| `ANALYTICS_FE_PORT`| 8011    | analytics/frontend|
| `ANALYTICS_BE_PORT`| 8010    | analytics/backend |
| `DATABASE_URL`     | —       | analytics/backend |
