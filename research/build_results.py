"""Assemble frontend/public/data/results.json for the website.

Sources:
  * GROUND_TRUTH below: numbers copied verbatim from the training notebook
    Kepler_ExoPlanet_v2 (CV tables, hold-out metrics with bootstrap CIs, importance).
  * research/results/replication.json      (Part A, produced by replicate_base_paper.py)
  * research/results/prioritisation.json   (Part B, produced by prioritise_candidates.py)
  * A precision/recall threshold curve computed here from the hold-out split with the
    deployed model bundle (same split as the notebook: stratified 80/20, random_state=42).

Run from the repo root after the other two scripts:  python research/build_results.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / "research" / "results"
LEAK = ["kepid", "kepoi_name", "kepler_name", "koi_pdisposition", "rowid",
        "koi_score", "koi_fpflag_nt", "koi_fpflag_ss", "koi_fpflag_co", "koi_fpflag_ec"]

GROUND_TRUTH = {
    "dataset": {"n_kois": 9564, "false_positive": 5023, "confirmed": 2293, "candidate": 2248,
                "labelled": 7316, "confirmed_share": 0.313, "train": 5852, "test": 1464,
                "n_features_all": 36, "n_features_deployed": 11},
    "feature_sets": [
        {"key": "all", "label": "All", "n": 36},
        {"key": "no_err", "label": "No errors", "n": 16},
        {"key": "no_nonphys", "label": "No non-phys.", "n": 31},
        {"key": "no_err_no_nonphys", "label": "Paper's 11", "n": 11},
    ],
    "cv_f1": [
        {"name": "LightGBM", "f1": [0.921, 0.901, 0.914, 0.895]},
        {"name": "XGBoost", "f1": [0.920, 0.900, 0.914, 0.896]},
        {"name": "Random Forest", "f1": [0.904, 0.881, 0.903, 0.878]},
        {"name": "MLP (paper-style)", "f1": [0.899, 0.808, 0.900, 0.840]},
        {"name": "Logistic Regression", "f1": [0.852, 0.752, 0.835, 0.738]},
    ],
    "pr_auc_11": [
        {"name": "LightGBM", "pr_auc": 0.951}, {"name": "XGBoost", "pr_auc": 0.951},
        {"name": "Random Forest", "pr_auc": 0.939}, {"name": "MLP (paper-style)", "pr_auc": 0.910},
        {"name": "Logistic Regression", "pr_auc": 0.729},
    ],
    "selection": [
        {"name": "Logistic Regression", "cv_pr_auc": 0.7355},
        {"name": "XGBoost", "cv_pr_auc": 0.9501},
        {"name": "LightGBM", "cv_pr_auc": 0.9518},
    ],
    "holdout": [
        {"name": "Logistic Regression", "f1": 0.744, "f1_ci": None, "pr_auc": 0.732, "pr_auc_ci": None,
         "roc_auc": 0.894, "roc_auc_ci": None, "recall": None, "precision": None},
        {"name": "XGBoost", "f1": 0.899, "f1_ci": [0.876, 0.919], "pr_auc": 0.959, "pr_auc_ci": None,
         "roc_auc": 0.980, "roc_auc_ci": None, "recall": None, "precision": None},
        {"name": "LightGBM", "f1": 0.893, "f1_ci": [0.869, 0.914], "pr_auc": 0.958,
         "pr_auc_ci": [0.941, 0.971], "roc_auc": 0.980, "roc_auc_ci": [0.973, 0.986],
         "recall": 0.915, "precision": 0.871},
    ],
    "confusion_matrix": [[943, 62], [39, 420]],
    "thresholds": {"default": {"t": 0.5, "precision": 0.871, "recall": 0.915},
                   "high_precision": {"t": 0.901, "precision": 0.950, "recall": 0.749}},
    "importance": [
        {"feature": "koi_model_snr", "drop": 0.1408}, {"feature": "koi_prad", "drop": 0.0988},
        {"feature": "koi_duration", "drop": 0.0584}, {"feature": "koi_period", "drop": 0.0537},
        {"feature": "koi_impact", "drop": 0.0467}, {"feature": "koi_depth", "drop": 0.0275},
        {"feature": "koi_srad", "drop": 0.0177}, {"feature": "koi_steff", "drop": 0.0171},
        {"feature": "koi_insol", "drop": 0.0148}, {"feature": "koi_teq", "drop": 0.0081},
        {"feature": "koi_slogg", "drop": 0.0040},
    ],
}


def threshold_curve() -> list[dict]:
    df = pd.read_csv(ROOT / "data" / "cumulative.csv")
    bundle = joblib.load(ROOT / "backend" / "models" / "model_bundle.joblib")
    lab = df[df["koi_disposition"].isin(["CONFIRMED", "FALSE POSITIVE"])].reset_index(drop=True)
    y = (lab["koi_disposition"] == "CONFIRMED").astype(int)
    X = lab.drop(columns=[c for c in LEAK + ["koi_disposition"] if c in lab.columns])
    X = X.select_dtypes(include=[np.number])
    X = X.loc[:, X.isnull().mean() <= 0.40]
    _, X_te, _, y_te = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
    proba = bundle["pipeline"].predict_proba(X_te[bundle["features"]].to_numpy())[:, 1]
    out = []
    for t in [round(x, 3) for x in np.arange(0.05, 0.96, 0.05)] + [0.901]:
        pred = (proba >= t).astype(int)
        out.append({"t": t, "precision": round(float(precision_score(y_te, pred, zero_division=0)), 4),
                    "recall": round(float(recall_score(y_te, pred)), 4),
                    "f1": round(float(f1_score(y_te, pred)), 4)})
    return sorted(out, key=lambda d: d["t"])


def main() -> None:
    rep = json.loads((RES / "replication.json").read_text(encoding="utf-8"))
    pri = json.loads((RES / "prioritisation.json").read_text(encoding="utf-8"))

    def rrow(label, block):
        s = block["summary"]
        return {"label": label, "roc_auc": s["roc_auc"]["mean"], "roc_auc_std": s["roc_auc"]["std"],
                "recall_fp": s["recall_fp"]["mean"], "precision_fp": s["precision_fp"]["mean"],
                "recall_confirmed": s["recall_confirmed"]["mean"],
                "precision_confirmed": s["precision_confirmed"]["mean"]}

    p = rep["paper"]["trial15_reported"]
    paper_aucs = [0.87, 0.89, 0.88, 0.88, 0.91, 0.90, 0.89, 0.88, 0.91, 0.87, 0.90, 0.90, 0.89, 0.90, 0.91, 0.87]
    replication = {
        "rows_after_dropna": rep["data"]["n_after_dropna"],
        "rows_reported_in_text": rep["paper"]["rows_after_dropna_reported_in_text"],
        "protocol": [rep["protocol"]["split"], rep["protocol"]["mlp"], rep["protocol"]["faithful_scaling"]],
        "rows": [
            {"label": "Paper, Trial 15 (reported)", "roc_auc": p["roc_auc"], "roc_auc_std": None,
             "recall_fp": p["recall_fp"], "precision_fp": p["precision_fp"],
             "recall_confirmed": p["recall_confirmed"], "precision_confirmed": p["precision_confirmed"]},
            rrow("Replication, raw features", rep["trial15_faithful"]),
            rrow("Replication, standardised", rep["trial15_standardised"]),
            rrow("LightGBM, same splits", rep["lightgbm_same_splits"]),
        ],
        "sweep": [{"trial": s["trial"], "layers": s["layers"], "roc_auc": s["roc_auc"],
                   "paper_roc_auc": paper_aucs[s["trial"] - 1]} for s in rep.get("trial_sweep_faithful", [])],
        "ambiguities": rep["ambiguities"],
    }
    prio = {k: v for k, v in pri.items() if k not in ("top20", "pareto_front", "definitions", "generated_utc", "model")}

    out = dict(GROUND_TRUTH)
    out["thresholds"] = dict(GROUND_TRUTH["thresholds"], curve=threshold_curve(),
                             curve_source="Computed from the hold-out split with the deployed bundle "
                                          "(research/build_results.py).")
    out["replication"] = replication
    out["prioritisation"] = prio
    out["generated_utc"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    path = ROOT / "frontend" / "public" / "data" / "results.json"
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {path.relative_to(ROOT)}")
    for c in out["thresholds"]["curve"]:
        if c["t"] in (0.5, 0.901):
            print("threshold check", c)


if __name__ == "__main__":
    main()
