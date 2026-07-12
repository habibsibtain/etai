import React from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import { Flame, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import './HotspotDetection.css';

const hotspots = [
  { rank: 1, name: 'Bollaram Industrial', aqi: 285, pop: '45,000', trend: '+15%', reason: 'Industrial emissions + Low wind' },
  { rank: 2, name: 'Kukatpally Y Junction', aqi: 242, pop: '85,000', trend: '+8%', reason: 'Severe traffic congestion' },
  { rank: 3, name: 'Sanathnagar', aqi: 210, pop: '60,000', trend: '+5%', reason: 'Mixed industrial & traffic' },
];

const hotspotMarkers = hotspots.map((h, i) => ({
  lat: 17.5 + (i * 0.02),
  lng: 78.4 + (i * 0.03),
  aqi: h.aqi,
  name: h.name,
  pm25: h.aqi * 0.6,
  lastUpdated: 'Live'
}));

const HotspotDetection = () => {
  return (
    <div className="hotspot-page">
      <div className="hotspot-header">
        <h2><Flame size={24} color="var(--color-danger)" /> Hotspot Detection</h2>
        <p>Real-time identification of critical pollution clusters requiring immediate attention.</p>
      </div>

      <div className="hotspot-layout">
        <div className="hotspot-main panel-card">
          <div className="map-wrapper-large">
            <MapContainer center={[17.45, 78.45]} zoom={11}>
              <MarkerLayer stations={hotspotMarkers} />
            </MapContainer>
          </div>
          
          <div className="hotspot-list">
            <div className="list-header">
              <h3>Active Hotspots</h3>
            </div>
            <table className="hotspot-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Location</th>
                  <th>Current AQI</th>
                  <th>Affected Pop.</th>
                  <th>Trend (24h)</th>
                  <th>Primary Driver</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.map((hotspot) => (
                  <tr key={hotspot.rank}>
                    <td>
                      <span className={`rank-badge rank-${hotspot.rank}`}>{hotspot.rank}</span>
                    </td>
                    <td className="fw-bold">{hotspot.name}</td>
                    <td>
                      <span className="aqi-badge danger">{hotspot.aqi}</span>
                    </td>
                    <td>{hotspot.pop}</td>
                    <td className="trend-up"><TrendingUp size={14} /> {hotspot.trend}</td>
                    <td className="text-muted">{hotspot.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hotspot-side panel-card">
          <div className="panel-header">
            <h3><AlertTriangle size={18} /> Deep Dive: Rank #1</h3>
          </div>
          
          <div className="hotspot-focus">
            <h4>Bollaram Industrial</h4>
            <div className="focus-aqi text-danger">285 AQI (Severe)</div>
          </div>

          <div className="reason-cards">
            <div className="reason-card">
              <h5><Info size={14} /> Primary Contributors</h5>
              <ul>
                <li><strong>70%</strong> Industrial PM2.5 emissions</li>
                <li><strong>20%</strong> Heavy vehicle diesel exhaust</li>
                <li><strong>10%</strong> Secondary aerosol formation</li>
              </ul>
            </div>
            
            <div className="reason-card">
              <h5><Info size={14} /> Meteorological Context</h5>
              <p>Wind speed has dropped below 2m/s, creating a stagnation event trapping pollutants near the surface.</p>
            </div>
            
            <div className="reason-card">
              <h5><Info size={14} /> Prediction</h5>
              <p>Expected to persist for next 12 hours before evening winds provide dispersion.</p>
            </div>
          </div>
          
          <button className="action-btn danger-btn mt-auto">
            Issue Area Alert
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotspotDetection;
