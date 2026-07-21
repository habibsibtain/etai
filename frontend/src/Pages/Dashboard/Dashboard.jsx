import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import MetricCard from '../../Components/Cards/MetricCard';
import { useCity } from '../../context/CityContext';
import { fetchCityComparison } from '../../services/api';
import { Wind, Activity, AlertTriangle, TrendingUp, TrendingDown, Gauge, Users, BarChart3 } from 'lucide-react';
import './Dashboard.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
  Pune: [18.5204, 73.8567], Lucknow: [26.8467, 80.9462],
  Ahmedabad: [23.0225, 72.5714], Jaipur: [26.9124, 75.7873],
  Patna: [25.6093, 85.1376], Varanasi: [25.3176, 82.9739],
};

const getAqiClass = (aqi) => {
  if (!aqi) return '';
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'satisfactory';
  if (aqi <= 200) return 'moderate';
  if (aqi <= 300) return 'poor';
  return 'severe';
};

const Dashboard = () => {
  const { selectedCity, citySummary, cityStations, loading } = useCity();
  const [comparison, setComparison] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];

  useEffect(() => {
    async function loadComparison() {
      try {
        const data = await fetchCityComparison();
        if (data && data.cities) setComparison(data.cities);
      } catch (err) { console.warn('Comparison load failed:', err); }
    }
    loadComparison();
  }, []);

  const markers = cityStations
    .filter(s => s.lat && s.lon && s.aqi)
    .map(s => ({
      name: s.name || s.station_id,
      lat: s.lat,
      lng: s.lon,
      aqi: s.aqi || 0,
      pm25: s.pm25 || 0,
      lastUpdated: s.last_updated ? new Date(s.last_updated).toLocaleDateString() : 'N/A',
    }));

  const TrendIcon = citySummary?.trend_direction === 'up' ? TrendingUp : TrendingDown;
  const trendColor = citySummary?.trend_direction === 'up' ? 'danger' : 'success';

  return (
    <div className="dashboard-page">
      <div className="dashboard-top-bar">
        <div className="view-toggle">
          <button className={`toggle-btn ${!showCompare ? 'active' : ''}`} onClick={() => setShowCompare(false)}>
            City View
          </button>
          <button className={`toggle-btn ${showCompare ? 'active' : ''}`} onClick={() => setShowCompare(true)}>
            <BarChart3 size={14} /> Multi-City Compare
          </button>
        </div>
        <span className="station-count">
          {markers.length} Active Stations • {selectedCity}
        </span>
      </div>

      {!showCompare ? (
        <>
          <div className="map-section">
            <MapContainer center={center} zoom={11} key={selectedCity}>
              <MarkerLayer stations={markers} />
            </MapContainer>
            <div className="map-overlay-panel glass-overlay">
              <h4>Live AQI Network</h4>
              <p>{markers.length} Active Stations</p>
              <div className="aqi-legend">
                <span className="legend-dot good"></span><span>Good</span>
                <span className="legend-dot moderate"></span><span>Moderate</span>
                <span className="legend-dot poor"></span><span>Poor</span>
                <span className="legend-dot severe"></span><span>Severe</span>
              </div>
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-header">
              <h3>Current Analytics — {selectedCity}</h3>
              <span className="timestamp">{loading ? 'Loading...' : 'Live data from CAAQMS network'}</span>
            </div>
            <div className="metrics-grid">
              <MetricCard
                title="Avg AQI"
                value={citySummary?.avg_aqi ? Math.round(citySummary.avg_aqi) : '—'}
                trend={citySummary?.trend_direction}
                trendValue={citySummary?.trend_24h_pct ? `${Math.abs(citySummary.trend_24h_pct)}%` : ''}
                icon={Activity}
                colorClass={getAqiClass(citySummary?.avg_aqi) === 'good' ? 'success' : (getAqiClass(citySummary?.avg_aqi) === 'severe' ? 'danger' : 'warning')}
              />
              <MetricCard
                title="Highest AQI"
                value={citySummary?.max_aqi ? Math.round(citySummary.max_aqi) : '—'}
                icon={AlertTriangle}
                colorClass="danger"
              />
              <MetricCard
                title="Dominant"
                value={citySummary?.dominant_pollutant || '—'}
                unit={citySummary?.dominant_pollutant_value ? `${citySummary.dominant_pollutant_value} µg/m³` : ''}
                icon={TrendIcon}
                colorClass="purple"
              />
              <MetricCard
                title="Stations"
                value={citySummary?.active_stations || '—'}
                unit="active"
                icon={Gauge}
                colorClass="accent"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="compare-section">
          <div className="compare-header">
            <h3><BarChart3 size={20} /> Multi-City Air Quality Comparison</h3>
            <p>Ranked by average AQI (worst first)</p>
          </div>
          <div className="compare-table-wrapper">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>City</th>
                  <th>Avg AQI</th>
                  <th>Status</th>
                  <th>Dominant</th>
                  <th>24h Trend</th>
                  <th>Stations</th>
                  <th>Pop. (M)</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((city, i) => (
                  <tr key={city.city} className={city.city === selectedCity ? 'active-row' : ''}>
                    <td><span className={`rank-badge rank-${Math.min(i + 1, 3)}`}>{i + 1}</span></td>
                    <td className="fw-bold">{city.city}</td>
                    <td>
                      <span className={`aqi-badge ${getAqiClass(city.avg_aqi)}`}>
                        {Math.round(city.avg_aqi)}
                      </span>
                    </td>
                    <td><span className={`status-text ${getAqiClass(city.avg_aqi)}`}>{city.aqi_bucket}</span></td>
                    <td>{city.dominant_pollutant}</td>
                    <td className={city.trend_direction === 'up' ? 'trend-up' : 'trend-down'}>
                      {city.trend_direction === 'up' ? '↑' : '↓'} {Math.abs(city.trend_24h_pct)}%
                    </td>
                    <td>{city.active_stations}</td>
                    <td>{(city.population_thousands / 1000).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
