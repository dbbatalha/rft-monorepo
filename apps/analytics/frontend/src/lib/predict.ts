/**
 * Predição XGBoost rodando 100% no browser via ONNX Runtime Web.
 *
 * Substitui a procedure `predictions.predict` do tRPC quando o site roda
 * estaticamente (sem backend Node). O modelo é carregado uma vez (cache
 * automático do navegador) e reaproveitado em chamadas subsequentes.
 *
 * Modelo:   /data/model/model.onnx        (~480 KB, XGBoost AUC 0.823)
 * Features: /data/model/features.json     (53 colunas + medianas para imputação)
 */
import * as ort from "onnxruntime-web";

// O onnxruntime-web precisa carregar arquivos WASM. Por padrão ele busca em
// `/`, o que falha quando o site fica num subpath (ex.: rftbrasil.com/analytics/).
// Apontar pra CDN evita ter que copiar os ~15 MB de WASM no nosso bundle.
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.25.1/dist/";

const MODEL_URL = "/data/model/model.onnx";
const FEATURES_URL = "/data/model/features.json";

type FighterInput = {
  name: string;
  wins?: number | null;
  losses?: number | null;
  draws?: number | null;
  age?: number | null;
  height_cm?: number | null;
  heightCm?: number | null;
  weight_kg?: number | null;
  weightKg?: number | null;
  reach_cm?: number | null;
  reachCm?: number | null;
  stance?: string | null;
  SLpM_total?: number | null;
  SLpM?: number | null;
  SApM_total?: number | null;
  SApM?: number | null;
  sig_str_acc_total?: number | null;
  td_acc_total?: number | null;
  str_def_total?: number | null;
  td_def_total?: number | null;
  sub_avg?: number | null;
  td_avg?: number | null;
  finishRate?: number | null;
  submissionWinRate?: number | null;
};

export type PredictionResult = {
  fighter1WinProbability: number;
  fighter2WinProbability: number;
  predictedWinner: string;
  confidence: number;
  fighter1DecimalOdds: number;
  fighter2DecimalOdds: number;
  fighter1AmericanOdds: number;
  fighter2AmericanOdds: number;
  keyFactors: string[];
  modelBreakdown: { model: string; f1Prob: number; f2Prob: number; weight: number }[];
  probKoTko: number;
  probSubmission: number;
  probDecision: number;
  fighter1KoProb: number;
  fighter1SubProb: number;
  fighter1DecProb: number;
  fighter2KoProb: number;
  fighter2SubProb: number;
  fighter2DecProb: number;
};

type FeatureCfg = { columns: string[]; medians: Record<string, number> };

let _session: ort.InferenceSession | null = null;
let _features: FeatureCfg | null = null;
let _loading: Promise<void> | null = null;

async function load(): Promise<void> {
  if (_session && _features) return;
  if (!_loading) {
    _loading = (async () => {
      const [session, featRes] = await Promise.all([
        ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
        }),
        fetch(FEATURES_URL).then((r) => r.json() as Promise<FeatureCfg>),
      ]);
      _session = session;
      _features = featRes;
    })();
  }
  await _loading;
}

const PER_FIGHTER = [
  "wins_total", "losses_total", "age", "height", "weight", "reach",
  "SLpM_total", "SApM_total", "sig_str_acc_total", "td_acc_total",
  "str_def_total", "td_def_total", "sub_avg", "td_avg",
];

const STANCES = ["Orthodox", "Southpaw", "Switch", "Open Stance"];

const slug = (s: string) => s.replace(/ /g, "_").toLowerCase();

const pick = (...vals: any[]): number | null => {
  for (const v of vals) if (v != null && !Number.isNaN(v)) return Number(v);
  return null;
};

