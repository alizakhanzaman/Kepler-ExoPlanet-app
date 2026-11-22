"""Part B - from detection to prioritisation.

Scores every CANDIDATE KOI (never used in training) with the deployed model,
computes an ESI-inspired Earth Similarity Score (ESS) from planet radius and
insolation, ranks candidates by priority = p_planet * ESS, finds the Pareto
front on (p_planet, ESS), runs a weighting sensitivity check, and tries to
validate the probability ranking against the live NASA Exoplanet Archive.

Run from the repo root:
    python research/prioritise_candidates.py
Outputs:
    research/results/prioritisation.json      (full summary, public)
    frontend/public/data/candidates.json      (top 200 + summary, public)
"""
from __future__ import annotations

import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "cumulative.csv"
BUNDLE = ROOT / "backend" / "models" / "model_bundle.joblib"
OUT_RESULTS = ROOT / "research" / "results" / "prioritisation.json"
OUT_SITE = ROOT / "frontend" / "public" / "data" / "candidates.json"
TOP_N_SITE = 200


def sim(x: np.ndarray) -> np.ndarray:
    """Single-parameter similarity to Earth (x in Earth units): 1 - |(x-1)/(x+1)|."""
    return 1.0 - np.abs((x - 1.0) / (x + 1.0))


def pareto_front(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Boolean mask of points not dominated on (a, b), both maximised."""
    order = np.lexsort((-b, -a))           # sort by a desc, then b desc
    mask = np.zeros(len(a), dtype=bool)
    best_b = -np.inf
    for i in order:
        if b[i] > best_b:
            mask[i] = True
            best_b = b[i]
    return mask


def top_overlap(s1: pd.Series, s2: pd.Series, k: int = 20) -> int:
    return len(set(s1.nlargest(k).index) & set(s2.nlargest(k).index))


# ---------------------------------------------------------------- NASA check
def fetch_nasa_dispositions() -> tuple[pd.DataFrame | None, list[dict]]:
    """Try several documented ways of reading the archive's KOI cumulative table.
    Returns (frame or None, attempt log)."""
    attempts: list[dict] = []

    # 1) astroquery
    try:
        from astroquery.ipac.nexsci.nasa_exoplanet_archive import NasaExoplanetArchive
        tab = NasaExoplanetArchive.query_criteria(
            table="cumulative", select="kepoi_name,koi_disposition")
        frame = tab.to_pandas()[["kepoi_name", "koi_disposition"]]
        attempts.append({"method": "astroquery NasaExoplanetArchive.query_criteria",
                         "ok": True, "rows": int(len(frame))})
        return frame, attempts
    except Exception as exc:  # noqa: BLE001 - report the real error
        attempts.append({"method": "astroquery NasaExoplanetArchive.query_criteria",
                         "ok": False, "error": f"{type(exc).__name__}: {str(exc)[:300]}"})

    import requests
    urls = [
        ("TAP sync (ADQL)",
         "https://exoplanetarchive.ipac.caltech.edu/TAP/sync",
         {"query": "select kepoi_name,koi_disposition from cumulative", "format": "csv"}),
        ("Legacy nstedAPI",
         "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI",
         {"table": "cumulative", "select": "kepoi_name,koi_disposition", "format": "csv"}),
    ]
    for name, url, params in urls:
        try:
            r = requests.get(url, params=params, timeout=90,
                             headers={"User-Agent": "kepler-research-script/1.0"})
            if r.status_code != 200:
                attempts.append({"method": name, "url": r.url, "ok": False,
                                 "error": f"HTTP {r.status_code}: {r.text[:200]}"})
                continue
            frame = pd.read_csv(io.StringIO(r.text))
            frame.columns = [c.strip().lower() for c in frame.columns]
            if not {"kepoi_name", "koi_disposition"} <= set(frame.columns):
                attempts.append({"method": name, "url": r.url, "ok": False,
                                 "error": f"unexpected columns {list(frame.columns)[:5]}"})
                continue
            attempts.append({"method": name, "url": r.url, "ok": True, "rows": int(len(frame))})
            return frame[["kepoi_name", "koi_disposition"]], attempts
        except Exception as exc:  # noqa: BLE001
            attempts.append({"method": name, "url": url, "ok": False,
                             "error": f"{type(exc).__name__}: {str(exc)[:300]}"})
    return None, attempts


def main() -> int:
    if not DATA.exists():
        print(f"Missing {DATA}. Download the Kaggle 'nasa/kepler-exoplanet-search-results' "
              "cumulative.csv into data/ first.")
        return 1

    df = pd.read_csv(DATA)
    bundle = joblib.load(BUNDLE)
    model, features = bundle["pipeline"], bundle["features"]

    cand = df[df["koi_disposition"] == "CANDIDATE"].copy()
    n_cand = len(cand)
    cand["p_planet"] = model.predict_proba(cand[features])[:, 1]

    # ESS: drop candidates missing radius or insolation (not imputed: no ground truth)
    has_both = cand["koi_prad"].notna() & cand["koi_insol"].notna()
    n_dropped = int((~has_both).sum())
    n_missing_prad = int(cand["koi_prad"].isna().sum())
    n_missing_insol = int(cand["koi_insol"].isna().sum())
    c = cand[has_both].copy()
    c["sim_radius"] = sim(c["koi_prad"].to_numpy())
    c["sim_insol"] = sim(c["koi_insol"].to_numpy())
    c["ess"] = np.sqrt(c["sim_radius"] * c["sim_insol"])
    c["priority"] = c["p_planet"] * c["ess"]
    c["pareto"] = pareto_front(c["p_planet"].to_numpy(), c["ess"].to_numpy())

    # Sensitivity of the ranking to the weighting
    alt1 = c["p_planet"] * c["ess"] ** 2
    alt2 = c["p_planet"] ** 2 * c["ess"]
    sens = {
        "p_x_ess2": {"spearman": round(float(spearmanr(c["priority"], alt1)[0]), 4),
                     "top20_overlap": top_overlap(c["priority"], alt1)},
        "p2_x_ess": {"spearman": round(float(spearmanr(c["priority"], alt2)[0]), 4),
                     "top20_overlap": top_overlap(c["priority"], alt2)},
    }

    # Live NASA archive check of the probability ranking
    nasa, attempts = fetch_nasa_dispositions()
    nasa_block: dict = {"attempts": attempts, "ok": nasa is not None,
                        "queried_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}
    if nasa is not None:
        status = nasa.drop_duplicates("kepoi_name").set_index("kepoi_name")["koi_disposition"]
        cand["nasa_now"] = cand["kepoi_name"].map(status).fillna("NOT FOUND")
        c["nasa_now"] = c["kepoi_name"].map(status).fillna("NOT FOUND")
        ranked = cand.sort_values("p_planet", ascending=False)

        def counts(frame: pd.DataFrame) -> dict:
            vc = frame["nasa_now"].value_counts()
            n = len(frame)
            out = {k: int(v) for k, v in vc.items()}
            out["n"] = n
            out["confirmed_rate"] = round(vc.get("CONFIRMED", 0) / n, 4)
            out["false_positive_rate"] = round(vc.get("FALSE POSITIVE", 0) / n, 4)
            out["resolved_rate"] = round((vc.get("CONFIRMED", 0) + vc.get("FALSE POSITIVE", 0)) / n, 4)
            return out

        groups = {f"top{k}": counts(ranked.head(k)) for k in (20, 50, 100)}
        groups["bottom100"] = counts(ranked.tail(100))
        groups["all_candidates"] = counts(ranked)
        nasa_block["by_probability_rank"] = groups
        resolved = cand[cand["nasa_now"].isin(["CONFIRMED", "FALSE POSITIVE"])]
        nasa_block["resolved_since_snapshot"] = int(len(resolved))
        if len(resolved) >= 30 and resolved["nasa_now"].nunique() == 2:
            from sklearn.metrics import roc_auc_score, average_precision_score
            yv = (resolved["nasa_now"] == "CONFIRMED").astype(int)
            nasa_block["resolved_roc_auc"] = round(float(roc_auc_score(yv, resolved["p_planet"])), 4)
            nasa_block["resolved_pr_auc"] = round(float(average_precision_score(yv, resolved["p_planet"])), 4)
            nasa_block["resolved_confirmed_share"] = round(float(yv.mean()), 4)
        nasa_block["informative"] = bool(nasa_block["resolved_since_snapshot"] >= 30)
    else:
        nasa_block["informative"] = False

    ranked_c = c.sort_values("priority", ascending=False).reset_index(drop=True)
    ranked_c["rank"] = np.arange(1, len(ranked_c) + 1)

    summary = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "model": bundle.get("model_name", "LightGBM"),
        "n_candidates": n_cand,
        "n_dropped_missing_prad_or_insol": n_dropped,
        "n_missing_prad": n_missing_prad,
        "n_missing_insol": n_missing_insol,
        "n_scored_ess": int(len(c)),
        "p_planet": {"mean": round(float(cand["p_planet"].mean()), 4),
                     "median": round(float(cand["p_planet"].median()), 4),
                     "n_ge_0_5": int((cand["p_planet"] >= 0.5).sum()),
                     "n_ge_0_9": int((cand["p_planet"] >= 0.9).sum()),
                     "n_ge_0_901": int((cand["p_planet"] >= 0.901).sum())},
        "ess": {"mean": round(float(c["ess"].mean()), 4),
                "median": round(float(c["ess"].median()), 4),
                "n_ge_0_8": int((c["ess"] >= 0.8).sum()),
                "n_ge_0_9": int((c["ess"] >= 0.9).sum())},
        "n_pareto": int(c["pareto"].sum()),
        "sensitivity": sens,
        "nasa_check": nasa_block,
        "definitions": {
            "sim": "1 - |(x - 1) / (x + 1)|, x in Earth units",
            "ess": "sqrt(sim(koi_prad) * sim(koi_insol)); ESI-inspired, not the published ESI",
            "priority": "p_planet * ess",
        },
    }

    cols = ["rank", "kepoi_name", "kepler_name", "koi_period", "koi_prad", "koi_insol",
            "koi_teq", "koi_steff", "p_planet", "ess", "priority", "pareto"]
    if "nasa_now" in ranked_c.columns:
        cols.append("nasa_now")

    def records(frame: pd.DataFrame) -> list[dict]:
        out = []
        for row in frame[cols].to_dict(orient="records"):
            rec = {}
            for k, v in row.items():
                if isinstance(v, (float, np.floating)):
                    rec[k] = None if not np.isfinite(v) else round(float(v), 5)
                elif isinstance(v, (np.bool_, bool)):
                    rec[k] = bool(v)
                elif isinstance(v, (np.integer,)):
                    rec[k] = int(v)
                else:
                    rec[k] = None if (v is None or (isinstance(v, float) and np.isnan(v))) else v
            out.append(rec)
        return out

    top = ranked_c.head(TOP_N_SITE)
    pareto_rows = ranked_c[ranked_c["pareto"]]
    # scatter: all scored candidates as compact [p, ess, pareto] triples
    scatter = [[round(float(p), 4), round(float(e), 4), int(f)]
               for p, e, f in zip(c["p_planet"], c["ess"], c["pareto"])]

    OUT_RESULTS.parent.mkdir(parents=True, exist_ok=True)
    OUT_SITE.parent.mkdir(parents=True, exist_ok=True)
    full = dict(summary, top20=records(ranked_c.head(20)), pareto_front=records(pareto_rows))
    OUT_RESULTS.write_text(json.dumps(full, indent=2), encoding="utf-8")
    site = dict(summary, top=records(top), pareto_front=records(pareto_rows), scatter=scatter)
    OUT_SITE.write_text(json.dumps(site, separators=(",", ":")), encoding="utf-8")

    # ---- console report
    print(f"Candidates scored: {n_cand}; dropped for missing prad/insol: {n_dropped} "
          f"(prad missing {n_missing_prad}, insol missing {n_missing_insol}); ESS scored: {len(c)}")
    print(f"p_planet mean {summary['p_planet']['mean']}, >=0.5: {summary['p_planet']['n_ge_0_5']}, "
          f">=0.9: {summary['p_planet']['n_ge_0_9']}")
    print(f"ESS mean {summary['ess']['mean']}, >=0.8: {summary['ess']['n_ge_0_8']}; Pareto points: {summary['n_pareto']}")
    print("Sensitivity:", sens)
    print("NASA attempts:")
    for a in attempts:
        print("  ", a)
    if nasa is not None:
        for k, v in nasa_block["by_probability_rank"].items():
            print(f"   {k:15s} {v}")
        print("   resolved since snapshot:", nasa_block["resolved_since_snapshot"],
              "| ROC-AUC on resolved:", nasa_block.get("resolved_roc_auc"),
              "| PR-AUC:", nasa_block.get("resolved_pr_auc"))
    print("\nTop 10 by priority:")
    print(ranked_c.head(10)[["rank", "kepoi_name", "koi_prad", "koi_insol", "p_planet", "ess", "priority"]]
          .to_string(index=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
