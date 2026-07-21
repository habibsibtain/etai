"""
model_utils.py — Model loading and inference for AQI-Intel.

Loads the pickled XGBoost model at startup (once).
Falls back to a DummyModel (persistence baseline) if no .pkl found.

Feature vector must match the training notebook exactly:
  - Lag features: aqi_lag_1, aqi_lag_24, aqi_lag_168
  - Rolling stats: aqi_rolling_mean_6, aqi_rolling_std_6, aqi_rolling_mean_24, aqi_rolling_std_24
  - Cyclic time: hour_sin, hour_cos, dow_sin, dow_cos
  - Weather: temp, humidity, wind_speed, wind_deg
  - Horizon: horizon
  - Station one-hot: station_<id> columns
"""

import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = Path(__file__).resolve().parent / "models"


# ── Station list (imported from ingest to avoid duplication) ─────────────────

def _get_stations():
    """Lazy import to avoid circular dependency."""
    from backend.ingest import STATIONS
    return STATIONS


# ── Dummy Model (persistence baseline) ──────────────────────────────────────

class DummyModel:
    """
    Fallback when no trained model is available.
    Returns the last known AQI value (persistence baseline).
    """

    def __init__(self):
        self.feature_names_ = None
        self.is_dummy = True

    def predict(self, X):
        """Return the aqi_lag_1 column value if present, else 100 (neutral AQI)."""
        if isinstance(X, pd.DataFrame) and "aqi_lag_1" in X.columns:
            return X["aqi_lag_1"].values
        elif isinstance(X, np.ndarray) and X.shape[1] > 0:
            return X[:, 0]  # first feature assumed to be aqi_lag_1
        return np.array([100.0])


# ── Model Store ──────────────────────────────────────────────────────────────

class ModelStore:
    """
    Thin wrapper that holds the loaded model and provides prediction.
    Single model with horizon as a feature (not separate models per horizon).
    """

    def __init__(self):
        self.model = None
        self.feature_names = None
        self.is_dummy = True
        self.training_rmse = {24: 30.0, 48: 40.0, 72: 50.0}  # defaults for confidence band

    def load(self, model_dir: Optional[Path] = None):
        """Load a pickled model from the models directory."""
        if model_dir is None:
            model_dir = MODELS_DIR

        pkl_files = sorted(model_dir.glob("*.pkl"))

        if not pkl_files:
            logger.warning("No .pkl files found in %s — using DummyModel", model_dir)
            self.model = DummyModel()
            self.is_dummy = True
            return

        # Load the first (or only) pkl file
        pkl_path = pkl_files[0]
        logger.info("Loading model from %s", pkl_path)

        loaded = joblib.load(pkl_path)

        # Handle different serialization formats
        if isinstance(loaded, dict):
            # If we serialized a dict with model + metadata
            self.model = loaded.get("model", loaded)
            self.feature_names = loaded.get("feature_names", None)
            rmse = loaded.get("training_rmse", {})
            if rmse:
                self.training_rmse = rmse
        else:
            self.model = loaded
            # Try to get feature names from the model itself
            if hasattr(self.model, "get_booster"):
                try:
                    self.feature_names = self.model.get_booster().feature_names
                except Exception:
                    pass
            elif hasattr(self.model, "feature_names_in_"):
                self.feature_names = list(self.model.feature_names_in_)

        self.is_dummy = False
        logger.info("Model loaded: %s features, dummy=%s",
                     len(self.feature_names) if self.feature_names else "unknown",
                     self.is_dummy)

    def predict_aqi(self, features: pd.DataFrame) -> np.ndarray:
        """Run inference. features must be a single-row DataFrame."""
        if self.model is None:
            raise RuntimeError("Model not loaded — call .load() first")
        return self.model.predict(features)


# ── Feature Building ────────────────────────────────────────────────────────

# The canonical feature order — must match training notebook
WEATHER_FEATURES = ["temp", "humidity", "wind_speed", "wind_deg"]
LAG_FEATURES = ["aqi_lag_1", "aqi_lag_24", "aqi_lag_168"]
ROLLING_FEATURES = [
    "aqi_rolling_mean_6", "aqi_rolling_std_6",
    "aqi_rolling_mean_24", "aqi_rolling_std_24",
]
TIME_FEATURES = ["hour_sin", "hour_cos", "dow_sin", "dow_cos"]


