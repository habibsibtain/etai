"""
main.py — FastAPI app for AQI-Intel.

Comprehensive API powering the Urban Air Quality Intelligence platform.
"""

import json
import logging
import math
from contextlib import asynccontextmanager
from typing import Optional, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class SafeJSONResponse(JSONResponse):
    """JSONResponse that handles NaN and Inf values gracefully."""
    
    def render(self, content: Any) -> bytes:
        sanitized = _sanitize(content)
        return json.dumps(
            sanitized,
            ensure_ascii=False,
            allow_nan=False,
            default=str,
            separators=(",", ":"),
        ).encode("utf-8")


def _sanitize(obj):
    """Recursively replace NaN/Inf with None in nested structures."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    return obj

from backend.data_service import data_service
from backend.source_attribution import compute_source_attribution
from backend.enforcement_engine import generate_enforcement_recommendations
from backend.health_risk import compute_health_risk
from backend.simulator import run_simulation
from backend.scheduler import start_scheduler, stop_scheduler

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


# ── Request Models ───────────────────────────────────────────────────────────

class SimulatorRequest(BaseModel):
    city: str = "Delhi"
    traffic_reduction: float = 0
    industry_shutdown: float = 0
    construction_halt: float = 0
    simulation_days: int = 7


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load data + start scheduler. Shutdown: stop scheduler."""
    logger.info("Starting AQI-Intel backend")
    data_service.load()
    start_scheduler()
    yield
    logger.info("Shutting down AQI-Intel backend")
    stop_scheduler()


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AQI-Intel",
    description="AI-Powered Urban Air Quality Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=SafeJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],
     allow_origins=[
        "http://localhost:5173",
        "https://etai-nine.vercel.app/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "AQI-Intel Backend",
        "docs": "/docs"
    }
    
# ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Basic liveness check."""
    from datetime import datetime
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "data_loaded": data_service._loaded,
    }

# ── City & Station Endpoints ────────────────────────────────────────────────

@app.get("/api/cities")
async def list_cities():
    """Return list of available cities."""
    cities = data_service.get_cities()
    return {"cities": cities, "count": len(cities)}


@app.get("/api/stations")
async def list_stations(city: Optional[str] = Query(None, description="Filter by city")):
    """Return stations, optionally filtered by city."""
    if city:
        stations = data_service.get_stations_for_city(city)
    else:
        stations = data_service.get_all_stations_with_data()
    return {"stations": stations, "count": len(stations)}


# ── Dashboard Endpoints ─────────────────────────────────────────────────────

@app.get("/api/dashboard/summary")
async def dashboard_summary(city: str = Query("Delhi", description="City name")):
    """Return aggregated city-level AQI summary for dashboard."""
    summary = data_service.get_city_summary(city)
    stations = data_service.get_stations_for_city(city)
    return {
        "summary": summary,
        "stations": stations,
    }


@app.get("/api/dashboard/compare")
async def dashboard_compare():
    """Return multi-city comparison data."""
    comparison = data_service.get_city_comparison()
    return {"cities": comparison, "count": len(comparison)}


# ── Forecast Endpoints ──────────────────────────────────────────────────────

@app.get("/api/forecast/{station_id}")
async def get_forecast(
    station_id: str,
    horizon: int = Query(default=24, description="Forecast horizon: 24, 48, or 72 hours"),
):
    """Return predicted AQI for a station at the given horizon."""
    valid_horizons = [24, 48, 72]
    if horizon not in valid_horizons:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid horizon: {horizon}. Must be one of {valid_horizons}.",
        )

    result = data_service.get_forecast(station_id, horizon)
    return result


@app.get("/api/forecast/trend/{station_id}")
async def get_forecast_trend(
    station_id: str,
    hours_back: int = Query(default=48, description="Hours of historical data"),
):
    """Return historical + predicted AQI time series for charting."""
    trend = data_service.get_forecast_trend(station_id, hours_back)
    return {"station_id": station_id, "trend": trend, "count": len(trend)}


# ── Source Attribution Endpoints ─────────────────────────────────────────────

@app.get("/api/attribution/{station_id}")
async def get_attribution(station_id: str):
    """Return pollution source attribution for a station."""
    meta = data_service.station_meta.get(station_id)
    if not meta:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown station: {station_id}. Use GET /api/stations to see valid IDs.",
        )

    # Get latest readings
    latest = data_service._get_latest_reading(station_id)

    result = compute_source_attribution(
        station_id=station_id,
        zone_type=meta.get("zone_type", "mixed"),
        aqi=latest.get("aqi"),
        pm25=latest.get("pm25"),
    )
    result["station_name"] = meta.get("name", station_id)
    result["city"] = meta.get("city", "Unknown")
    return result


