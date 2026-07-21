import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import LineChart from '../../Components/Charts/LineChart';
import MetricCard from '../../Components/Cards/MetricCard';
import { useCity } from '../../context/CityContext';
import { fetchForecast, fetchForecastTrend } from '../../services/api';
import { Wind, Clock, Settings2, BarChart2, Loader2 } from 'lucide-react';
import './Forecast.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
  Pune: [18.5204, 73.8567], Lucknow: [26.8467, 80.9462],
};

const Forecast = () => {
  const { selectedCity, cityStations } = useCity();
  const [horizon, setHorizon] = useState('24');
  const [pollutant, setPollutant] = useState('AQI');
  const [selectedStation, setSelectedStation] = useState('');
  const [forecast, setForecast] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Set first station when city changes
  useEffect(() => {
    if (cityStations.length > 0) {
      setSelectedStation(cityStations[0].station_id);
    }
  }, [cityStations]);

  // Fetch forecast when station or horizon changes
  useEffect(() => {
    if (!selectedStation) return;
    async function load() {
      setLoadingForecast(true);
      try {
        const [fc, trend] = await Promise.all([
          fetchForecast(selectedStation, parseInt(horizon)),
          fetchForecastTrend(selectedStation, 48),
        ]);
        if (fc) setForecast(fc);
        if (trend && trend.trend) {
          // Transform for chart — take last 12 historical + all forecast
          const historical = trend.trend.filter(t => t.type === 'historical').slice(-12);
          const forecasted = trend.trend.filter(t => t.type === 'forecast');
          const chartData = [
            ...historical.map((t, i) => ({
              time: `${-12 + i}h`,
              actual: t.actual,
              predicted: null,
            })),
            ...forecasted.map(t => ({
              time: t.time,
              actual: null,
              predicted: t.predicted,
            })),
          ];
          setTrendData(chartData);
        }
      } catch (err) { console.warn('Forecast load failed:', err); }
      finally { setLoadingForecast(false); }
    }
    load();
  }, [selectedStation, horizon]);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];

  const markers = cityStations
    .filter(s => s.lat && s.lon && s.aqi)
    .map(s => ({
      name: s.name || s.station_id, lat: s.lat, lng: s.lon,
      aqi: s.aqi || 0, pm25: s.pm25 || 0, lastUpdated: 'Live',
    }));

  return (
    <div className="forecast-page">
      <div className="forecast-top">
        <div className="forecast-controls panel-card">
          <div className="panel-header">
            <h3><Settings2 size={18} /> Forecast Parameters</h3>
          </div>
          
          <div className="control-group">
            <label>Station</label>
            <select 
              className="custom-select"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
            >
              {cityStations.map(s => (
                <option key={s.station_id} value={s.station_id}>
                  {s.name || s.station_id} — {s.city}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>Forecast Horizon</label>
            <div className="button-group">
              {['24', '48', '72'].map(h => (
                <button 
                  key={h}
                  className={`toggle-btn ${horizon === h ? 'active' : ''}`}
                  onClick={() => setHorizon(h)}
                >{h}h</button>
              ))}
            </div>
          </div>
          
          <div className="control-group">
            <label>Pollutant</label>
            <select className="custom-select" value={pollutant} onChange={(e) => setPollutant(e.target.value)}>
              <option value="AQI">Overall AQI</option>
              <option value="PM2.5">PM2.5</option>
              <option value="PM10">PM10</option>
              <option value="NO2">NO₂</option>
            </select>
          </div>

          <div className="model-explanation">
            <h4>AI Insights</h4>
            <div className="llm-box">
              {forecast ? (
                <>
                  <p>
                    <strong>{pollutant} is predicted at {forecast.aqi_predicted}</strong> for the next {horizon} hours 
                    ({forecast.aqi_lower} — {forecast.aqi_upper} confidence band).
                  </p>
                  <ul>
                    <li>Last known AQI: <strong>{forecast.last_known_aqi}</strong></li>
                    <li>24h average: <strong>{forecast.avg_24h}</strong></li>
                    <li>Model confidence: <strong>{forecast.confidence_pct}%</strong></li>
                    <li>Model type: {forecast.model_type}</li>
                  </ul>
                </>
              ) : (
                <p>Select a station to see AI-powered forecast insights.</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="forecast-map-wrapper panel-card">
          <MapContainer center={center} zoom={11} key={selectedCity}>
            <MarkerLayer stations={markers} />
          </MapContainer>
          <div className="map-timeline">
            <span className="time-label">Now</span>
            <input type="range" className="timeline-slider" min="0" max={horizon} defaultValue="0" />
            <span className="time-label">+{horizon}h</span>
          </div>
        </div>
      </div>

      <div className="forecast-bottom panel-card">
        <div className="panel-header">
          <h3><BarChart2 size={18} /> Prediction Trend — {forecast?.station_name || selectedStation}</h3>
        </div>
        <div className="bottom-content">
          <div className="chart-section">
            {loadingForecast ? (
              <div className="loading-state"><Loader2 size={24} className="spinner-icon" /> Loading forecast...</div>
            ) : (
              <LineChart 
                data={trendData.length > 0 ? trendData : [{time: '—', actual: 0, predicted: 0}]}
                xKey="time"
                lines={[
                  { dataKey: 'actual', name: 'Historical Actual', color: 'var(--color-success)' },
                  { dataKey: 'predicted', name: 'Predicted', color: 'var(--color-accent)' }
                ]}
                height={250}
              />
            )}
          </div>
          <div className="metrics-section">
            <MetricCard 
              title="Confidence" 
              value={forecast ? `${forecast.confidence_pct}%` : '—'} 
              icon={Clock} 
              colorClass="success"
            />
            <MetricCard 
              title="RMSE" 
              value={forecast ? forecast.confidence_band_rmse : '—'} 
              icon={Wind} 
              colorClass="warning"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forecast;
