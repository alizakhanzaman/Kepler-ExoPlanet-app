"""Part A - replication of the base paper.

J. Wang, "Using Machine Learning for Exoplanet Classification",
Research Archive of Rising Scholars, preprint 1021.

What the PDF states (re-read for this script):
  * Kaggle cumulative.csv, CANDIDATE rows removed (CONFIRMED vs FALSE POSITIVE only).
  * The same 11 features (koi_period ... koi_srad); rows with missing values deleted (dropna).
  * scikit-learn MLPClassifier, ReLU activation, Adam solver.
  * 16 hidden-layer trials, each run 3 times; best = Trial 15 (300,200,200,100,100):
    recall FP 0.95, precision FP 0.83, recall CONFIRMED 0.60, precision CONFIRMED 0.85, ROC AUC 0.91.

What the PDF does NOT state (our assumptions, reported in the JSON):
  * train/test split ratio and seed -> sklearn default test_size=0.25, stratified, seeds 0,1,2
    (one per "run"); no validation set is described.
  * feature scaling -> none is mentioned, so the faithful run uses raw features; a standardised
    variant is reported separately.
  * max_iter and other MLP settings -> sklearn defaults.
  * The text says "4599 of 9564 rows (48%)" survive dropna, but the paper's own Table 2 shows
    count 7016 for most columns; we report the count we actually get.
  * The abstract says "convolutional neural networks (CNN)" but the method is an MLPClassifier.

Run from the repo root:  python research/replicate_base_paper.py [--quick]
Output: research/results/replication.json
"""
from __future__ import annotations

import argparse
import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.exceptions import ConvergenceWarning
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore", category=ConvergenceWarning)

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ["koi_period", "koi_impact", "koi_duration", "koi_depth", "koi_prad", "koi_teq",
            "koi_insol", "koi_model_snr", "koi_steff", "koi_slogg", "koi_srad"]
TRIALS = [(50, 50), (70, 30), (40, 60), (200, 200), (300, 300), (400, 400), (500, 500),
          (100, 100, 100), (200, 200, 200), (300, 300, 300), (400, 400, 400),
          (100, 100, 100, 100), (200, 200, 200, 100), (300, 200, 200, 100),
          (300, 200, 200, 100, 100), (300, 200, 200, 200, 200)]
PAPER_T15 = {"recall_fp": 0.95, "precision_fp": 0.83, "recall_confirmed": 0.60,
             "precision_confirmed": 0.85, "roc_auc": 0.91}
SEEDS = (0, 1, 2)


def evaluate(model, X_te, y_te) -> dict:
    proba = model.predict_proba(X_te)[:, 1]
    pred = (proba >= 0.5).astype(int)
    p, r, _, _ = precision_recall_fscore_support(y_te, pred, labels=[0, 1], zero_division=0)
    return {"roc_auc": float(roc_auc_score(y_te, proba)), "f1_confirmed": float(f1_score(y_te, pred)),
            "precision_fp": float(p[0]), "recall_fp": float(r[0]),
            "precision_confirmed": float(p[1]), "recall_confirmed": float(r[1])}


