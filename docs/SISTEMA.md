# RFT — Documentação do Sistema

> **Última atualização:** 2026-05-05
> **Stack:** React 19 + Vite + Express + tRPC + MySQL + XGBoost (Python) + ONNX
> **Estrutura:** monorepo pnpm com apps independentes (`site`, `analytics`) e pacote compartilhado (`@rft/shared`).

Este documento explica como funciona o site da Renovação Fight Team e a plataforma de scouting **MMA Analytics by RFT**.

## Estrutura atual (monorepo)

```
projeto_site_rft/
├── apps/
│   ├── site/frontend/                Vite + React (institucional, base "/")
│   └── analytics/
│       ├── frontend/                 Vite + React (base "/analytics/")
│       └── backend/                  Express + tRPC + Drizzle + Python ETL
├── packages/
│   └── shared/                       @rft/shared — utilidades, ui/*, RftIcon, FighterAvatarDiamond
├── docs/                             SISTEMA.md, ARCHITECTURE.md, RAW_LAYER.md
├── pnpm-workspace.yaml
├── package.json
├── start.sh / stop.sh                dev: sobe os 3 processos
└── (rft_academy/ — legado, será removido)
```

| App                | Pacote pnpm                | Porta dev | Build out                                |
|--------------------|----------------------------|-----------|------------------------------------------|
| Site institucional | `@rft/site-frontend`       | 8009      | `apps/site/frontend/dist/`               |
| Analytics FE       | `@rft/analytics-frontend`  | 8011      | `apps/analytics/frontend/dist/`          |
| Analytics BE       | `@rft/analytics-backend`   | 8010      | `apps/analytics/backend/dist/index.js`   |

Em produção, nginx serve `/` → `apps/site/frontend/dist/` e `/analytics/` → `apps/analytics/frontend/dist/`, com `proxy_pass` de `/analytics/api/*` para o backend Express. Detalhes em [`ARCHITECTURE.md`](ARCHITECTURE.md). Pipeline de dados (raw → ETL → enriched) em [`RAW_LAYER.md`](RAW_LAYER.md).

---

## 1. Visão geral

O projeto é uma única aplicação que serve **dois produtos**:

| Produto | URL pública | Audiência |
|---|---|---|
| **Site da Academia (RFT)** | `/` (e seções com âncoras: `/#planos`, `/#modalidades`, etc.) | Alunos, candidatos a aluno, visitantes do RJ |
| **MMA Analytics by RFT** | `/analytics/*` | Scouts, treinadores, fãs interessados em estatísticas de MMA |

Ambos compartilham:
- Mesmo `index.html` (favicon RFT, fonts Bebas Neue/Oswald/Inter)
- Mesma camada de API tRPC (`/api/trpc/*`)
- Mesmo banco MySQL `mma_analytics`
- Sistema de roteamento React com Wouter

```
┌─────────────────────────────────────────────────────┐
│                Browser (rft.com.br)                 │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
   /  /#planos              /analytics/*
   /#modalidades            /analytics/fighters
   /#galeria                /analytics/advanced
   /#contato                /analytics/predictor
                            /analytics/rankings
                            /analytics/upcoming
                            /analytics/scouting
         │                       │
         └───────────┬───────────┘
                     │
       ┌─────────────┴─────────────┐
       │  Vite (dev) / Express     │   ← porta 8009
       │  + tRPC handlers          │
       └─────────────┬─────────────┘
                     │
       ┌─────────────┴─────────────┐
       │  MySQL  (mma_analytics)   │   ← container Docker porta 3308
       │  • fighters · fights      │
       │  • fightStats · scoutings │
       │  • predictions · rankings │
       │  • leads · users          │
       └───────────────────────────┘
```

---

## 2. Estrutura de pastas

