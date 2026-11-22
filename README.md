# Kepler Exoplanet Prioritiser

A full-stack machine-learning research project on NASA Kepler Objects of Interest (KOIs).

1. **Replicates** a published exoplanet classifier (J. Wang, *Using Machine Learning for Exoplanet Classification*,
   Research Archive of Rising Scholars, preprint 1021) with running code.
2. **Benchmarks** it against four other model families with leak-safe evaluation, confidence intervals and explainability.
3. **Extends it from detection to prioritisation** (the research novelty): every unresolved CANDIDATE signal is scored
   by the deployed model and ranked by `p_planet × ESS`, where ESS is an ESI-inspired Earth Similarity Score. The ranking
   is checked against today's NASA Exoplanet Archive dispositions.
4. **Ships it** as a Flask API and a multi-page Angular website, tested and deployed by GitHub Actions.

- **Repository:** https://github.com/alizakhanzaman/Kepler-ExoPlanet-app
- **Website (GitHub Pages):** https://alizakhanzaman.github.io/Kepler-ExoPlanet-app/
  (pages use hash URLs, e.g. `#/results`, `#/prioritisation`)

> **Research and teaching prototype.** Not a validated astronomical classification. The Earth Similarity Score
> measures Earth-likeness in radius and insolation only; it is **not** a habitability measure.

## Website pages

| Route | Content |
|---|---|
| `#/` Home | Animated transit, headline metrics, what the project does |
| `#/classifier` | 11-field form with live transit preview; live prediction through local Flask, precomputed gallery on Pages |
| `#/results` | Model comparison, feature-set heatmap, confusion matrix, threshold trade-off, permutation importance, replication vs paper |
| `#/novelty` | Base paper vs this work; contributions split into COMPLETED and PLANNED |
| `#/prioritisation` | Sortable, filterable ranked candidates; p_planet vs ESS scatter with Pareto front; sensitivity and NASA check |
| `#/literature` | Annotated, verified references grouped by theme; research-gap table |
| `#/pipeline` | CI/CD flow and system architecture |
| `#/about` | Summary, limitations and ethics |

Built with Angular 22 (standalone components, zoneless change detection, signals, lazy routes, hash routing),
inline SVG charts, a canvas starfield background (pauses when hidden, static under `prefers-reduced-motion`),
no external fonts, CDNs or chart libraries.

## Problem and data

- **Task:** classify Kepler transit signals as CONFIRMED (1) or FALSE POSITIVE (0), then rank CANDIDATE signals.
- **Dataset:** Kaggle "Kepler Exoplanet Search Results" (`nasa/kepler-exoplanet-search-results`, `cumulative.csv`):
  9,564 KOIs = 5,023 FALSE POSITIVE, 2,293 CONFIRMED, 2,248 CANDIDATE. The 7,316 labelled rows (31.3% CONFIRMED) are split
  80/20 (stratified, `random_state=42`): 5,852 train / 1,464 test. The raw CSV is **not** committed; put it at
  `data/cumulative.csv` to run the research scripts.
- **Leakage control:** identifiers, `koi_score` and the four `koi_fpflag_*` vetting flags are dropped; columns with >40%
  missing values are dropped (36 numeric features remain).

## Results

### Detection (training notebook [`notebooks/Kepler_ExoPlanet_v2.ipynb`](notebooks/Kepler_ExoPlanet_v2.ipynb))

The notebook was run in Google Colab and is committed with its outputs. Its last analysis cell (live NASA archive check)
failed there with HTTP 400; that check is now done successfully by `research/prioritise_candidates.py`.

Repeated stratified CV on the training split, mean F1 by feature set:

| Model | All (36) | No error cols (16) | No non-physical (31) | Paper's 11 |
|---|---|---|---|---|
| LightGBM | 0.921 | 0.901 | 0.914 | 0.895 |
| XGBoost | 0.920 | 0.900 | 0.914 | 0.896 |
| Random Forest | 0.904 | 0.881 | 0.903 | 0.878 |
| MLP (paper-style) | 0.899 | 0.808 | 0.900 | 0.840 |
| Logistic Regression | 0.852 | 0.752 | 0.835 | 0.738 |

