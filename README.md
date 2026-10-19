# Kepler Exoplanet Classifier

A full-stack machine-learning project: a LightGBM model that classifies Kepler
Object of Interest (KOI) transit signals as **CONFIRMED planet** or **FALSE POSITIVE**,
served by a Flask REST API, used through an Angular form, and checked by GitHub Actions CI.

- **Repository:** https://github.com/alizakhanzaman/Kepler-ExoPlanet-app
- **Static demo (form only):** https://alizakhanzaman.github.io/Kepler-ExoPlanet-app/

> **Research and teaching prototype.** Not a validated astronomical classification.
> Do not use it to make scientific claims about individual candidates.

## Problem and data

- **Task:** binary classification of Kepler transit signals (1 = CONFIRMED, 0 = FALSE POSITIVE).
- **Dataset:** Kaggle "Kepler Exoplanet Search Results" (`nasa/kepler-exoplanet-search-results`, file `cumulative.csv`),
  9,564 KOIs. Rows labelled CANDIDATE are excluded, leaving 7,316 rows (31.3% CONFIRMED).
  The raw CSV is **not** committed; download it from Kaggle to retrain.
- **Leakage control:** identifiers, `koi_score` and the four `koi_fpflag_*` vetting flags are dropped before training.

## Model provenance

- Trained in Google Colab with `notebooks/Kepler_ExoPlanet_v2.ipynb` (stratified 80/20 split, `random_state=42`;
  5,852 train / 1,464 test rows).
- Candidates: Logistic Regression, XGBoost, LightGBM, tuned with randomized search and 5-fold stratified CV
  (metric: PR-AUC). **LightGBM was selected by cross-validation** (CV PR-AUC 0.952).
- Saved pipeline: **median imputer -> StandardScaler -> LightGBM**, stored in
  `backend/models/model_bundle.joblib` together with the ordered feature list. Raw inputs go straight in.
- Training environment: Python 3.13 (Colab), scikit-learn 1.6.1, LightGBM 4.6.0, NumPy 2.1.3, pandas 2.2.3, joblib 1.6.0.

### Hold-out results (1,464 test rows, 95% bootstrap intervals)

| Model | F1 | PR-AUC | ROC-AUC | Recall | Precision |
|---|---|---|---|---|---|
| Logistic Regression | 0.744 | 0.732 | 0.894 | 0.898 | 0.636 |
| XGBoost | 0.899 | 0.959 | 0.980 | 0.924 | 0.876 |
| **LightGBM (deployed)** | 0.893 | 0.958 | 0.980 | 0.915 | 0.871 |

XGBoost and LightGBM are statistically indistinguishable on this split. LightGBM confusion matrix:
943 true negatives, 62 false positives, 39 false negatives, 420 true positives.

## Input features (11)

The deployed model uses the 11 physical measurements below. Error columns and non-physical columns
(sky position, Kepler magnitude, TCE number, reference epoch) were removed.

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
backend/    Flask API (app.py), tests, model bundle, sample payload
frontend/   Angular app (feature form, live transit preview, API call via proxy)
data/       sample_inputs.csv (one non-sensitive example row)
notebooks/  Colab training notebook
docs/       evidence, environment record, troubleshooting log
.github/workflows/  ci.yml (tests + build), pages.yml (static deploy)
```

## Versions used locally

Windows, Python 3.12.10, Node.js 24.15.0, npm 11.12.1, Git 2.53.0, Angular 22.

## Install

```powershell
cd C:\ml_project
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
cd frontend
npm ci
cd ..
```

## Run locally (two terminals)

Terminal 1, Flask API on http://127.0.0.1:5000:

```powershell
cd C:\ml_project
.\.venv\Scripts\Activate.ps1
python backend\app.py
```

Terminal 2, Angular on http://localhost:4200 (proxies `/api` to Flask):

```powershell
cd C:\ml_project\frontend
ng serve --open --proxy-config proxy.conf.json
```

Open http://localhost:4200, click **Load a sample planet**, then **Classify signal**.

## Test

```powershell
python backend\make_payload.py
python backend\test_pipeline.py
python -m pytest -q backend\tests
curl.exe --noproxy "*" -i http://127.0.0.1:5000/health
curl.exe --noproxy "*" -i -X POST "http://127.0.0.1:5000/predict" -H "Content-Type: application/json" --data-binary "@backend/test_payload.json"
```

## API

- `GET /health` returns status, feature count and task.
- `POST /predict` takes a JSON object with exactly the 11 feature names (numbers or `null`) and returns
  `prediction`, `probabilities`, `confirmed_probability` and a disclaimer. Missing or extra keys return 400.

## Continuous integration and deployment

- `ci.yml` runs on every push: installs pinned Python dependencies and runs all backend tests
  (including model inference, because the small model bundle is committed), then builds the Angular app
  and uploads the build as an artifact.
- `pages.yml` builds Angular and publishes it to GitHub Pages.

## Deployment limitations

GitHub Pages hosts static files only. The public page shows the form and the transit preview, but
**predictions are disabled** because Flask and the model cannot run there. Live public predictions
would need a separately hosted, secured HTTPS backend. No secrets, virtual environments or raw datasets are committed.

## Limitations and ethics

- The model reflects Kepler's labelled data and its selection effects; CANDIDATE signals were never seen in training.
- At the default 0.5 threshold the model still makes errors in both directions (see the confusion matrix).
- Treat output as a ranking aid for study, not as evidence that an object is or is not a planet.
