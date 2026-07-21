/**
 * api.js — Central API service for AQI-Intel frontend.
 * 
 * All backend API calls go through here.
 * Base URL is configurable via environment variable.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || `API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn(`API unavailable at ${url}, using fallback data`);
      return null;
    }
    throw error;
  }
}

// ── City & Station APIs ─────────────────────────────────────────────────────

export async function fetchCities() {
  return apiFetch('/api/cities');
}

export async function fetchStations(city = null) {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  return apiFetch(`/api/stations${query}`);
}

// ── Dashboard APIs ──────────────────────────────────────────────────────────

export async function fetchDashboardSummary(city = 'Delhi') {
  return apiFetch(`/api/dashboard/summary?city=${encodeURIComponent(city)}`);
}

export async function fetchCityComparison() {
  return apiFetch('/api/dashboard/compare');
}

// ── Forecast APIs ───────────────────────────────────────────────────────────

export async function fetchForecast(stationId, horizon = 24) {
  return apiFetch(`/api/forecast/${stationId}?horizon=${horizon}`);
}

export async function fetchForecastTrend(stationId, hoursBack = 48) {
  return apiFetch(`/api/forecast/trend/${stationId}?hours_back=${hoursBack}`);
}

// ── Source Attribution APIs ─────────────────────────────────────────────────

export async function fetchAttribution(stationId) {
  return apiFetch(`/api/attribution/${stationId}`);
}

// ── Hotspot APIs ────────────────────────────────────────────────────────────

export async function fetchHotspots(city = 'Delhi', limit = 10) {
  return apiFetch(`/api/hotspots?city=${encodeURIComponent(city)}&limit=${limit}`);
}

// ── Enforcement APIs ────────────────────────────────────────────────────────

export async function fetchViolations(city = 'Delhi') {
  return apiFetch(`/api/enforcement/violations?city=${encodeURIComponent(city)}`);
}

// ── Health Risk APIs ────────────────────────────────────────────────────────

export async function fetchHealthRisk(city = 'Delhi') {
  return apiFetch(`/api/health/risk-summary?city=${encodeURIComponent(city)}`);
}

// ── Simulator APIs ──────────────────────────────────────────────────────────

export async function runSimulation(params) {
  return apiFetch('/api/simulator/run', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export default {
  fetchCities,
  fetchStations,
  fetchDashboardSummary,
  fetchCityComparison,
  fetchForecast,
  fetchForecastTrend,
  fetchAttribution,
  fetchHotspots,
  fetchViolations,
  fetchHealthRisk,
  runSimulation,
};
