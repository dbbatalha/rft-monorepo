#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Inference CLI — XGBoost predictor.

Recebe via stdin um JSON com os 2 atletas. Retorna no stdout um JSON com a
probabilidade de vitória, odds decimais/americanas, top features e breakdown.

Input esperado (stdin):
{
  "fighter1": {
     "name": "Petr Yan",
     "wins": 17, "losses": 6, "draws": 0,
     "age": 32, "height_cm": 170, "weight_kg": 61.2, "reach_cm": 170,
     "stance": "Orthodox",
     "SLpM_total": 4.6, "SApM_total": 3.2,
     "sig_str_acc_total": 0.5, "td_acc_total": 0.4,
     "str_def_total": 0.6, "td_def_total": 0.7,
     "sub_avg": 0.3, "td_avg": 1.5
  },
  "fighter2": { ... mesmo formato ... },
  "context": {
     "is_title_bout": 0, "total_rounds": 3, "gender_male": 1
  }
}

Output (stdout): JSON com a predição.

Uso:
  echo '<json>' | python3 predict.py
"""

import sys
import json
import logging
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import joblib

logging.basicConfig(level=logging.WARNING, format="[%(levelname)s] %(message)s")

MODEL_DIR = Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "model_predictor.pkl"
COLUMNS_PATH = MODEL_DIR / "feature_columns.json"

# Carrega na importação (cacheia em invocações repetidas se for daemonizado)
_model = joblib.load(MODEL_PATH)
_cfg = json.loads(COLUMNS_PATH.read_text())
COLUMNS: list[str] = _cfg["columns"]
MEDIANS: dict[str, float] = _cfg["medians"]

# Mapeamento entre as features do modelo e o JSON de entrada.
PER_FIGHTER = [
    "wins_total", "losses_total", "age", "height", "weight", "reach",
    "SLpM_total", "SApM_total", "sig_str_acc_total", "td_acc_total",
    "str_def_total", "td_def_total", "sub_avg", "td_avg",
]
DIFF_FEATURES = [
    "wins_total_diff", "losses_total_diff", "age_diff", "height_diff",
    "weight_diff", "reach_diff", "SLpM_total_diff", "SApM_total_diff",
    "sig_str_acc_total_diff", "td_acc_total_diff", "str_def_total_diff",
    "td_def_total_diff", "sub_avg_diff", "td_avg_diff",
]
STANCE_VALUES = ["Orthodox", "Southpaw", "Switch", "Open Stance"]


def _slug(s: str) -> str:
    return s.replace(" ", "_").lower()


def _g(d: dict, *keys, default=None):
    """Pega o primeiro valor não-nulo de várias chaves alternativas."""
    for k in keys:
        v = d.get(k)
        if v is not None and not (isinstance(v, float) and math.isnan(v)):
            return v
    return default


def fighter_to_features(f: dict) -> dict:
    """Mapeia o JSON de input (um fighter) → features per-fighter (sem prefixo)."""
    return {
        "wins_total":          _g(f, "wins_total", "wins"),
        "losses_total":        _g(f, "losses_total", "losses"),
        "age":                 _g(f, "age"),
        "height":              _g(f, "height", "height_cm", "heightCm"),
        "weight":              _g(f, "weight", "weight_kg", "weightKg"),
        "reach":               _g(f, "reach", "reach_cm", "reachCm"),
        "SLpM_total":          _g(f, "SLpM_total", "SLpM"),
        "SApM_total":          _g(f, "SApM_total", "SApM"),
        "sig_str_acc_total":   _g(f, "sig_str_acc_total", "Str_Acc"),
        "td_acc_total":        _g(f, "td_acc_total", "TD_Acc"),
        "str_def_total":       _g(f, "str_def_total", "Str_Def"),
        "td_def_total":        _g(f, "td_def_total", "TD_Def"),
        "sub_avg":             _g(f, "sub_avg", "Sub_Avg"),
        "td_avg":              _g(f, "td_avg", "TD_Avg"),
        "stance":              _g(f, "stance", default="Orthodox"),
    }


def _safe_diff(a, b):
    if a is None or b is None:
        return None
    return float(a) - float(b)


def build_row(payload: dict) -> tuple[pd.DataFrame, dict]:
    """Constrói uma linha de features alinhada com COLUMNS (com imputação por mediana)."""
    f1 = fighter_to_features(payload["fighter1"])
    f2 = fighter_to_features(payload["fighter2"])
    ctx = payload.get("context", {}) or {}

    feat: dict[str, Any] = {}
    for k in PER_FIGHTER:
        feat[f"r_{k}"] = f1.get(k)
        feat[f"b_{k}"] = f2.get(k)

    for d in DIFF_FEATURES:
        base = d.replace("_diff", "")
        feat[d] = _safe_diff(f1.get(base), f2.get(base))

    for stance in STANCE_VALUES:
        feat[f"r_stance_{_slug(stance)}"] = 1 if str(f1.get("stance")) == stance else 0
        feat[f"b_stance_{_slug(stance)}"] = 1 if str(f2.get("stance")) == stance else 0

    feat["is_title_bout"] = int(ctx.get("is_title_bout", 0) or 0)
    feat["total_rounds"]  = float(ctx.get("total_rounds", 3) or 3)
    feat["gender_male"]   = int(ctx.get("gender_male", 1) or 0)

    # Imputação com mediana onde estiver vazio
    row = {}
    for col in COLUMNS:
        v = feat.get(col)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            v = MEDIANS.get(col)
        row[col] = v

    df = pd.DataFrame([row], columns=COLUMNS)
    return df, feat


def proba_to_decimal_odds(p: float) -> float:
    p = max(min(p, 0.99), 0.01)
    return round(1.0 / p, 2)


def proba_to_american_odds(p: float) -> int:
    p = max(min(p, 0.99), 0.01)
    if p >= 0.5:
        return -int(round((p / (1 - p)) * 100))
    return int(round(((1 - p) / p) * 100))


def top_features(model, df: pd.DataFrame, k: int = 5) -> list[str]:
    """Retorna top features por |valor × importance|, com sinal explicativo."""
    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return []
    row_vals = df.iloc[0].values
    contribs = []
    for i, col in enumerate(df.columns):
        v = row_vals[i]
        if v is None or (isinstance(v, float) and math.isnan(v)):
            continue
        score = abs(float(v)) * float(importances[i])
        contribs.append((score, col, float(v)))
    contribs.sort(reverse=True)
    out = []
    for _, col, v in contribs[:k]:
        if "_diff" in col:
            out.append(f"{col} = {v:+.2f}")
        else:
            out.append(f"{col} = {v}")
    return out


def main():
    payload = json.loads(sys.stdin.read())
    df, _ = build_row(payload)

    proba = _model.predict_proba(df)[0]
    p_red = float(proba[1])
    p_blue = float(proba[0])

    f1_name = payload.get("fighter1", {}).get("name", "Fighter 1")
    f2_name = payload.get("fighter2", {}).get("name", "Fighter 2")

    winner = f1_name if p_red >= p_blue else f2_name
    confidence = max(p_red, p_blue)

    # Heurística simples para método (KO / Sub / Decisão) — modelo é binário winner-only
    fr1 = float(payload["fighter1"].get("finishRate", 0.5) or 0.5)
    fr2 = float(payload["fighter2"].get("finishRate", 0.5) or 0.5)
    sub1 = float(payload["fighter1"].get("submissionWinRate", 0.0) or 0.0)
    sub2 = float(payload["fighter2"].get("submissionWinRate", 0.0) or 0.0)
    p_finish_overall = max(0.05, min(0.95, (fr1 * p_red + fr2 * p_blue)))
    p_dec_overall   = 1 - p_finish_overall
    f1_sub = sub1 * p_red + (1 - p_red) * 0  # rough
    f1_ko = max(p_finish_overall * p_red - f1_sub, 0)
    f2_sub = sub2 * p_blue
    f2_ko = max(p_finish_overall * p_blue - f2_sub, 0)
    f1_dec = max(p_red - f1_ko - f1_sub, 0)
    f2_dec = max(p_blue - f2_ko - f2_sub, 0)

    out = {
        "fighter1WinProbability": p_red,
        "fighter2WinProbability": p_blue,
        "predictedWinner": winner,
        "confidence": float(confidence),
        "fighter1DecimalOdds": proba_to_decimal_odds(p_red),
        "fighter2DecimalOdds": proba_to_decimal_odds(p_blue),
        "fighter1AmericanOdds": proba_to_american_odds(p_red),
        "fighter2AmericanOdds": proba_to_american_odds(p_blue),
        "keyFactors": top_features(_model, df, k=5),
        "modelBreakdown": [
            {"model": "XGBoost (large_dataset 94-24)", "f1Prob": p_red, "f2Prob": p_blue, "weight": 1.0},
        ],
        "probKoTko":     float(f1_ko + f2_ko),
        "probSubmission":float(f1_sub + f2_sub),
        "probDecision":  float(f1_dec + f2_dec),
        "fighter1KoProb":  float(f1_ko),
        "fighter1SubProb": float(f1_sub),
        "fighter1DecProb": float(f1_dec),
        "fighter2KoProb":  float(f2_ko),
        "fighter2SubProb": float(f2_sub),
        "fighter2DecProb": float(f2_dec),
    }

    sys.stdout.write(json.dumps(out))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
