# Pipeline de dados (Python) — RFT Analytics

Arquitetura **scrape → raw → ETL → enriched → site**:

```
┌────────────────────┐   ┌────────────────────┐   ┌──────────────────┐   ┌──────┐
│  scrapers Python   │──▶│   *_raw            │──▶│  enriched        │──▶│ site │
│  (modulo_1, _2)    │   │   (append-only,    │   │  (createdAt +    │   │ tRPC │
│  cron semanal      │   │    history)        │   │   updatedAt)     │   │      │
└────────────────────┘   └────────────────────┘   └──────────────────┘   └──────┘
                                  ▲                       ▲
                                  │                       │
                            modulo_1_kaggle        modulo_2b_etl
                            (CSVs Kaggle)          (raw → enriched)
```

**Regra de ouro:** o site (tRPC) **nunca** chama scraper live. Ele só lê tabelas enriched. Scrapers são acionados pelo cron `etl_weekly/run_weekly.sh` ou manualmente.

---

## Estrutura

```
python/
├── _lib/db.py                     conexão MySQL + helpers de insert (raw + upsert enriched)
│
├── modulo_1_kaggle/
│   └── import_kaggle.py           CSVs do Kaggle → kaggle_imports (payload JSON 100%)
│
├── modulo_2_scraper/              SCRAPERS — escrevem APENAS em *_raw
│   ├── mma_scraper_v2.py          base UFCStats/Sherdog
│   ├── scrape_top10_ufc.py        Top 15 UFC: atletas + lutas → fighters_raw + fights_raw
│   ├── scrape_official_rankings.py    UFC.com.br/rankings → official_rankings_raw
│   ├── scrape_upcoming.py         multi-org Tapology/UFC Stats → upcoming_*_raw
│   ├── enrich_nationality.py      Sherdog nationality → atualiza fighters_raw
│   ├── scrape_lfa_champions.py    histórico LFA
│   ├── scrape_jungle_champions.py histórico Jungle Fight
│   ├── scrape_one_champions.py    histórico ONE
│   ├── scrape_pfl_rankings.py     histórico PFL
│   └── ...
│
├── modulo_2b_etl/                 ETL — raw → enriched
│   ├── etl_fighters.py            fighters_raw + fights_raw → fighters + fights (upsert)
│   ├── etl_rankings.py            official_rankings_raw → official_rankings + flags
│   ├── etl_upcoming.py            upcoming_*_raw → upcoming_events + upcoming_bouts
│   └── recompute_fighter_stats.py recalcula winRate, KO rate, streak, etc.
│
├── modulo_3_ml/                   ML — lê APENAS enriched
│   ├── train_predictor.py         XGBoost AUC 0.823
│   ├── predict.py                 CLI: predict.py f1 f2 → JSON
│   ├── convert_to_onnx.py         PKL → ONNX (480 KB, diff=0)
│   ├── model_predictor.pkl
│   ├── model_predictor.onnx
│   ├── feature_columns.json
│   └── training_report.json
│
├── etl_weekly/run_weekly.sh       orquestrador (terça 04:00 via cron)
└── requirements.txt
```

## Pré-requisitos

```bash
# venv recomendada
python3 -m venv .venv && source .venv/bin/activate

# deps
pip install -r requirements.txt

# DB local
docker ps | grep mma_dashboard_mysql       # confirma container
mysql -h 127.0.0.1 -P 3308 -u mma_user -p  # confirma acesso
```

`.env` (raiz do backend) ou variáveis exportadas:
```
DB_HOST=127.0.0.1
DB_PORT=3308
DB_USER=mma_user
DB_PASSWORD=mma_password
DB_NAME=mma_analytics
```

## Comandos

### Pipeline completa (tudo)

```bash
./etl_weekly/run_weekly.sh
```

Logs em `etl_weekly/logs/run_<TIMESTAMP>.log`.

### Etapas isoladas

```bash
# 1. Scrape (escreve em *_raw, append-only)
python3 modulo_2_scraper/scrape_top10_ufc.py
python3 modulo_2_scraper/scrape_official_rankings.py
python3 modulo_2_scraper/scrape_upcoming.py --org ufc one pfl
python3 modulo_2_scraper/enrich_nationality.py --limit 200

# 2. ETL (raw → enriched, idempotente)
python3 modulo_2b_etl/etl_fighters.py
python3 modulo_2b_etl/recompute_fighter_stats.py
python3 modulo_2b_etl/etl_rankings.py
python3 modulo_2b_etl/etl_upcoming.py

# 3. Treino
python3 modulo_3_ml/train_predictor.py
python3 modulo_3_ml/convert_to_onnx.py

# Kaggle (one-off)
python3 modulo_1_kaggle/import_kaggle.py \
  --csv ~/Downloads/total_fight_data.csv \
  --dataset rajeev_bhatia_v1 \
  --row-format per_fight
```

### Cron (produção)

```cron
# Terça 04:00 — pipeline semanal completa
0 4 * * 2 /caminho/para/python/etl_weekly/run_weekly.sh >> /var/log/rft_etl.log 2>&1
```

## Tabelas

Veja `docs/RAW_LAYER.md` (na raiz do monorepo) para o detalhe de cada tabela. Resumo:

| Domínio                | Raw                          | Enriched              |
|------------------------|------------------------------|-----------------------|
| Atletas / lutas / stats| `fighters_raw`, `fights_raw`, `fight_stats_raw` | `fighters`, `fights`, `fight_stats` |
| Kaggle (histórico)     | `kaggle_imports`             | (consumido pela ETL)  |
| Rankings oficiais      | `official_rankings_raw`      | `official_rankings`   |
| Eventos futuros        | `upcoming_events_raw`, `upcoming_bouts_raw` | `upcoming_events`, `upcoming_bouts` |

Migration: `apps/analytics/backend/drizzle/migrations/0003_raw_layer.sql` (já gerada — aplicar com `pnpm --filter @rft/analytics-backend db:push`).
