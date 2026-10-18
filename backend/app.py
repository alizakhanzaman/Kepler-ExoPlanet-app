from pathlib import Path
import math
import joblib
import pandas as pd
from flask import Flask, jsonify, request

BASE = Path(__file__).resolve().parent
BUNDLE = joblib.load(BASE / "models/model_bundle.joblib")
MODEL = BUNDLE["pipeline"]            # imputer -> scaler -> XGBoost
FEATURES = BUNDLE["features"]         # 36 numeric inputs, exact order
TASK = BUNDLE.get("task", "classification")
CLASSES = BUNDLE.get("classes", ["FALSE POSITIVE", "CONFIRMED"])

app = Flask(__name__)


@app.get("/health")
def health():
    return jsonify(status="ok", features=len(FEATURES), task=TASK)


@app.post("/predict")
def predict():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="Expected a JSON object"), 400

    missing = [f for f in FEATURES if f not in data]
    extra = [f for f in data if f not in FEATURES]
    if missing or extra:
        return jsonify(error="Input schema mismatch",
                       missing=missing, extra=extra), 400

    # null / blank values are allowed: the saved imputer fills them with
    # the training-set medians (same as in the notebook).
    row = []
    for f in FEATURES:
        v = data[f]
        if v is None:
            row.append(float("nan"))
            continue
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            return jsonify(error="Invalid input",
                           detail=f"{f} must be a finite number or null"), 400
        row.append(float(v))
    frame = pd.DataFrame([row], columns=FEATURES)

    try:
        pred = int(MODEL.predict(frame)[0])
        proba = MODEL.predict_proba(frame)[0].tolist()
        return jsonify(
            prediction=CLASSES[pred],
            task=TASK,
            probabilities=proba,
            confirmed_probability=proba[1],
            classes=CLASSES,
            disclaimer="Research/teaching prototype only. Not a validated "
                       "astronomical classification.",
        )
    except (ValueError, TypeError) as exc:
        return jsonify(error="Invalid input", detail=str(exc)), 400
    except Exception:
        app.logger.exception("Prediction failed")
        return jsonify(error="Prediction processing failed"), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
