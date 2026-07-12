import React, { useState } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import LineChart from '../../Components/Charts/LineChart';
import MetricCard from '../../Components/Cards/MetricCard';
import { Wind, Clock, Settings2, BarChart2 } from 'lucide-react';
import './Forecast.css';

const forecastData = [
  { time: '00:00', actual: 120, predicted: 125, confidence: [110, 140] },
  { time: '04:00', actual: 110, predicted: 115, confidence: [100, 130] },
  { time: '08:00', actual: 145, predicted: 150, confidence: [135, 165] },
  { time: '12:00', actual: null, predicted: 165, confidence: [145, 185] },
  { time: '16:00', actual: null, predicted: 180, confidence: [155, 205] },
  { time: '20:00', actual: null, predicted: 150, confidence: [130, 170] },
  { time: '24:00', actual: null, predicted: 135, confidence: [115, 155] },
];

const Forecast = () => {
  const [horizon, setHorizon] = useState('24h');
  const [pollutant, setPollutant] = useState('AQI');

  return (
    <div className="forecast-page">
      
      <div className="forecast-top">
        <div className="forecast-controls panel-card">
          <div className="panel-header">
            <h3><Settings2 size={18} /> Forecast Parameters</h3>
          </div>
          
          <div className="control-group">
            <label>Forecast Horizon</label>
            <div className="button-group">
              <button 
                className={`toggle-btn ${horizon === '24h' ? 'active' : ''}`}
                onClick={() => setHorizon('24h')}
              >24h</button>
              <button 
                className={`toggle-btn ${horizon === '48h' ? 'active' : ''}`}
                onClick={() => setHorizon('48h')}
              >48h</button>
              <button 
                className={`toggle-btn ${horizon === '72h' ? 'active' : ''}`}
                onClick={() => setHorizon('72h')}
              >72h</button>
            </div>
          </div>
          
          <div className="control-group">
            <label>Pollutant</label>
            <select 
              className="custom-select"
              value={pollutant}
              onChange={(e) => setPollutant(e.target.value)}
            >
              <option value="AQI">Overall AQI</option>
              <option value="PM2.5">PM2.5</option>
              <option value="PM10">PM10</option>
              <option value="NO2">NO2</option>
            </select>
          </div>

          <div className="model-explanation">
            <h4>AI Insights</h4>
            <div className="llm-box">
              <p>
                <strong>{pollutant} is predicted to increase</strong> over the next 12 hours due to:
              </p>
              <ul>
                <li>High traffic congestion in central zones</li>
                <li>Low wind speeds preventing dispersion</li>
                <li>Active construction in the north-west corridor</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="forecast-map-wrapper panel-card">
          <MapContainer center={[17.385, 78.486]} zoom={10} />
          <div className="map-timeline">
            <span className="time-label">Now</span>
            <input type="range" className="timeline-slider" min="0" max="24" defaultValue="0" />
            <span className="time-label">+24h</span>
          </div>
        </div>
      </div>

      <div className="forecast-bottom panel-card">
        <div className="panel-header">
          <h3><BarChart2 size={18} /> Prediction Trend vs Actual</h3>
        </div>
        <div className="bottom-content">
          <div className="chart-section">
            <LineChart 
              data={forecastData} 
              xKey="time"
              lines={[
                { dataKey: 'actual', name: 'Historical Actual', color: 'var(--color-success)' },
                { dataKey: 'predicted', name: 'Predicted', color: 'var(--color-accent)' }
              ]}
              height={250}
            />
          </div>
          <div className="metrics-section">
            <MetricCard 
              title="Confidence" 
              value="87%" 
              icon={Clock} 
              colorClass="success"
            />
            <MetricCard 
              title="RMSE" 
              value="12.4" 
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