# ── Hotspot Detection Endpoints ─────────────────────────────────────────────

@app.get("/api/hotspots")
async def get_hotspots(
    city: str = Query("Delhi", description="City name"),
    limit: int = Query(10, description="Max number of hotspots"),
):
    """Return ranked pollution hotspots for a city."""
    stations = data_service.get_stations_for_city(city)

    # Filter to stations with valid AQI and sort by AQI descending
    hotspots = [s for s in stations if s.get("aqi") is not None]
    hotspots.sort(key=lambda x: x.get("aqi", 0), reverse=True)
    hotspots = hotspots[:limit]

    # Enrich with attribution data and ranking
    enriched = []
    for i, station in enumerate(hotspots):
        sid = station["station_id"]
        meta = data_service.station_meta.get(sid, {})
        aqi = station.get("aqi", 0)

        # Compute primary driver
        attribution = compute_source_attribution(
            station_id=sid,
            zone_type=meta.get("zone_type", "mixed"),
            aqi=aqi,
            pm25=station.get("pm25"),
        )

        pop_affected = _estimate_affected_pop(city, aqi)

        enriched.append({
            "rank": i + 1,
            "station_id": sid,
            "name": station.get("name", sid),
            "city": city,
            "lat": station.get("lat", 0),
            "lon": station.get("lon", 0),
            "aqi": round(aqi, 1),
            "pm25": station.get("pm25"),
            "aqi_bucket": station.get("aqi_bucket", ""),
            "primary_driver": attribution["top_source"],
            "primary_driver_pct": attribution["top_source_pct"],
            "source_breakdown": attribution["source_breakdown"][:3],
            "population_affected": pop_affected,
            "trend_24h": f"+{max(1, int(aqi * 0.05))}%",
            "confidence": attribution["overall_confidence"],
        })

    return {
        "city": city,
        "hotspots": enriched,
        "count": len(enriched),
    }


# ── Enforcement Endpoints ───────────────────────────────────────────────────

@app.get("/api/enforcement/violations")
async def get_violations(city: str = Query("Delhi", description="City name")):
    """Return prioritized enforcement recommendations."""
    result = generate_enforcement_recommendations(city)
    return result


# ── Health Risk Endpoints ───────────────────────────────────────────────────

@app.get("/api/health/risk-summary")
async def get_health_risk(city: str = Query("Delhi", description="City name")):
    """Return comprehensive health risk assessment."""
    result = compute_health_risk(city)
    return result


# ── Scenario Simulator Endpoints ────────────────────────────────────────────

@app.post("/api/simulator/run")
async def run_scenario(request: SimulatorRequest):
    """Run a policy scenario simulation."""
    result = run_simulation(
        city=request.city,
        traffic_reduction=request.traffic_reduction,
        industry_shutdown=request.industry_shutdown,
        construction_halt=request.construction_halt,
        simulation_days=request.simulation_days,
    )
    return result


# ── Legacy Endpoints (keep backward compatibility) ──────────────────────────

@app.get("/stations")
async def legacy_stations():
    """Legacy station list endpoint."""
    stations = data_service.get_all_stations_with_data()
    return {"stations": stations, "count": len(stations)}


@app.post("/ingest/refresh")
async def trigger_refresh():
    """Manually trigger a data refresh (for demo purposes)."""
    from backend.ingest import run_refresh
    try:
        result = run_refresh()
        return {"status": "ok", "summary": result}
    except Exception as e:
        logger.error("Manual refresh failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


# ── Utility ──────────────────────────────────────────────────────────────────

def _estimate_affected_pop(city: str, aqi: float) -> str:
    """Estimate affected population string based on city and AQI."""
    from backend.data_service import CITY_POPULATIONS
    total_pop = CITY_POPULATIONS.get(city, 1000) * 1000
    # Assume each station covers ~1/20th of city population
    ward_pop = total_pop // 20
    # Higher AQI affects more people (assume radius of impact grows)
    factor = min(1.0, aqi / 200)
    affected = int(ward_pop * factor)
    if affected > 100_000:
        return f"{affected // 1000}k"
    elif affected > 1000:
        return f"{affected // 1000}k"
    return str(affected)