LightGBM was selected by cross-validated PR-AUC (0.9518 vs XGBoost 0.9501, LogReg 0.7355) and is deployed.

Hold-out test, 11 features (95% bootstrap intervals where computed):

| Model | F1 | PR-AUC | ROC-AUC |
|---|---|---|---|
| Logistic Regression | 0.744 | 0.732 | 0.894 |
| XGBoost | 0.899 [0.876, 0.919] | 0.959 | 0.980 |
| **LightGBM (deployed)** | **0.893 [0.869, 0.914]** | **0.958 [0.941, 0.971]** | **0.980 [0.973, 0.986]** |

LightGBM: recall 0.915, precision 0.871, confusion matrix [[943, 62], [39, 420]]; threshold 0.901 gives precision 0.950 at
recall 0.749. Most important features (permutation, drop in PR-AUC): `koi_model_snr` 0.141, `koi_prad` 0.099,
`koi_duration` 0.058. `research/make_examples.py` re-checks that the committed model bundle reproduces this confusion matrix.

### Replication of the base paper (`research/replicate_base_paper.py`)

Same 11 features, rows with missing values deleted (7,016 rows remain, which matches the paper's Table 2 count; its text
says 4,599), `MLPClassifier(300, 200, 200, 100, 100)`, ReLU, Adam, 3 runs (seeds 0-2). The paper does not state its split
ratio, seed or scaling, so a stratified 75/25 split (scikit-learn default) and raw features are used; a standardised
variant is also reported. Mean over 3 runs, threshold 0.5:

| Setting | ROC-AUC | Recall FP | Precision FP | Recall CONF. | Precision CONF. |
|---|---|---|---|---|---|
| Paper, Trial 15 (reported) | 0.91 | 0.95 | 0.83 | 0.60 | 0.85 |
| Re-run, raw features | 0.888 ± 0.006 | 0.85 | 0.86 | 0.69 | 0.71 |
| Re-run, standardised | 0.959 ± 0.010 | 0.92 | 0.93 | 0.86 | 0.85 |
| LightGBM, same splits | 0.978 ± 0.003 | 0.94 | 0.96 | 0.91 | 0.88 |

Across all 16 layer-size trials the faithful re-run gives ROC-AUC 0.872-0.917 (paper: 0.87-0.91). Per-class
precision and recall swing between runs (CONFIRMED recall 0.60, 0.56 and 0.90 for the three Trial 15 runs), as they do
between neighbouring trials in the paper's Table 3. The faithful re-run lands 0.02 below the reported 0.91; simply
standardising the inputs lifts the same network to 0.959, and LightGBM beats both on identical splits.

### Prioritisation of CANDIDATE signals (`research/prioritise_candidates.py`)

- All 2,248 CANDIDATE signals scored with the deployed model (never used in training); 881 have `p_planet` ≥ 0.5 and 455 ≥ 0.9.
- ESS = √(sim(radius) · sim(insolation)), sim(x) = 1 − |(x − 1)/(x + 1)|. 63 candidates lack radius or insolation and are
  dropped (not imputed), leaving 2,185. Mean ESS 0.203; 30 candidates reach ESS ≥ 0.8.
- `priority = p_planet × ESS`; 7 candidates form the Pareto front on (p_planet, ESS).
  Top three: K03034.01 (p 0.983, ESS 0.746), K04054.01 (0.964, 0.734), K02469.01 (0.991, 0.687).
- Sensitivity: Spearman 0.963 vs `p·ESS²` and 0.986 vs `p²·ESS`; top-20 overlap 18/20 and 17/20.
- Live NASA Exoplanet Archive check (astroquery, 22 Nov 2026): 591 of the candidates have been resolved since the Kaggle
  snapshot. Of the top 100 by `p_planet`, 74 are now CONFIRMED and 1 FALSE POSITIVE (all candidates: 19.7% confirmed,
  6.6% false positive; bottom 100: 0 confirmed, 28 false positive). On the 591 resolved candidates, `p_planet` gives
  ROC-AUC 0.937 and PR-AUC 0.974 (base rate 75.0% confirmed).

## Input features (11)