function toFighterFeatures(f: FighterInput) {
  return {
    wins_total:        pick(f.wins),
    losses_total:      pick(f.losses),
    age:               pick(f.age),
    height:            pick(f.height_cm, f.heightCm),
    weight:            pick(f.weight_kg, f.weightKg),
    reach:             pick(f.reach_cm, f.reachCm),
    SLpM_total:        pick(f.SLpM_total, f.SLpM),
    SApM_total:        pick(f.SApM_total, f.SApM),
    sig_str_acc_total: pick(f.sig_str_acc_total),
    td_acc_total:      pick(f.td_acc_total),
    str_def_total:     pick(f.str_def_total),
    td_def_total:      pick(f.td_def_total),
    sub_avg:           pick(f.sub_avg),
    td_avg:            pick(f.td_avg),
    stance:            f.stance ?? "Orthodox",
  };
}

function buildRow(
  f1: FighterInput,
  f2: FighterInput,
  ctx: { is_title_bout?: number; total_rounds?: number; gender_male?: number },
  cfg: FeatureCfg,
): { values: Float32Array; named: Record<string, number> } {
  const r = toFighterFeatures(f1);
  const b = toFighterFeatures(f2);

  const feat: Record<string, number | null> = {};
  for (const k of PER_FIGHTER) {
    feat[`r_${k}`] = (r as any)[k];
    feat[`b_${k}`] = (b as any)[k];
  }
  for (const k of PER_FIGHTER) {
    const a = (r as any)[k];
    const c = (b as any)[k];
    feat[`${k}_diff`] = a != null && c != null ? Number(a) - Number(c) : null;
  }
  for (const stance of STANCES) {
    feat[`r_stance_${slug(stance)}`] = String(r.stance) === stance ? 1 : 0;
    feat[`b_stance_${slug(stance)}`] = String(b.stance) === stance ? 1 : 0;
  }
  feat["is_title_bout"] = Number(ctx.is_title_bout ?? 0);
  feat["total_rounds"]  = Number(ctx.total_rounds ?? 3);
  feat["gender_male"]   = Number(ctx.gender_male ?? 1);

  const values = new Float32Array(cfg.columns.length);
  const named: Record<string, number> = {};
  for (let i = 0; i < cfg.columns.length; i++) {
    const col = cfg.columns[i];
    let v = feat[col];
    if (v == null || Number.isNaN(v)) v = cfg.medians[col] ?? 0;
    values[i] = Number(v);
    named[col] = Number(v);
  }
  return { values, named };
}

const probaToDecimalOdds = (p: number) => Math.round((1 / Math.max(0.01, Math.min(0.99, p))) * 100) / 100;
const probaToAmericanOdds = (p: number) => {
  const x = Math.max(0.01, Math.min(0.99, p));
  return x >= 0.5 ? -Math.round((x / (1 - x)) * 100) : Math.round(((1 - x) / x) * 100);
};

