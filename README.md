# RFT — Renovação Fight Team (Monorepo)

Repositório com duas aplicações:

| App                 | Caminho                          | URL pública                  | Stack                          |
|---------------------|----------------------------------|------------------------------|--------------------------------|
| Site institucional  | `apps/site/frontend`             | `https://rftbrasil.com/`     | Vite + React (estático)        |
| Plataforma scouting | `apps/analytics/frontend` + `apps/analytics/backend` | `https://rftbrasil.com/analytics/` | Vite + React, Express + tRPC + Drizzle + MySQL |

Ambas aplicações compartilham o pacote interno **`@rft/shared`** (utilidades de UI/dados) e o mesmo MySQL (`mma_analytics` na porta 3308).

---

## Estrutura

```
projeto_site_rft/
├── apps/
│   ├── site/
│   │   ├── frontend/              # Vite + React, base "/"
│   │   └── README.md
│   └── analytics/
│       ├── frontend/              # Vite + React, base "/analytics/"
│       └── backend/               # Express + tRPC + Drizzle
│           ├── src/
│           ├── drizzle/           # schema + migrations
│           └── python/            # scrapers + ETL + treino do modelo
├── packages/
│   └── shared/                    # @rft/shared — utilidades reutilizáveis
├── docs/                          # SISTEMA.md, runbooks, arquitetura
├── pnpm-workspace.yaml
├── package.json                   # scripts agregadores
├── start.sh / stop.sh             # dev: sobe site + analytics(fe+be)
└── start.prod.sh                  # produção: build + serve
```

## Pré-requisitos

- Node ≥ 20 (preferencialmente via `corepack enable pnpm`)
- pnpm 9
- Docker (MySQL `mma_dashboard_mysql` na porta 3308)
- Python 3.9+ (para scrapers/ETL/treino — opcional em desenvolvimento do site)

## Comandos rápidos

```bash
# instalar dependências de todos os apps
pnpm install

# subir tudo em dev (site + analytics fe/be)
./start.sh

# parar tudo
./stop.sh

# subir apps individuais
pnpm dev:site            # só institucional
pnpm dev:analytics:fe    # só frontend de analytics
pnpm dev:analytics:be    # só backend de analytics

# build de produção
pnpm build               # tudo
pnpm build:site
pnpm build:analytics

# typecheck monorepo
pnpm typecheck
```

## Documentação

- [docs/SISTEMA.md](docs/SISTEMA.md) — arquitetura completa, pipeline de dados, ML, deployment.
- [docs/RAW_LAYER.md](docs/RAW_LAYER.md) — modelo de dados raw → ETL → enriched (em construção).
- `apps/site/README.md` e `apps/analytics/README.md` — instruções específicas de cada app.