| Feature | Meaning | Unit |
|---|---|---|
| `koi_period` | Orbital period | days |
| `koi_impact` | Impact parameter | - |
| `koi_duration` | Transit duration | hours |
| `koi_depth` | Transit depth | ppm |
| `koi_model_snr` | Transit signal-to-noise ratio | - |
| `koi_prad` | Planet radius | Earth radii |
| `koi_teq` | Equilibrium temperature | K |
| `koi_insol` | Insolation flux | Earth flux |
| `koi_steff` | Star effective temperature | K |
| `koi_slogg` | Star surface gravity | log g |
| `koi_srad` | Star radius | solar radii |

Blank inputs are allowed; the saved imputer fills them with training medians.

## Project layout

```
backend/            Flask API (app.py), tests, model bundle, sample payload
frontend/           Angular site (src/app/pages/*, shared/starfield.ts, shared/data.service.ts)
frontend/public/data/  results.json, candidates.json, examples.json (generated by research/)
research/           replication, prioritisation, examples and results-bundle scripts; results/*.json
notebooks/          Kepler_ExoPlanet_v2.ipynb (Colab training notebook, with outputs)
data/               sample_inputs.csv (cumulative.csv is git-ignored)
docs/               evidence screenshots
.github/workflows/  ci.yml (tests + build), pages.yml (deploy to GitHub Pages)
```

## Install

Windows, Python 3.12, Node.js 24, npm 11.

```powershell
cd C:\ml_project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
cd frontend
npm ci
cd ..
```

The research scripts additionally use `scipy` (installed with scikit-learn) and `astroquery` for the NASA archive check
(`python -m pip install astroquery`); without it the script falls back to the archive's TAP API through `requests`.

## Run locally (two terminals)

```powershell
# Terminal 1: Flask API on http://127.0.0.1:5000
.\.venv\Scripts\Activate.ps1
python backend\app.py
```

```powershell
# Terminal 2: Angular on http://localhost:4200, proxying /api to Flask
cd frontend
npx ng serve --proxy-config proxy.conf.json
```

Open http://localhost:4200/#/classifier, load an example or type values, then **Run classifier**.

## Reproduce the research outputs

```powershell
python research\replicate_base_paper.py      # Part A, writes research/results/replication.json (slow: 16 trials x 3 runs)
python research\prioritise_candidates.py     # Part B, writes prioritisation.json and frontend/public/data/candidates.json
python research\make_examples.py             # gallery for the Pages classifier
python research\build_results.py             # frontend/public/data/results.json
```

## Test

```powershell
python -m pytest -q backend\tests
cd frontend; npm run build
```

## API

- `GET /health` returns status, feature count and task.
- `POST /predict` takes a JSON object with exactly the 11 feature names (numbers or `null`) and returns `prediction`
  ("CONFIRMED" or "FALSE POSITIVE"), `probabilities`, `confirmed_probability`, `classes` and a disclaimer.
  Missing or extra keys return 400.

## CI/CD

- `ci.yml` (every push and PR to `main`): installs pinned Python requirements and runs the backend tests, then
  `npm ci` and `npm run build`.
- `pages.yml` (every push to `main`): builds with `--base-href /<repo-name>/` and deploys `frontend/dist/frontend/browser`
  to GitHub Pages. Hash routing makes deep links work without a server-side fallback.

GitHub Pages is static, so live prediction is only available when Flask runs locally; the public classifier page
offers precomputed predictions instead.

## Limitations

- Uses Kepler catalogue values, not raw light curves; inherits the labels and selection effects of NASA vetting.
- CANDIDATE signals may differ in distribution from the labelled training rows.
- ESS is ESI-inspired (radius and insolation only). The published ESI (Schulze-Makuch et al., 2011) uses radius,
  density, escape velocity and surface temperature; a radius-and-flux variant is used by the Planetary Habitability
  Laboratory. ESS is not a habitability measure.
- `p_planet` is not calibrated; `p_planet × ESS` is a ranking score, not a probability.
- The NASA archive check is supportive, not independent: resolved candidates are not a random sample.
- The base paper does not state its split, seed or scaling; the replication documents the assumptions used.
- The web demo uses the paper's 11 features; the 36-feature model scores higher in cross-validation.
