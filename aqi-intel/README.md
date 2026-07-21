# AQI-Intel — Hyperlocal Predictive AQI Forecasting

Hackathon prototype for predicting Air Quality Index (AQI) at CAAQMS monitoring stations across India. Two deliverables: a FastAPI backend serving predictions, and a Colab training notebook.

## Quick Start

### 1. Install dependencies

```bash
cd aqi-intel
pip install -r requirements.txt
```

### 2. Set API keys

Copy the example env file and add your keys:

```bash
cp .env.example .env
# Edit .env with your keys:
#   DATA_GOV_API_KEY — from https://data.gov.in/user/register
#   OWM_API_KEY      — from https://openweathermap.org/api
```

### 3. Add training data

Download the [Kaggle "Air Quality Data in India"](https://www.kaggle.com/datasets/rohanrao/air-quality-data-in-india) dataset and place `city_day.csv` (or `station_day.csv`) in `data/raw/`.

### 4. Train the model (optional)

Open `notebooks/train_model.ipynb` in Google Colab or Jupyter, run all cells. Copy the exported `aqi_forecast.pkl` to `backend/models/`.

If you skip this step, the backend uses a persistence baseline (predicts AQI(t+h) = AQI(t)).

### 5. Run the server

```bash
# From the aqi-intel/ directory
uvicorn backend.main:app --reload
```

API docs at [http://localhost:8000/docs](http://localhost:8000/docs)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| GET | `/stations` | List of 20 CAAQMS stations with lat/lon |
| GET | `/forecast/{station_id}?horizon=24` | Predicted AQI (24/48/72h) |
| POST | `/ingest/refresh` | Manually trigger data refresh |

### Example

```bash
# Get 48-hour forecast for Delhi Anand Vihar
curl http://localhost:8000/forecast/delhi_anand_vihar?horizon=48
```

```json
{
  "station_id": "delhi_anand_vihar",
  "horizon_hours": 48,
  "aqi_predicted": 187.3,
  "aqi_lower": 147.3,
  "aqi_upper": 227.3,
  "confidence_band_rmse": 40.0,
  "generated_at": "2026-07-08T19:30:00",
  "model_type": "xgboost"
}
```

## Project Structure

```
aqi-intel/
├── backend/
│   ├── main.py          # FastAPI app (4 endpoints)
│   ├── ingest.py        # Data fetch + cleaning (Kaggle, CPCB, OWM)
│   ├── scheduler.py     # APScheduler hourly refresh
│   ├── model_utils.py   # Model loading + inference
│   └── models/          # Drop aqi_forecast.pkl here
├── notebooks/
│   └── train_model.ipynb  # Colab-ready training notebook
├── data/
│   └── raw/             # Kaggle CSV + live readings land here
├── requirements.txt
├── .env.example
└── README.md
```

## Architecture Notes

- **No database** — reads/writes CSVs and pickled models from disk
- **No auth** — prototype only
- **Single XGBoost model** with `horizon` as a feature (not 3 separate models)
- **DummyModel fallback** — if no `.pkl` is found, returns persistence baseline
- **Hourly scheduler** — APScheduler refreshes CPCB + OWM data every hour, appending to `data/raw/live_readings.csv`

## Feature Pipeline

Features must match between the training notebook and `model_utils.py`:

| Feature | Description |
|---------|-------------|
| `aqi_lag_1` | AQI at t-1 |
| `aqi_lag_24` | AQI at t-24 (daily: 7-day lag) |
| `aqi_lag_168` | AQI at t-168 (daily: 30-day lag) |
| `aqi_rolling_mean_6` | 6-period rolling mean |
| `aqi_rolling_std_6` | 6-period rolling std |
| `aqi_rolling_mean_24` | 24-period rolling mean |
| `aqi_rolling_std_24` | 24-period rolling std |
| `hour_sin`, `hour_cos` | Cyclic hour encoding |
| `dow_sin`, `dow_cos` | Cyclic day-of-week encoding |
| `temp`, `humidity` | Weather from OpenWeatherMap |
| `wind_speed`, `wind_deg` | Wind from OpenWeatherMap |
| `horizon` | Forecast horizon (24/48/72) |
| `station_*` | One-hot encoded station ID |