```
projeto_site_rft/rft_academy/
├── client/
│   ├── index.html                  # entry HTML (favicon RFT)
│   ├── public/imagens/             # assets servidos estáticos
│   └── src/
│       ├── App.tsx                 # router principal + título dinâmico
│       ├── pages/
│       │   ├── Home.tsx            # site da academia
│       │   └── scouting/           # MMA Analytics
│       │       ├── Home.tsx
│       │       ├── FightersList.tsx
│       │       ├── FighterProfile.tsx
│       │       ├── Analytics.tsx   # /analytics/advanced
│       │       ├── Predictor.tsx
│       │       ├── Rankings.tsx
│       │       ├── UpcomingEvents.tsx
│       │       └── ScoutingReport.tsx
│       ├── components/
│       │   ├── Navbar / HeroSection / ModalidadesSection / ProfessoresSection
│       │   ├── HorariosSection / PlanosSection / GaleriaSection
│       │   ├── LocalizacaoSection / ContatoSection / Footer
│       │   ├── ScoutingSection.tsx          # CTA serviços de scouting
│       │   └── scouting/
│       │       ├── DashboardLayout.tsx       # sidebar+header de /analytics
│       │       ├── FighterAvatarDiamond.tsx  # losango com iniciais/ícone
│       │       └── RftIcon.tsx               # placa-diamante variante RFT
│       └── lib/
│           ├── rftAthletes.ts        # lista de atletas RFT + redes sociais
│           ├── weightClasses.ts      # tradução PT-BR + limites de peso
│           ├── flagEmoji.ts          # mapeamento país → bandeira
│           └── trpc.ts               # cliente tRPC
├── server/
│   ├── _core/                      # tRPC router base + auth + storage
│   ├── routers.ts                  # router principal
│   ├── db.ts                       # acesso MySQL (drizzle)
│   ├── scouting/
│   │   ├── scoutingRouter.ts       # endpoints fighters/fights/predictions
│   │   └── db.ts
│   └── _core/index.ts              # express server entry
├── drizzle/
│   └── schema.ts                   # schema unificado (rft + scouting)
├── data/
│   └── ufc_complete_dataset_94_24/ # dataset Kaggle para treino
└── SISTEMA.md                      # este arquivo
```

E o módulo separado de scraping/ML:

```
projeto_scouting/projeto_scouting_manus/mma_project/
├── modulo_2_scraper/
│   ├── mma_scraper_v2.py            # scrapers por plataforma (UFC, Sherdog…)
│   ├── etl_fighter_fights.py        # scrape histórico de lutas para todos
│   ├── scrape_top10_ufc.py          # Top 15 UFC (criação/atualização)
│   ├── scrape_official_rankings.py  # rankings oficiais
│   ├── scrape_upcoming_events.py
│   ├── scrape_weekly_events.py      # eventos da última semana
│   ├── recompute_fighter_stats.py   # recalcula winRate/finishRate
│   ├── validate_db.py               # 10 checks de integridade
│   └── etl_weekly/run_weekly.sh     # orquestrador semanal
└── modulo_3_ml/
    ├── train_predictor.py           # treina XGBoost
    ├── predict.py                   # CLI de inferência (Python)
    ├── convert_to_onnx.py           # exporta .pkl → .onnx
    ├── model_predictor.pkl          # modelo serializado (joblib)
    ├── model_predictor.onnx         # mesmo modelo em ONNX
    ├── feature_columns.json         # ordem de features + medianas
    └── training_report.json         # métricas (AUC, accuracy)
```

---

## 3. Site da Academia (`/`)

Sequência de seções no scroll:

