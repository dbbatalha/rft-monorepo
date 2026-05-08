# Camada de dados — RAW → ETL → ENRICHED → SITE

Padrão arquitetural do `analytics/backend`. **O site nunca chama scraper live.**

```
SCRAPE (Python, cron)         →  *_raw           (append-only, history via scrapedAt)
ETL    (Python)               →  enriched        (current state, createdAt + updatedAt)
SITE   (tRPC, Express)        lê só enriched
```

## Tabelas

### Raw (append-only, history preservado)

| Tabela                  | Origem                                  | Conteúdo |
|-------------------------|------------------------------------------|----------|
| `fighters_raw`          | UFC Stats / Sherdog / UFC.com.br         | Perfil bruto a cada scrape |
| `fights_raw`            | UFC Stats / Sherdog                      | Linhas brutas de luta |
| `fight_stats_raw`       | UFC Stats / Kaggle / Sherdog             | Sig strikes, head/body/leg, takedowns, control time, etc. |
| `kaggle_imports`        | CSVs do Kaggle                           | Payload JSON completo + colunas indexáveis (fighter, opponent, date) |
| `official_rankings_raw` | UFC.com.br, ONE, PFL, LFA                | Snapshot completo do ranking a cada scrape |
| `upcoming_events_raw`   | UFC Stats, Tapology                      | Eventos futuros conforme aparecem na fonte |
| `upcoming_bouts_raw`    | UFC Stats, Tapology                      | Bouts dos eventos futuros |

Cada raw tem `scrapedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP` (= createdAt). **Nunca atualizar nem apagar** — re-scrapes adicionam linhas novas. Auditoria e re-runs históricos usam `scrapedAt` como ordem.

### Enriched (estado atual, lido pelo site)

| Tabela              | Construída a partir de                              | Timestamps |
|---------------------|------------------------------------------------------|------------|
| `fighters`          | `fighters_raw` (mais recente por externalId)         | createdAt + updatedAt |
| `fights`            | `fights_raw` (dedupada por fighter+opponent+date)    | createdAt + updatedAt |
| `fight_stats`       | `fight_stats_raw` (1:1 com fights via fightId)       | createdAt + updatedAt |
| `official_rankings` | `official_rankings_raw` (snapshot mais recente)      | createdAt + updatedAt |
| `upcoming_events`   | `upcoming_events_raw` (deduplicado por url)          | createdAt + updatedAt |
| `upcoming_bouts`    | `upcoming_bouts_raw` (FK → upcoming_events.id)       | createdAt + updatedAt |

ETL faz upsert: se o registro já existe → `UPDATE` (toca `updatedAt`); senão → `INSERT` (define `createdAt`).

## Fluxo

```
┌────────────────────┐         ┌──────────────────┐
│ scrape_*.py        │         │ etl_*.py         │
│ - hits source HTML │ ───────▶│ - SELECT *_raw   │
│ - INSERT *_raw     │         │ - upsert enriched│
│ - sem update       │         └────────┬─────────┘
└────────────────────┘                  │
                                        ▼
                              ┌────────────────────┐
                              │ tRPC procedures    │
                              │ SELECT enriched    │
                              └────────────────────┘
```

## Localização no monorepo

```
apps/analytics/backend/
├── drizzle/
│   ├── schema.ts                     ← define raw + enriched
│   └── migrations/
│       ├── 0002_upcoming_events.sql  (versão antiga, superada)
│       └── 0003_raw_layer.sql        (raw + Kaggle + timestamps)
├── src/
│   └── scouting/db.ts                ← helpers de leitura (enriched only)
└── python/
    ├── modulo_1_kaggle/import_kaggle.py
    ├── modulo_2_scraper/scrape_*.py
    ├── modulo_2b_etl/etl_*.py
    └── etl_weekly/run_weekly.sh
```

## Cron (run_weekly.sh)

```
1. Scraping
   - scrape_ufc_fighters.py        → fighters_raw + fights_raw
   - scrape_sherdog_nationality.py → fighters_raw (atualiza nationality)
   - scrape_official_rankings.py   → official_rankings_raw
   - scrape_upcoming_ufcstats.py   → upcoming_events_raw + upcoming_bouts_raw
   - scrape_upcoming_tapology.py   → upcoming_events_raw + upcoming_bouts_raw

2. ETL
   - etl_fighters.py    raw → fighters + fights + fight_stats
   - etl_rankings.py    raw → official_rankings
   - etl_upcoming.py    raw → upcoming_events + upcoming_bouts

3. Treino (modulo_3_ml)
   - train_predictor.py → model_predictor.pkl + .onnx
```

Status: **schema completo, migrations escritas; scripts Python serão escritos na Fase 2.**