def summarise(runs: list[dict]) -> dict:
    keys = runs[0].keys()
    return {k: {"mean": round(float(np.mean([x[k] for x in runs])), 4),
                "std": round(float(np.std([x[k] for x in runs])), 4)} for k in keys}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="only Trial 15 (skip the 16-trial sweep)")
    args = ap.parse_args()

    df = pd.read_csv(ROOT / "data" / "cumulative.csv")
    lab = df[df["koi_disposition"].isin(["CONFIRMED", "FALSE POSITIVE"])]
    important = lab[["koi_disposition"] + FEATURES]
    clean = important.dropna()
    X = clean[FEATURES].to_numpy()
    y = (clean["koi_disposition"] == "CONFIRMED").astype(int).to_numpy()
    print(f"Labelled rows {len(lab)}; after dropna {len(clean)} "
          f"({len(clean) / len(df):.1%} of all {len(df)} KOIs); CONFIRMED share {y.mean():.3f}")

    splits = [train_test_split(X, y, test_size=0.25, random_state=s, stratify=y) for s in SEEDS]

    def run(layers, scaled: bool) -> dict:
        runs = []
        for s, (X_tr, X_te, y_tr, y_te) in zip(SEEDS, splits):
            mlp = MLPClassifier(hidden_layer_sizes=layers, activation="relu", solver="adam",
                                random_state=s)
            model = make_pipeline(StandardScaler(), mlp) if scaled else mlp
            model.fit(X_tr, y_tr)
            runs.append(evaluate(model, X_te, y_te))
        return {"layers": list(layers), "runs": [{k: round(v, 4) for k, v in r.items()} for r in runs],
                "summary": summarise(runs)}

    t0 = time.time()
    faithful = run((300, 200, 200, 100, 100), scaled=False)
    scaled = run((300, 200, 200, 100, 100), scaled=True)

    # Benchmark on the very same dropna splits: the deployed model family (LightGBM)
    from lightgbm import LGBMClassifier
    lgb_runs = []
    for s, (X_tr, X_te, y_tr, y_te) in zip(SEEDS, splits):
        m = LGBMClassifier(n_estimators=300, learning_rate=0.05, num_leaves=31, subsample=0.8,
                           subsample_freq=1, class_weight="balanced", random_state=s, verbose=-1, n_jobs=1)
        m.fit(X_tr, y_tr)
        lgb_runs.append(evaluate(m, X_te, y_te))
    lightgbm = {"runs": [{k: round(v, 4) for k, v in r.items()} for r in lgb_runs],
                "summary": summarise(lgb_runs)}

    sweep = []
    if not args.quick:
        for i, layers in enumerate(TRIALS, 1):
            res = run(layers, scaled=False)
            sm = res["summary"]
            sweep.append({"trial": i, "layers": list(layers),
                          **{k: sm[k]["mean"] for k in sm}})
            print(f"  trial {i:2d} {str(layers):28s} AUC {sm['roc_auc']['mean']:.3f} "
                  f"recC {sm['recall_confirmed']['mean']:.2f} precC {sm['precision_confirmed']['mean']:.2f}")

    out = {
        "paper": {"citation": "J. Wang, 'Using Machine Learning for Exoplanet Classification', "
                              "Research Archive of Rising Scholars, preprint 1021",
                  "trial15_reported": PAPER_T15,
                  "rows_after_dropna_reported_in_text": 4599},
        "data": {"n_kois": int(len(df)), "n_labelled": int(len(lab)), "n_after_dropna": int(len(clean)),
                 "confirmed_share": round(float(y.mean()), 4)},
        "protocol": {"split": "stratified train_test_split, test_size=0.25 (sklearn default; the paper "
                              "does not state a ratio), seeds 0,1,2 = the paper's 3 runs",
                     "mlp": "MLPClassifier(activation='relu', solver='adam'), other params sklearn defaults",
                     "faithful_scaling": "none (the paper mentions no scaling)",
                     "threshold": 0.5},
        "trial15_faithful": faithful,
        "trial15_standardised": scaled,
        "lightgbm_same_splits": lightgbm,
        "trial_sweep_faithful": sweep,
        "ambiguities": [
            "Train/test split ratio, stratification and seed are not stated.",
            "Feature scaling is not mentioned.",
            "max_iter / early stopping / learning rate are not stated.",
            "Text reports 4599 rows after dropna, but the paper's Table 2 shows count 7016 for most columns.",
            "Abstract says CNN; the method section and results use an MLPClassifier.",
        ],
        "runtime_seconds": round(time.time() - t0, 1),
    }
    path = ROOT / "research" / "results" / "replication.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")

    def row(name, s):
        return (f"{name:28s} {s['roc_auc']['mean']:.3f}±{s['roc_auc']['std']:.3f}  "
                f"{s['recall_fp']['mean']:.2f}  {s['precision_fp']['mean']:.2f}  "
                f"{s['recall_confirmed']['mean']:.2f}  {s['precision_confirmed']['mean']:.2f}")
    print(f"\n{'':28s} ROC-AUC       recFP precFP recC precC")
    p = PAPER_T15
    print(f"{'Paper, Trial 15 (reported)':28s} {p['roc_auc']:.2f}          {p['recall_fp']:.2f}  "
          f"{p['precision_fp']:.2f}  {p['recall_confirmed']:.2f}  {p['precision_confirmed']:.2f}")
    print(row("Replication (raw features)", faithful["summary"]))
    print(row("Replication (standardised)", scaled["summary"]))
    print(row("LightGBM, same splits", lightgbm["summary"]))
    print(f"\nSaved {path.relative_to(ROOT)} in {out['runtime_seconds']} s")


if __name__ == "__main__":
    main()
