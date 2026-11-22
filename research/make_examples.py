"""Precomputed example predictions for the GitHub Pages classifier gallery.

Rebuilds the notebook's stratified 80/20 split (random_state=42) on the labelled
KOIs, checks that the deployed model reproduces the hold-out confusion matrix,
and scores a handful of real hold-out rows with the real model.

Run from the repo root:  python research/make_examples.py
Output: frontend/public/data/examples.json
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, f1_score, roc_auc_score, average_precision_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
LEAK = ["kepid", "kepoi_name", "kepler_name", "koi_pdisposition", "rowid",
        "koi_score", "koi_fpflag_nt", "koi_fpflag_ss", "koi_fpflag_co", "koi_fpflag_ec"]


def main() -> None:
    df = pd.read_csv(ROOT / "data" / "cumulative.csv")
    bundle = joblib.load(ROOT / "backend" / "models" / "model_bundle.joblib")
    model, features = bundle["pipeline"], bundle["features"]

    lab = df[df["koi_disposition"].isin(["CONFIRMED", "FALSE POSITIVE"])].reset_index(drop=True)
    y = (lab["koi_disposition"] == "CONFIRMED").astype(int)
    X = lab.drop(columns=[c for c in LEAK + ["koi_disposition"] if c in lab.columns])
    X = X.select_dtypes(include=[np.number])
    X = X.loc[:, X.isnull().mean() <= 0.40]
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)

    proba = model.predict_proba(X_test[features])[:, 1]
    pred = (proba >= 0.5).astype(int)
    cm = confusion_matrix(y_test, pred).tolist()
    check = {"n_test": int(len(y_test)), "confusion_matrix": cm,
             "f1": round(float(f1_score(y_test, pred)), 4),
             "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
             "pr_auc": round(float(average_precision_score(y_test, proba)), 4)}
    print("Hold-out check with deployed bundle:", check)

    test = lab.loc[X_test.index].assign(p=proba, pred=pred, y=y_test.values)
    rng = np.random.default_rng(42)
    pick = []
    for label, want_correct, n in ((1, True, 3), (0, True, 3), (1, False, 1), (0, False, 1)):
        pool = test[(test["y"] == label) & ((test["pred"] == test["y"]) == want_correct)]
        pick += list(rng.choice(pool.index, size=min(n, len(pool)), replace=False))

    examples = []
    for i in pick:
        r = test.loc[i]
        examples.append({
            "kepoi_name": r["kepoi_name"],
            "kepler_name": None if pd.isna(r["kepler_name"]) else r["kepler_name"],
            "true_label": r["koi_disposition"],
            "prediction": "CONFIRMED" if r["pred"] == 1 else "FALSE POSITIVE",
            "confirmed_probability": round(float(r["p"]), 4),
            "correct": bool(r["pred"] == r["y"]),
            "inputs": {f: (None if pd.isna(r[f]) else round(float(r[f]), 5)) for f in features},
        })
    out = {"note": "Precomputed with backend/models/model_bundle.joblib on real hold-out test rows "
                   "(stratified 80/20 split, random_state=42). Not a live prediction.",
           "holdout_check": check, "examples": examples}
    path = ROOT / "frontend" / "public" / "data" / "examples.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    for e in examples:
        print(f"{e['kepoi_name']:12s} true={e['true_label']:15s} pred={e['prediction']:15s} p={e['confirmed_probability']}")


if __name__ == "__main__":
    main()
