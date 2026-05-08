#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte model_predictor.pkl (XGBClassifier sklearn) → model_predictor.onnx
para inferência em produção via onnxruntime-node (sem dependência de Python).

Uso:
    python3 convert_to_onnx.py
"""

from pathlib import Path
import json
import joblib
from onnxmltools.convert import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType
import onnxruntime as ort
import numpy as np

HERE = Path(__file__).resolve().parent
PKL = HERE / "model_predictor.pkl"
COLS = HERE / "feature_columns.json"
ONNX = HERE / "model_predictor.onnx"


def main():
    print(f"loading {PKL}")
    model = joblib.load(PKL)

    cfg = json.loads(COLS.read_text())
    n_features = len(cfg["columns"])

    # XGBoost ONNX converter espera feature names "f0..fN-1" (formato Booster default).
    # Reseta os nomes do booster interno para evitar erro de parsing.
    booster = model.get_booster()
    booster.feature_names = [f"f{i}" for i in range(n_features)]
    try:
        del model.__dict__["feature_names_in_"]
    except (KeyError, AttributeError):
        pass

    print(f"converting (n_features={n_features})…")

    initial_types = [("input", FloatTensorType([None, n_features]))]
    onnx_model = convert_xgboost(
        model,
        initial_types=initial_types,
        target_opset=15,
    )
    ONNX.write_bytes(onnx_model.SerializeToString())
    print(f"✔ saved {ONNX}  ({ONNX.stat().st_size / 1024:.1f} KB)")

    # Sanity check: roda inferência com onnxruntime e compara com sklearn
    sess = ort.InferenceSession(str(ONNX))
    medians = cfg["medians"]
    sample = np.array([[medians.get(c, 0.0) for c in cfg["columns"]]], dtype=np.float32)

    skl_proba = model.predict_proba(sample)[0]
    onnx_out = sess.run(None, {"input": sample})
    # XGBoost ONNX retorna [labels, probabilities] — labels=ndarray int, probs=list[dict]
    onnx_proba_raw = onnx_out[1]
    if hasattr(onnx_proba_raw, "shape"):
        onnx_proba = [float(x) for x in np.asarray(onnx_proba_raw)[0]]
    else:
        d = onnx_proba_raw[0]
        onnx_proba = [float(d[k]) for k in sorted(d.keys())]

    print(f"\nsanity check on median sample:")
    print(f"  sklearn proba : {skl_proba}")
    print(f"  onnx    proba : {onnx_proba}")
    diff = max(abs(a - b) for a, b in zip(skl_proba, onnx_proba))
    print(f"  max abs diff  : {diff:.6f}  {'✓ OK' if diff < 1e-3 else '⚠ DIVERGENT'}")


if __name__ == "__main__":
    main()