| # | Seção (componente) | O que mostra |
|---|---|---|
| 1 | **HeroSection** | Logo + slogan, foto da equipe ao fundo, 3 stats (Campeão LFA / Atletas UFC / 6+ Modalidades). Stats em formato losango. |
| 2 | **ModalidadesSection** | 6 cards (MMA, Luta Livre, Muay Thai, Boxe, Jiu-Jitsu, JJ Kids) cada um com flyer, professores, horários, valor. |
| 3 | **ProfessoresSection** | Banner "Atletas do UFC na RFT" (losango amarelo + UFC). Card destaque do Head Coach Márcio Cromado. Grid de **Atletas em Competição** por organização (UFC, LFA, Centurion, Jungle Fight, Invicta, MAC, FFC) — cada nome clica para `/analytics/fighter/<id>` (ou busca). Mostra Instagram/Twitter abaixo de cada nome. CTA **"Siga nossos atletas nas redes"**. |
| 4 | **HorariosSection** | Grade semanal com filtro por modalidade. Cores alternadas amarelo/vermelho. Inclui turma especial 12h (R$200) Ter/Qui. |
| 5 | **PlanosSection** | Tabela de preços por modalidade + 2 cards destaques (Acesso Total RFT R$600, Turma Especial 12h R$200) + Pacotes Fechados (Grappling, Strike, Grappling+Strike) + 6 Pacotes Combinados, todos com CTA WhatsApp pré-preenchido. |
| 6 | **GaleriaSection** | 7 fotos das turmas (lightbox ao clicar). |
| 7 | **ScoutingSection** | CTA para `/analytics` — apresenta os 4 serviços de scouting (losangos amarelos com borda preta). |
| 8 | **LocalizacaoSection** | Endereço, telefone, funcionamento, Instagrams (`@rftbrasil`, `@rft_botafogo`) + iframe do Google Maps. |
| 9 | **ContatoSection** | Form de lead → tabela `leads` no MySQL via tRPC (`leads.submit`). |
| 10 | **Footer** | Logo, links, redes, copyright. |

### Identidade visual
- Cores principais: amarelo `#FFD700` + vermelho `#FF3333` + preto `#000`
- Fontes: **Bebas Neue** (display, títulos), **Oswald** (heading uppercase tracking widest), **Inter** (body)
- Padrão dos losangos: quadrado rotacionado 45° com borda preta + fundo amarelo (variant `"rft"`)
- Logo RFT (placa amarela com borda preta) em `client/public/imagens/rft-losango.png` — usada no Navbar, Footer, sidebar do scouting, header do MMA Analytics e como favicon

### Atletas RFT
A lista de quem é "atleta RFT" é centralizada em [`client/src/lib/rftAthletes.ts`](client/src/lib/rftAthletes.ts):
- `RFT_ATHLETES`: nomes para reconhecer em listagens
- `RFT_FIGHTER_IDS`: mapeamento direto nome → ID no MySQL (clique vai pro perfil)
- `RFT_SOCIALS`: Instagram/Twitter de cada um (renderizado abaixo do nome)
- `isRftAthlete(name)`: helper para mostrar logo RFT ao lado do nome em /analytics

---

## 4. MMA Analytics (`/analytics/*`)

Plataforma de scouting com 7 páginas. Acesso via:
- Botão "Acessar MMA Analytics" no `/#scouting`
- Link direto `/analytics`

Todas as páginas são wrapped em `<DashboardLayout>` (sidebar com navegação + header com logo RFT).

### 4.1 `/analytics` — Home
- KPI strip (4 losangos com ícones): Atletas, Organizações, Lutas registradas, Acurácia ML
- Banner "Vem treinar conosco" → `/`
- Feature Grid: cards de cada módulo (Atletas, Histórico, Preditor, Scouting Report, Analytics)
- Lista "Atletas adicionados recentemente" — top 20 mais recentes do `fighters.recent`

### 4.2 `/analytics/fighters`
- Header com logo RFT + nota explicativa
- Filtros: Organização · Status (Campeão / Top 10) · Categoria (em PT-BR com tooltip "Categoria até X kg") · Gênero
- **Alphabet jump bar**: clicando em A, B, C... vai direto para o grupo (também expande infinite scroll)
- Cards de atleta: avatar losango com iniciais, nome, badge se RFT, bandeira, badge categoria PT-BR, record W-L, organização
- Click → `/analytics/fighter/:id`

### 4.3 `/analytics/fighter/:id`
3 abas: **Histórico · Atleta · Scouting**
- **Atleta**: KPIs (Record, % Vitória, % Finalização, Sequência) + Style Analysis + tabela de Lutas por Organização (deriva a promoção do nome do evento, não do campo `promotion` que pode estar errado).
- **Histórico**: lista todas as lutas em `fights` table com método/round/tempo/promoção. Click expande estatísticas detalhadas (`fightStats`).
- **Scouting**: navega para `/analytics/scouting?fighterId=X`.