def build_features(
    station_id: str,
    horizon: int,
    live_data: Optional[pd.DataFrame] = None,
    now: Optional[datetime] = None,
) -> pd.DataFrame:
    """
    Build the feature vector for a single prediction.
    Matches the training notebook's feature engineering exactly.

    Returns a single-row DataFrame ready for model.predict().
    """
    if now is None:
        now = datetime.now()

    stations = _get_stations()
    all_station_ids = sorted(stations.keys())

    # ── Get recent data for this station ────────────────────────────────────
    # Try to read from live_readings.csv if no live_data provided
    if live_data is None:
        live_csv = BASE_DIR / "data" / "raw" / "live_readings.csv"
        if live_csv.exists():
            try:
                live_data = pd.read_csv(live_csv, parse_dates=["date"])
                live_data = live_data[live_data["station_id"] == station_id]
            except Exception:
                live_data = pd.DataFrame()
        else:
            live_data = pd.DataFrame()

    # Also try loading historical data for this station's city
    if live_data.empty:
        from backend.ingest import load_kaggle_historical
        hist = load_kaggle_historical()
        if not hist.empty:
            city = stations.get(station_id, {}).get("city", "")
            city_id = city.lower().replace(" ", "_")
            live_data = hist[hist["station_id"] == city_id]

    # ── Extract lag values ──────────────────────────────────────────────────
    # Default to moderate AQI if no data available
    default_aqi = 150.0

    if not live_data.empty and "aqi" in live_data.columns and "date" in live_data.columns:
        live_data = live_data.sort_values("date")
        aqi_series = live_data["aqi"].dropna()

        last_aqi = aqi_series.iloc[-1] if len(aqi_series) > 0 else default_aqi
        aqi_lag_1 = last_aqi
        aqi_lag_24 = aqi_series.iloc[-24] if len(aqi_series) >= 24 else last_aqi
        aqi_lag_168 = aqi_series.iloc[-168] if len(aqi_series) >= 168 else last_aqi

        # Rolling stats
        aqi_rm6 = aqi_series.tail(6).mean() if len(aqi_series) >= 6 else last_aqi
        aqi_rs6 = aqi_series.tail(6).std() if len(aqi_series) >= 6 else 0.0
        aqi_rm24 = aqi_series.tail(24).mean() if len(aqi_series) >= 24 else last_aqi
        aqi_rs24 = aqi_series.tail(24).std() if len(aqi_series) >= 24 else 0.0

        # Weather from most recent row
        last_row = live_data.iloc[-1]
        temp = last_row.get("temp", 30.0) if "temp" in live_data.columns else 30.0
        humidity = last_row.get("humidity", 60.0) if "humidity" in live_data.columns else 60.0
        wind_speed = last_row.get("wind_speed", 3.0) if "wind_speed" in live_data.columns else 3.0
        wind_deg = last_row.get("wind_deg", 180.0) if "wind_deg" in live_data.columns else 180.0
    else:
        aqi_lag_1 = default_aqi
        aqi_lag_24 = default_aqi
        aqi_lag_168 = default_aqi
        aqi_rm6 = default_aqi
        aqi_rs6 = 0.0
        aqi_rm24 = default_aqi
        aqi_rs24 = 0.0
        temp = 30.0
        humidity = 60.0
        wind_speed = 3.0
        wind_deg = 180.0

    # ── Cyclic time encoding ────────────────────────────────────────────────
    hour = now.hour
    dow = now.weekday()
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    dow_sin = np.sin(2 * np.pi * dow / 7)
    dow_cos = np.cos(2 * np.pi * dow / 7)

    # ── Build feature dict ──────────────────────────────────────────────────
    feat = {
        "aqi_lag_1": aqi_lag_1,
        "aqi_lag_24": aqi_lag_24,
        "aqi_lag_168": aqi_lag_168,
        "aqi_rolling_mean_6": aqi_rm6,
        "aqi_rolling_std_6": aqi_rs6,
        "aqi_rolling_mean_24": aqi_rm24,
        "aqi_rolling_std_24": aqi_rs24,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "dow_sin": dow_sin,
        "dow_cos": dow_cos,
        "temp": temp,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "wind_deg": wind_deg,
        "horizon": horizon,
    }

    # Station one-hot encoding
    for sid in all_station_ids:
        feat[f"station_{sid}"] = 1.0 if sid == station_id else 0.0

    return pd.DataFrame([feat])


# ── Main Predict Function ───────────────────────────────────────────────────

def predict(
    station_id: str,
    horizon: int,
    model_store: ModelStore,
) -> dict:
    """
    Build features and run inference for a single station/horizon.
    Returns a dict with the prediction result.
    """
    now = datetime.now()
    features = build_features(station_id, horizon, now=now)

    # If the model has known feature names, reorder/align columns
    if model_store.feature_names is not None:
        # Add any missing columns as 0, drop extras
        for col in model_store.feature_names:
            if col not in features.columns:
                features[col] = 0.0
        features = features[model_store.feature_names]

    pred = model_store.predict_aqi(features)
    predicted_aqi = float(pred[0])

    # Confidence band (±1 training RMSE)
    rmse = model_store.training_rmse.get(horizon, 40.0)

    return {
        "station_id": station_id,
        "horizon_hours": horizon,
        "aqi_predicted": round(predicted_aqi, 1),
        "aqi_lower": round(max(0, predicted_aqi - rmse), 1),
        "aqi_upper": round(predicted_aqi + rmse, 1),
        "confidence_band_rmse": round(rmse, 1),
        "generated_at": now.isoformat(),
        "model_type": "dummy_persistence" if model_store.is_dummy else "xgboost",
    }