function topFactors(named: Record<string, number>, k = 5): string[] {
  // O modelo ONNX não exporta feature_importances diretamente, então
  // priorizamos as features _diff (mais interpretáveis) com maior |valor|.
  const candidates = Object.entries(named)
    .filter(([col]) => col.endsWith("_diff"))
    .map(([col, v]) => ({ col, v, score: Math.abs(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return candidates.map(({ col, v }) => `${col} = ${v >= 0 ? "+" : ""}${v.toFixed(2)}`);
}

export async function predict(
  fighter1: FighterInput,
  fighter2: FighterInput,
  context: { is_title_bout?: number; total_rounds?: number; gender_male?: number } = {},
): Promise<PredictionResult> {
  await load();
  if (!_session || !_features) throw new Error("Model not loaded");

  const { values, named } = buildRow(fighter1, fighter2, context, _features);

  const tensor = new ort.Tensor("float32", values, [1, _features.columns.length]);
  const feeds = { [_session.inputNames[0]]: tensor };
  const out = await _session.run(feeds);

  // O output do XGBoost ONNX é tipicamente `probabilities` (mapa) ou um array com
  // [P(class=0), P(class=1)]. Detectamos qual está disponível.
  let pBlue = 0.5, pRed = 0.5;
  for (const name of _session.outputNames) {
    const t = out[name];
    if (!t) continue;
    const data = t.data as Float32Array | number[];
    if (data && data.length === 2) {
      pBlue = Number(data[0]);
      pRed  = Number(data[1]);
      break;
    }
  }

  // Heurística pra método (KO / Sub / Decisão) — modelo é binário winner-only
  const fr1 = Number(fighter1.finishRate ?? 0.5);
  const fr2 = Number(fighter2.finishRate ?? 0.5);
  const sub1 = Number(fighter1.submissionWinRate ?? 0);
  const sub2 = Number(fighter2.submissionWinRate ?? 0);
  const pFinishOverall = Math.max(0.05, Math.min(0.95, fr1 * pRed + fr2 * pBlue));
  const f1Sub = sub1 * pRed;
  const f1Ko  = Math.max(pFinishOverall * pRed - f1Sub, 0);
  const f2Sub = sub2 * pBlue;
  const f2Ko  = Math.max(pFinishOverall * pBlue - f2Sub, 0);
  const f1Dec = Math.max(pRed - f1Ko - f1Sub, 0);
  const f2Dec = Math.max(pBlue - f2Ko - f2Sub, 0);

  const winner = pRed >= pBlue ? fighter1.name : fighter2.name;
  const confidence = Math.max(pRed, pBlue);

  return {
    fighter1WinProbability: pRed,
    fighter2WinProbability: pBlue,
    predictedWinner: winner,
    confidence,
    fighter1DecimalOdds:  probaToDecimalOdds(pRed),
    fighter2DecimalOdds:  probaToDecimalOdds(pBlue),
    fighter1AmericanOdds: probaToAmericanOdds(pRed),
    fighter2AmericanOdds: probaToAmericanOdds(pBlue),
    keyFactors: topFactors(named, 5),
    modelBreakdown: [
      { model: "XGBoost (ONNX, browser)", f1Prob: pRed, f2Prob: pBlue, weight: 1.0 },
    ],
    probKoTko:      f1Ko + f2Ko,
    probSubmission: f1Sub + f2Sub,
    probDecision:   f1Dec + f2Dec,
    fighter1KoProb:  f1Ko,
    fighter1SubProb: f1Sub,
    fighter1DecProb: f1Dec,
    fighter2KoProb:  f2Ko,
    fighter2SubProb: f2Sub,
    fighter2DecProb: f2Dec,
  };
}

/**
 * Hook compatível com `usePredictMutation()`.
 *
 * Uso: trocar `usePredictMutation()` por `usePredictMutation()`.
 */
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

type PredictInput = {
  fighter1Id?: number;
  fighter2Id?: number;
  fighter1Name?: string;
  fighter2Name?: string;
  fighter1Data?: FighterInput;
  fighter2Data?: FighterInput;
  context?: { is_title_bout?: number; total_rounds?: number; gender_male?: number };
};

export function usePredictMutation(
  options?: Omit<UseMutationOptions<PredictionResult, Error, PredictInput>, "mutationFn">,
) {
  return useMutation<PredictionResult, Error, PredictInput>({
    ...options,
    mutationFn: async (input: PredictInput) => {
      // Resolve dados do atleta a partir do JSON estático se só vier o id
      const resolveFighter = async (id?: number, name?: string, override?: FighterInput): Promise<FighterInput> => {
        if (override) return override;
        if (id) {
          try {
            const r = await fetch(`/data/fighters/${id}.json`);
            if (r.ok) {
              const f = await r.json();
              return { ...f, name: f.name ?? name ?? "Fighter" };
            }
          } catch {}
        }
        return { name: name ?? "Fighter" };
      };

      const f1 = await resolveFighter(input.fighter1Id, input.fighter1Name, input.fighter1Data);
      const f2 = await resolveFighter(input.fighter2Id, input.fighter2Name, input.fighter2Data);
      return predict(f1, f2, input.context ?? {});
    },
  });
}