URL params suportados: `?tab=historico` ou `?tab=atleta`.

### 4.4 `/analytics/advanced`
Mesma listagem alfabética da `/fighters` (com agrupamento por letra) mas ao clicar em um atleta ele "trava" como contexto e abre painel de analytics avançado (gráficos de carreira, ataques por região do corpo, comparativo com outro atleta da mesma divisão).

### 4.5 `/analytics/predictor`
- Atleta 1 (vermelho) vs Atleta 2 (amarelo) — autocomplete com filtro de mesma divisão (±1)
- Botão "Prever Resultado" → chama `predictions.predict` no servidor → retorna probabilidade, odds e key factors
- **Hoje:** chama `predict.py` via Python subprocess. **Em produção:** vai usar `model_predictor.onnx` direto no Node (sem Python no servidor).

### 4.6 `/analytics/rankings`
- Filtro por organização (com mapeamento JF→Jungle Fight, CFU→Centurion)
- Para cada divisão de peso (PT-BR + tooltip de limite): mostra Campeão, Interino, e Top 1-15 (com losangos para coroa de campeão)

### 4.7 `/analytics/upcoming`
- Lista os próximos eventos UFC com data destacada (badge amarela ao lado do nome)
- Cada luta tem botão "Prever" que chama o predictor para aquela matchup

### 4.8 `/analytics/scouting?fighterId=X`
3 abas iguais ao FighterProfile (Histórico/Atleta/Scouting). A aba "Scouting" gera relatórios (tipo Full / Managerial / Coach) — atualmente lê de `scoutingReports` pré-gerados.

---

## 5. Banco de dados

MySQL 8 em container Docker `mma_dashboard_mysql`, porta **3308**, schema `mma_analytics`.

| Tabela | Conteúdo | Origem |
|---|---|---|
| `fighters` | ~4.500 atletas com perfil (nome, idade, altura, peso, alcance, stance, totals como winRate, finishRate, etc.) | Scraping UFCStats + Sherdog + Tapology |
| `fights` | ~6.000 lutas com método, round, tempo, promoção, evento, oponente | Mesmo |
| `fightStats` | Stats per-luta (golpes significativos, takedowns, control time, KDs por região) | UFCStats |
| `officialRankings` | Rankings oficiais UFC + outras orgs (rank 0-15, campeão/interino) | ufc.com/rankings |
| `upcomingEvents` + `upcomingBouts` | Próximos eventos UFC | ufcstats.com |
| `scoutingReports` | Relatórios pré-gerados | Geração local (LLM ou template) |
| `fightPredictions` | Predições já feitas (cache) | API tRPC `predictions.predict` |
| `matchupAnalyses` | Análises gerenciais entre 2 atletas | API tRPC `predictions.matchup` |
| `organizations` | UFC, LFA, ONE, PFL, Bellator, etc. | Static seeds + scraping |
| `leads` | Leads do form de contato do site da academia | API tRPC `leads.submit` |
| `users` | Auth (atualmente desativado em prod) | OAuth (futuro) |

**Filtros do site:** o `/analytics/fighters` mostra apenas atletas com `wins>0 OR losses>0 OR draws>0` E que tenham pelo menos uma luta em `fights`. Isso filtra ~4.000 perfis incompletos do banco original.

**Promoção real por luta:** o campo `promotion` em `fights` muitas vezes está fixo na org primária do atleta. O frontend deriva a promoção real do nome do evento via regex (ex: `"Shooto Brazil 113 - Lopes"` → `Shooto Brazil`).

---

## 6. Modelo de Predição (XGBoost)

### 6.1 Treino — `train_predictor.py`
- **Dataset:** `data/ufc_complete_dataset_94_24/Large set/large_dataset.csv` — 7.439 lutas UFC com features pré-computadas (career totals + diffs entre atletas)
- **Target:** `winner ∈ {Red, Blue}` → binário 1/0
- **Features (53 colunas):**
  - Per-fighter (red/blue): `wins_total, losses_total, age, height, weight, reach, SLpM_total, SApM_total, sig_str_acc_total, td_acc_total, str_def_total, td_def_total, sub_avg, td_avg`
  - Diff: `wins_total_diff, losses_total_diff, age_diff, height_diff, weight_diff, reach_diff, ...`
  - Stance one-hot (Orthodox/Southpaw/Switch/Open Stance) × 2
  - Contexto: `is_title_bout, total_rounds, gender_male`
