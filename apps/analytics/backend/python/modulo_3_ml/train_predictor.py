#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Treino do modelo de predição de lutas — XGBoost binário.

Dataset: large_dataset.csv (UFC 1994-2024, 7.4k lutas).
Target : winner ∈ {Red, Blue} → 1 (Red wins) / 0 (Blue wins)

Features usadas (pre-fight only — career totals e diffs):
  Per-fighter (red & blue):
    wins_total, losses_total, age, height, weight, reach, stance,
    SLpM_total, SApM_total, sig_str_acc_total, td_acc_total,
    str_def_total, td_def_total, sub_avg, td_avg
  Diff features (red - blue):
    wins_total_diff, losses_total_diff, age_diff, height_diff,
    weight_diff, reach_diff, SLpM_total_diff, SApM_total_diff,
    sig_str_acc_total_diff, td_acc_total_diff, str_def_total_diff,
    td_def_total_diff, sub_avg_diff, td_avg_diff
  Bout context:
    is_title_bout, total_rounds, gender_male

Saídas:
  ./model_predictor.pkl      — modelo joblib (XGBClassifier)
  ./feature_columns.json     — ordem das colunas + medianas para imputação
  ./training_report.json     — métricas (accuracy, AUC, log loss, brier, etc.)

Uso:
  python3 train_predictor.py
  python3 train_predictor.py --csv /path/to/large_dataset.csv
"""

import argparse
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, roc_auc_score, log_loss, brier_score_loss,
    classification_report, confusion_matrix,
)
from xgboost import XGBClassifier

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("train_predictor")

# ── Definição das features ─────────────────────────────────────────────────
PER_FIGHTER_NUMERIC = [
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


def build_feature_matrix(df: pd.DataFrame):
    """
    Retorna (X, y, columns).
    - target: 1 se Red ganhou, 0 se Blue ganhou.
    - features: per-fighter (red, blue), diffs e contexto.
    """
    df = df[df["winner"].isin(["Red", "Blue"])].copy()
    y = (df["winner"] == "Red").astype(int).values

    feat = {}

    for f in PER_FIGHTER_NUMERIC:
        feat[f"r_{f}"] = pd.to_numeric(df[f"r_{f}"], errors="coerce")
        feat[f"b_{f}"] = pd.to_numeric(df[f"b_{f}"], errors="coerce")

    for f in DIFF_FEATURES:
        feat[f] = pd.to_numeric(df[f], errors="coerce")

    # Stance one-hot (red & blue)
    for stance in STANCE_VALUES:
        feat[f"r_stance_{stance.replace(' ', '_').lower()}"] = (df["r_stance"].astype(str) == stance).astype(int)
        feat[f"b_stance_{stance.replace(' ', '_').lower()}"] = (df["b_stance"].astype(str) == stance).astype(int)

    feat["is_title_bout"] = pd.to_numeric(df.get("is_title_bout", 0), errors="coerce").fillna(0).astype(int)
    feat["total_rounds"] = pd.to_numeric(df.get("total_rounds", 3), errors="coerce").fillna(3).astype(float)
    feat["gender_male"] = (df["gender"].astype(str).str.lower() == "men").astype(int)

    X = pd.DataFrame(feat)
    return X, y, X.columns.tolist()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--csv",
        default="/Users/diegobatalhacunhadasilva/Desktop/Projeto/projeto_site_rft/rft_academy/data/ufc_complete_dataset_94_24/Large set/large_dataset.csv",
    )
    parser.add_argument("--out-dir", default=str(Path(__file__).parent))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--test-size", type=float, default=0.20)
    args = parser.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    log.info(f"Loading {args.csv}")
    df = pd.read_csv(args.csv)
    log.info(f"  shape={df.shape}")

    X, y, columns = build_feature_matrix(df)
    log.info(f"  X={X.shape}, y={y.shape}, target balance={y.mean():.3f} (Red wins)")

    # Imputação simples: mediana (XGBoost lida com NaN, mas guardamos as medianas
    # para usar no inference quando os campos vierem faltando do banco MySQL).
    medians = X.median(numeric_only=True).to_dict()

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=args.test_size, random_state=args.seed, stratify=y)
    log.info(f"  train={Xtr.shape}, test={Xte.shape}")

    model = XGBClassifier(
        n_estimators=400,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        reg_lambda=1.0,
        reg_alpha=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=args.seed,
        n_jobs=-1,
        tree_method="hist",
    )

    log.info("Cross-val (5-fold AUC)…")
    cv_auc = cross_val_score(model, Xtr, ytr, cv=5, scoring="roc_auc", n_jobs=-1)
    log.info(f"  AUC cv folds: {[round(x, 4) for x in cv_auc]}  mean={cv_auc.mean():.4f}  std={cv_auc.std():.4f}")

    log.info("Fitting final model on train…")
    model.fit(Xtr, ytr, eval_set=[(Xte, yte)], verbose=False)

    proba = model.predict_proba(Xte)[:, 1]
    pred = (proba >= 0.5).astype(int)
    metrics = {
        "n_train": int(Xtr.shape[0]),
        "n_test": int(Xte.shape[0]),
        "n_features": int(Xtr.shape[1]),
        "target_balance_red_wins": float(y.mean()),
        "cv_auc_mean": float(cv_auc.mean()),
        "cv_auc_std": float(cv_auc.std()),
        "test_accuracy": float(accuracy_score(yte, pred)),
        "test_auc": float(roc_auc_score(yte, proba)),
        "test_log_loss": float(log_loss(yte, proba)),
        "test_brier": float(brier_score_loss(yte, proba)),
    }

    log.info("Test metrics:")
    for k, v in metrics.items():
        log.info(f"  {k}: {v}")

    log.info("Confusion matrix (rows=true, cols=pred):")
    cm = confusion_matrix(yte, pred)
    log.info(f"  {cm.tolist()}")
    log.info("\n" + classification_report(yte, pred, target_names=["Blue", "Red"]))

    # Top 15 features por importance
    importances = sorted(zip(columns, model.feature_importances_), key=lambda x: -x[1])[:15]
    log.info("Top 15 feature importances:")
    for name, imp in importances:
        log.info(f"  {name:35s} {imp:.4f}")

    # Salvar artefatos
    model_path = out / "model_predictor.pkl"
    joblib.dump(model, model_path)
    log.info(f"✔ saved {model_path}")

    cols_path = out / "feature_columns.json"
    with open(cols_path, "w") as f:
        json.dump({"columns": columns, "medians": medians}, f, indent=2)
    log.info(f"✔ saved {cols_path}")

    metrics_path = out / "training_report.json"
    importances_serializable = {name: float(imp) for name, imp in importances}
    with open(metrics_path, "w") as f:
        json.dump({**metrics, "feature_importances": importances_serializable}, f, indent=2)
    log.info(f"✔ saved {metrics_path}")


if __name__ == "__main__":
    main()
