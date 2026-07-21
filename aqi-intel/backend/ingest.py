"""
ingest.py — Data fetch + cleaning functions for AQI-Intel.

Three data sources:
  1. Kaggle historical CSV (city_day.csv) — base training set
  2. CPCB live readings via data.gov.in API
  3. OpenWeatherMap current weather per station lat/lon

All functions return DataFrames. No database, just CSV read/write.
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional, Dict

import pandas as pd
import numpy as np
import requests

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = BASE_DIR / "data" / "raw"
LIVE_CSV = DATA_RAW / "live_readings.csv"


# ── CAAQMS Station Metadata ─────────────────────────────────────────────────
# Top 20 major CAAQMS stations with lat/lon.
# station_id → {name, city, state, lat, lon}

STATIONS = {
    "delhi_anand_vihar": {
        "name": "Anand Vihar, DPCC",
        "city": "Delhi",
        "state": "Delhi",
        "lat": 28.6469,
        "lon": 77.3164,
    },
    "delhi_ito": {
        "name": "ITO, CPCB",
        "city": "Delhi",
        "state": "Delhi",
        "lat": 28.6289,
        "lon": 77.2411,
    },
    "delhi_rk_puram": {
        "name": "R K Puram, DPCC",
        "city": "Delhi",
        "state": "Delhi",
        "lat": 28.5635,
        "lon": 77.1868,
    },
    "delhi_ihbas": {
        "name": "IHBAS Dilshad Garden, CPCB",
        "city": "Delhi",
        "state": "Delhi",
        "lat": 28.6814,
        "lon": 77.3024,
    },
    "mumbai_bandra": {
        "name": "Bandra Kurla Complex, MPCB",
        "city": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0596,
        "lon": 72.8656,
    },
    "mumbai_worli": {
        "name": "Worli, MPCB",
        "city": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0176,
        "lon": 72.8152,
    },
    "kolkata_victoria": {
        "name": "Victoria Memorial, WBPCB",
        "city": "Kolkata",
        "state": "West Bengal",
        "lat": 22.5448,
        "lon": 88.3426,
    },
    "kolkata_jadavpur": {
        "name": "Jadavpur, WBPCB",
        "city": "Kolkata",
        "state": "West Bengal",
        "lat": 22.4966,
        "lon": 88.3712,
    },
    "bangalore_btm": {
        "name": "BTM Layout, KSPCB",
        "city": "Bengaluru",
        "state": "Karnataka",
        "lat": 12.9165,
        "lon": 77.6101,
    },
    "bangalore_peenya": {
        "name": "Peenya, KSPCB",
        "city": "Bengaluru",
        "state": "Karnataka",
        "lat": 13.0283,
        "lon": 77.5181,
    },
    "chennai_alandur": {
        "name": "Alandur Bus Depot, TNPCB",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "lat": 13.0032,
        "lon": 80.2034,
    },
    "chennai_manali": {
        "name": "Manali, TNPCB",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "lat": 13.1667,
        "lon": 80.2667,
    },
    "hyderabad_zoo_park": {
        "name": "Zoo Park, TSPCB",
        "city": "Hyderabad",
        "state": "Telangana",
        "lat": 17.3500,
        "lon": 78.4500,
    },
    "hyderabad_bollaram": {
        "name": "Bollaram Industrial Area, TSPCB",
        "city": "Hyderabad",
        "state": "Telangana",
        "lat": 17.5400,
        "lon": 78.3500,
    },
    "pune_shivajinagar": {
        "name": "Shivajinagar, MPCB",
        "city": "Pune",
        "state": "Maharashtra",
        "lat": 18.5314,
        "lon": 73.8446,
    },
    "lucknow_central_school": {
        "name": "Central School, UPPCB",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "lat": 26.8508,
        "lon": 80.9490,
    },
    "ahmedabad_maninagar": {
        "name": "Maninagar, GPCB",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "lat": 23.0000,
        "lon": 72.6000,
    },
    "jaipur_adarsh_nagar": {
        "name": "Adarsh Nagar, RSPCB",
        "city": "Jaipur",
        "state": "Rajasthan",
        "lat": 26.9260,
        "lon": 75.7870,
    },
    "patna_igsc": {
        "name": "IGSC Planetarium Complex, BSPCB",
        "city": "Patna",
        "state": "Bihar",
        "lat": 25.6093,
        "lon": 85.1376,
    },
    "varanasi_ardhali": {
        "name": "Ardhali Bazar, UPPCB",
        "city": "Varanasi",
        "state": "Uttar Pradesh",
        "lat": 25.3500,
        "lon": 83.0100,
    },
}

# Reverse lookup: city name → list of station_ids
CITY_TO_STATIONS = {}
for sid, meta in STATIONS.items():
    CITY_TO_STATIONS.setdefault(meta["city"], []).append(sid)


# ── 1. Kaggle Historical CSV ────────────────────────────────────────────────

def load_kaggle_historical(path: Optional[str] = None) -> pd.DataFrame:
    """
    Load the Kaggle 'city_day.csv' (or station_day.csv) from data/raw/.
    Returns a clean DataFrame with columns:
        date, city, pm25, pm10, no2, so2, co, o3, aqi
    """
    if path is None:
        # Try station_day first (more granular), fall back to city_day
        candidates = [DATA_RAW / "station_day.csv", DATA_RAW / "city_day.csv"]
        for p in candidates:
            if p.exists():
                path = str(p)
                break
        if path is None:
            logger.warning("No Kaggle CSV found in %s", DATA_RAW)
            return pd.DataFrame()

    logger.info("Loading historical data from %s", path)
    df = pd.read_csv(path, parse_dates=["Date"])

    # Normalize column names to snake_case
    col_map = {
        "Date": "date",
        "City": "city",
        "StationId": "station_id",
        "PM2.5": "pm25",
        "PM10": "pm10",
        "NO2": "no2",
        "SO2": "so2",
        "CO": "co",
        "O3": "o3",
        "AQI": "aqi",
        "AQI_Bucket": "aqi_bucket",
        # Extra pollutants (keep if present, not used as features)
        "NO": "no",
        "NOx": "nox",
        "NH3": "nh3",
        "Benzene": "benzene",
        "Toluene": "toluene",
        "Xylene": "xylene",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    # If no station_id column, synthesize from city
    if "station_id" not in df.columns:
        df["station_id"] = df["city"].str.lower().str.replace(r"\s+", "_", regex=True)

    # Keep only useful columns
    keep = ["date", "city", "station_id", "pm25", "pm10", "no2", "so2", "co", "o3", "aqi"]
    keep = [c for c in keep if c in df.columns]
    df = df[keep]

    # Sort by date
    df = df.sort_values("date").reset_index(drop=True)

    logger.info("Loaded %d rows, date range: %s to %s", len(df),
                df["date"].min(), df["date"].max())
    return df


# ── 2. Live CPCB Data (data.gov.in) ─────────────────────────────────────────

CPCB_RESOURCE_ID = "3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
CPCB_BASE_URL = "https://api.data.gov.in/resource"


def fetch_live_cpcb(api_key: Optional[str] = None) -> pd.DataFrame:
    """
    Fetch current AQI readings from CPCB via data.gov.in API.
    Returns DataFrame with columns: station, city, pollutant_id, pollutant_avg, last_update.
    Returns empty DataFrame on failure (never raises).
    """
    if api_key is None:
        api_key = os.getenv("DATA_GOV_API_KEY", "")
    if not api_key or api_key == "your_key_here":
        logger.warning("DATA_GOV_API_KEY not set — skipping CPCB fetch")
        return pd.DataFrame()

    url = f"{CPCB_BASE_URL}/{CPCB_RESOURCE_ID}"
    all_records = []
    offset = 0
    limit = 100

    try:
        while True:
            params = {
                "api-key": api_key,
                "format": "json",
                "offset": offset,
                "limit": limit,
            }
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            records = data.get("records", [])
            if not records:
                break
            all_records.extend(records)
            offset += limit

            # data.gov.in returns total count
            total = int(data.get("total", 0))
            if offset >= total:
                break

            time.sleep(0.5)  # be polite

    except Exception as e:
        logger.error("CPCB API fetch failed: %s", e)
        return pd.DataFrame()

    if not all_records:
        return pd.DataFrame()

    df = pd.DataFrame(all_records)

    # Normalize column names
    col_map = {
        "station": "station_name",
        "city": "city",
        "state": "state",
        "pollutant_id": "pollutant_id",
        "pollutant_avg": "pollutant_avg",
        "pollutant_min": "pollutant_min",
        "pollutant_max": "pollutant_max",
        "last_update": "last_update",
    }
    df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})

    # Convert pollutant values to numeric
    for col in ["pollutant_avg", "pollutant_min", "pollutant_max"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Parse timestamp
    if "last_update" in df.columns:
        df["last_update"] = pd.to_datetime(df["last_update"], errors="coerce")

    logger.info("Fetched %d CPCB records", len(df))
    return df


# ── 3. OpenWeatherMap Weather Data ───────────────────────────────────────────

OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


def fetch_weather_owm(
    stations: Optional[dict] = None,
    api_key: Optional[str] = None,
) -> pd.DataFrame:
    """
    Fetch current weather for each station's lat/lon from OpenWeatherMap.
    Returns DataFrame with columns:
        station_id, temp, humidity, wind_speed, wind_deg, fetched_at
    """
    if stations is None:
        stations = STATIONS
    if api_key is None:
        api_key = os.getenv("OWM_API_KEY", "")
    if not api_key or api_key == "your_key_here":
        logger.warning("OWM_API_KEY not set — skipping weather fetch")
        return pd.DataFrame()

    rows = []
    for station_id, meta in stations.items():
        try:
            resp = requests.get(
                OWM_BASE_URL,
                params={
                    "lat": meta["lat"],
                    "lon": meta["lon"],
                    "appid": api_key,
                    "units": "metric",
                },
                timeout=15,
            )
            resp.raise_for_status()
            w = resp.json()

            rows.append({
                "station_id": station_id,
                "temp": w.get("main", {}).get("temp"),
                "humidity": w.get("main", {}).get("humidity"),
                "wind_speed": w.get("wind", {}).get("speed"),
                "wind_deg": w.get("wind", {}).get("deg"),
                "fetched_at": pd.Timestamp.now(),
            })
        except Exception as e:
            logger.warning("OWM fetch failed for %s: %s", station_id, e)

        time.sleep(1.0)  # respect OWM free-tier rate limit (60 calls/min)

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    logger.info("Fetched weather for %d stations", len(df))
    return df


# ── 4. Clean and Merge ──────────────────────────────────────────────────────

def clean_and_merge(aqi_df: pd.DataFrame, weather_df: pd.DataFrame) -> pd.DataFrame:
    """
    Join AQI readings with weather data on station_id / nearest timestamp.
    Forward-fill gaps up to 3 hours, drop remaining NaNs in key columns.
    Returns a single tidy DataFrame.
    """
    if aqi_df.empty:
        logger.warning("AQI DataFrame is empty — nothing to merge")
        return aqi_df
    if weather_df.empty:
        logger.warning("Weather DataFrame is empty — returning AQI data only")
        # Add empty weather columns so downstream doesn't break
        for col in ["temp", "humidity", "wind_speed", "wind_deg"]:
            aqi_df[col] = np.nan
        return aqi_df

    # Merge on station_id
    merged = aqi_df.merge(weather_df, on="station_id", how="left")

    # Forward-fill weather within 3-hour gaps per station
    weather_cols = ["temp", "humidity", "wind_speed", "wind_deg"]
    if "date" in merged.columns:
        merged = merged.sort_values(["station_id", "date"])
        merged[weather_cols] = (
            merged.groupby("station_id")[weather_cols]
            .ffill(limit=3)
        )

    # Drop rows where AQI is missing (can't train/predict without target)
    if "aqi" in merged.columns:
        merged = merged.dropna(subset=["aqi"])

    logger.info("Merged dataset: %d rows, %d columns", *merged.shape)
    return merged


# ── 5. Refresh Orchestrator ──────────────────────────────────────────────────

def run_refresh() -> dict:
    """
    Run a full live data refresh cycle:
    1. Fetch CPCB live readings
    2. Fetch OWM weather
    3. Merge and append to live_readings.csv
    Returns summary dict.
    """
    logger.info("Starting data refresh cycle")

    cpcb_df = fetch_live_cpcb()
    weather_df = fetch_weather_owm()

    # Pivot CPCB data: one row per station with pollutant columns
    aqi_df = _pivot_cpcb(cpcb_df) if not cpcb_df.empty else pd.DataFrame()

    merged = clean_and_merge(aqi_df, weather_df)

    # Append to rolling CSV
    rows_added = 0
    if not merged.empty:
        write_header = not LIVE_CSV.exists()
        merged.to_csv(LIVE_CSV, mode="a", header=write_header, index=False)
        rows_added = len(merged)
        logger.info("Appended %d rows to %s", rows_added, LIVE_CSV)

    summary = {
        "cpcb_records": len(cpcb_df),
        "weather_records": len(weather_df),
        "merged_rows": len(merged),
        "rows_appended": rows_added,
        "live_csv": str(LIVE_CSV),
    }
    logger.info("Refresh complete: %s", summary)
    return summary


def _pivot_cpcb(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pivot CPCB long-format (one row per pollutant) to wide-format
    (one row per station with pollutant columns).
    """
    if df.empty or "pollutant_id" not in df.columns:
        return pd.DataFrame()

    # Map CPCB pollutant IDs to our column names
    pollutant_map = {
        "PM2.5": "pm25",
        "PM10": "pm10",
        "NO2": "no2",
        "SO2": "so2",
        "CO": "co",
        "OZONE": "o3",
        "O3": "o3",
    }

    df = df.copy()
    df["pollutant_key"] = df["pollutant_id"].map(pollutant_map)
    df = df.dropna(subset=["pollutant_key"])

    # Create station_id from city name
    if "city" in df.columns:
        df["station_id"] = df["city"].str.lower().str.replace(r"\s+", "_", regex=True)

    # Pivot
    id_cols = ["station_id", "city"]
    id_cols = [c for c in id_cols if c in df.columns]
    if "last_update" in df.columns:
        id_cols.append("last_update")

    try:
        pivoted = df.pivot_table(
            index=id_cols,
            columns="pollutant_key",
            values="pollutant_avg",
            aggfunc="first",
        ).reset_index()
        pivoted.columns.name = None

        # Rename last_update to date for consistency
        if "last_update" in pivoted.columns:
            pivoted = pivoted.rename(columns={"last_update": "date"})

        return pivoted
    except Exception as e:
        logger.error("CPCB pivot failed: %s", e)
        return pd.DataFrame()