- **Modelo:** XGBoost 400 árvores, depth 5, lr 0.05, hist tree method
- **Imputação:** mediana de cada feature do training set (salva em `feature_columns.json`)

### 6.2 Métricas (test set 1.488 lutas)
| Métrica | Valor |
|---|---|
| Cross-val AUC (5-fold) | 0.8102 ± 0.013 |
| Test AUC | **0.823** |
| Test accuracy | **76%** |
| Test log loss | 0.480 |
| Test brier score | 0.161 |

Top 5 features por importance: `b_reach, b_age, losses_total_diff, wins_total_diff, b_SLpM_total`.

### 6.3 Inferência

**Modo atual (subprocess Python):**
1. Frontend chama `predictions.predict` (tRPC mutation)
2. Backend Express busca dados dos 2 atletas em MySQL
3. Mapeia campos do banco → features do modelo
4. Spawn `python3 predict.py` via stdin/stdout JSON
5. Retorna probabilidade + odds + key factors + breakdown
6. Salva em `fightPredictions` (cache)

**Modo produção (ONNX — em deploy):**
- `model_predictor.onnx` (480 KB) carregado via `onnxruntime-node`
- Mesma matemática, mas zero dependência de Python no servidor de produção
- Latência: ~10ms (vs ~150ms do subprocess)

### 6.4 Re-treino
Disparado pelo ETL semanal quando ≥50 lutas novas foram adicionadas no banco.

---

## 7. ETL Semanal — `etl_weekly/run_weekly.sh`

Pipeline idempotente que mantém o banco atualizado. **Roda toda terça às 4h da madrugada** (cron):

```cron
0 4 * * 2  /caminho/para/run_weekly.sh
```

### Passos
1. **Eventos UFC concluídos** — pega lutas da última semana
2. **Rankings oficiais** — atualiza `official_rankings` (truncate + reinsert por org)
3. **Próximos eventos** — atualiza `upcoming_events` + `upcoming_bouts`
4. **Top 15 UFC** — `scrape_top10_ufc.py` busca atletas no ranking, identifica os que faltam, scraping do perfil + histórico
5. **Recompute stats** — recalcula `winRate`, `finishRate`, `koTkoWins`, `submissionWins`, etc. para atletas afetados
6. **Validation** — `validate_db.py` (10 checks). Se falhar, pipeline aborta
7. **Re-treino opcional do XGBoost** — apenas se ≥50 lutas novas. Treina e re-exporta `.pkl` + `.onnx`

### Garantias
- **Idempotência:** rodar 2x não duplica (lutas dedup por fighterId+opponent+fightDate; atletas upsert por externalId; rankings truncate+insert)
- **Rastreabilidade:** logs em `~/etl_logs/weekly_<YYYYMMDD_HHMMSS>/` por step
- **Failure-safe:** `set -e` para todo erro; passo seguinte só roda se anterior teve exit 0

### Atletas novos
Quando aparece um atleta no ranking ou nas lutas que ainda não está no banco:
1. Step 4 (`scrape_top10_ufc.py`) detecta via `LEFT JOIN fighters` na query
2. Busca URL no UFCStats (índice alfabético por sobrenome)
3. Cria perfil + scrapeia todas as lutas históricas
4. Insere `fights` + `fightStats`

---

## 8. Validação — `validate_db.py`

10 checks executados em ordem. Saída com cores ✔/⚠/✘ + summary com erros críticos e warnings.

1. Cobertura por organização (count atletas + lutas)
2. Atletas de referência presentes (campeões UFC/PFL/LFA/Jungle por divisão)
3. Atletas sem `weightClass`
4. Categorias de peso inválidas (catchweights, P4P, Atomweight)
5. Atletas sem nenhuma luta registrada
6. Cartel inconsistente (`wins+losses+draws ≠ totalFightsPro`)
7. `winRate` desalinhado com `wins/totalFightsPro`
8. Lutas sem `result`
9. Nomes de atletas duplicados
10. Distribuição de atletas por categoria de peso

Falha (exit 1) se houver erros críticos. Warnings não bloqueiam.

---

## 9. Deploy

### Estratégia recomendada
- **Local (seu Mac):** Python ML, scrapers, scheduler ETL — deixa pesado em casa.
- **Servidor remoto (Hetzner CX22 ~€4,5/mês ou Railway):** Express + tRPC read-only + MySQL gerenciado + serve frontend buildado.
- **Sync:** ETL gera dump do MySQL → push pro remoto via SSH `scp + mysql import`.

### Scripts prontos
- [`start.sh`](start.sh) — sobe dev server na porta 8009
- [`stop.sh`](stop.sh) — mata processos e libera porta

### Variáveis de ambiente
```
PORT=8009
NODE_ENV=production
DATABASE_URL=mysql://USER:PASS@HOST:3306/mma_analytics
JWT_SECRET=<64-char random>
ML_PREDICT_SCRIPT=/caminho/para/predict.py    # opcional, se ainda usar subprocess
PYTHON_BIN=python3                            # opcional
```

### Build de produção
```
pnpm build           # gera dist/index.js + dist/public/
NODE_ENV=production node dist/index.js
```

---

## 10. URLs principais (porta 8009)

```
http://localhost:8009/                           # Site da academia
http://localhost:8009/#planos                    # Seção Planos
http://localhost:8009/analytics                  # MMA Analytics home
http://localhost:8009/analytics/fighters         # Lista de atletas
http://localhost:8009/analytics/fighter/61       # Perfil do atleta id=61
http://localhost:8009/analytics/advanced         # Analytics avançado
http://localhost:8009/analytics/predictor        # Preditor de luta (XGBoost)
http://localhost:8009/analytics/rankings         # Rankings oficiais
http://localhost:8009/analytics/upcoming         # Próximos eventos UFC
http://localhost:8009/analytics/scouting?fighterId=X   # Scouting report
```

---

## 11. Como adicionar novidades

| Quero adicionar… | Onde |
|---|---|
| Novo atleta na seção "RFT em Competição" | `client/src/components/ProfessoresSection.tsx` array `organizacoes` + `client/src/lib/rftAthletes.ts` (`RFT_ATHLETES`, `RFT_SOCIALS`, opcional `RFT_FIGHTER_IDS`) |
| Nova foto na galeria | `client/src/components/GaleriaSection.tsx` array `fotos` |
| Novo flyer de modalidade | `client/src/components/ModalidadesSection.tsx` array `modalidades` |
| Nova categoria/modalidade | `ModalidadesSection.tsx` + `HorariosSection.tsx` + `PlanosSection.tsx` |
| Novo plano/pacote | `PlanosSection.tsx` arrays `tabela`, `destaques`, `pacotesFechados`, `pacotesCombinados` |
| Nova org no scouting | Schema `organizations` no banco + scraper específico no `modulo_2_scraper/` |
| Novo handle social | `client/src/lib/rftAthletes.ts` `RFT_SOCIALS[name]` |
| Tradução de nova categoria de peso | `client/src/lib/weightClasses.ts` `WC_DATA` |
| Novo país com bandeira | `client/src/lib/flagEmoji.ts` `FLAG_MAP` |

---

## 12. Stack técnica resumida

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS v4, Wouter (router), Framer Motion, Recharts, Lucide Icons, Sonner (toasts), Radix UI primitives.
- **Backend:** Express 4, tRPC 11, Drizzle ORM, MySQL2.
- **ML:** XGBoost 2.1, scikit-learn 1.0, ONNX Runtime 1.19, joblib.
- **Scraping:** Python 3.9, requests, BeautifulSoup4, lxml.
- **DevOps:** pnpm, tsx (dev hot-reload), esbuild (build prod).
