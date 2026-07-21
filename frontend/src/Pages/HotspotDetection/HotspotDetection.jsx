import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import { useCity } from '../../context/CityContext';
import { fetchHotspots } from '../../services/api';
import { Flame, AlertTriangle, TrendingUp, Info, Loader2 } from 'lucide-react';
import './HotspotDetection.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
};

const HotspotDetection = () => {
  const { selectedCity } = useCity();
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchHotspots(selectedCity, 10);
        if (data && data.hotspots) {
          setHotspots(data.hotspots);
          if (data.hotspots.length > 0) setSelectedHotspot(data.hotspots[0]);
        }
      } catch (err) { console.warn('Hotspot load failed:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [selectedCity]);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];

  const markers = hotspots.map(h => ({
    lat: h.lat, lng: h.lon, aqi: h.aqi,
    name: h.name, pm25: h.pm25 || 0, lastUpdated: 'Live',
  }));

  const deep = selectedHotspot;

  return (
    <div className="hotspot-page">
      <div className="hotspot-header">
        <h2><Flame size={24} color="var(--color-danger)" /> Hotspot Detection — {selectedCity}</h2>
        <p>Real-time identification of critical pollution clusters requiring immediate attention.</p>
      </div>

      <div className="hotspot-layout">
        <div className="hotspot-main panel-card">
          <div className="map-wrapper-large">
            <MapContainer center={center} zoom={11} key={selectedCity}>
              <MarkerLayer stations={markers} />
            </MapContainer>
          </div>
          
          <div className="hotspot-list">
            <div className="list-header"><h3>Active Hotspots ({hotspots.length})</h3></div>
            {loading ? (
              <div className="loading-state"><Loader2 size={20} className="spinner-icon" /> Loading hotspots...</div>
            ) : (
              <table className="hotspot-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Location</th><th>AQI</th>
                    <th>Affected Pop.</th><th>Trend</th><th>Primary Driver</th>
                  </tr>
                </thead>
                <tbody>
                  {hotspots.map((h) => (
                    <tr key={h.rank} className={deep?.rank === h.rank ? 'selected-row' : ''}
                        onClick={() => setSelectedHotspot(h)} style={{cursor: 'pointer'}}>
                      <td><span className={`rank-badge rank-${Math.min(h.rank, 3)}`}>{h.rank}</span></td>
                      <td className="fw-bold">{h.name}</td>
                      <td><span className="aqi-badge danger">{Math.round(h.aqi)}</span></td>
                      <td>{h.population_affected}</td>
                      <td className="trend-up"><TrendingUp size={14} /> {h.trend_24h}</td>
                      <td className="text-muted">{h.primary_driver} ({h.primary_driver_pct}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="hotspot-side panel-card">
          <div className="panel-header">
            <h3><AlertTriangle size={18} /> Deep Dive: #{deep?.rank || 1}</h3>
          </div>
          
          {deep ? (
            <>
              <div className="hotspot-focus">
                <h4>{deep.name}</h4>
                <div className="focus-aqi text-danger">{Math.round(deep.aqi)} AQI ({deep.aqi_bucket || 'Poor'})</div>
              </div>

              <div className="reason-cards">
                <div className="reason-card">
                  <h5><Info size={14} /> Primary Contributors</h5>
                  <ul>
                    {deep.source_breakdown?.map((s, i) => (
                      <li key={i}><strong>{s.value}%</strong> {s.name}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="reason-card">
                  <h5><Info size={14} /> Station Details</h5>
                  <p>Station ID: {deep.station_id}<br/>
                  Confidence: {deep.confidence}%<br/>
                  PM2.5: {deep.pm25 ? Math.round(deep.pm25) : 'N/A'} µg/m³</p>
                </div>
                
                <div className="reason-card">
                  <h5><Info size={14} /> Population Impact</h5>
                  <p>Approximately {deep.population_affected} people in this ward are exposed to {deep.aqi_bucket || 'poor'} air quality conditions.</p>
                </div>
              </div>
              
              <button className="action-btn danger-btn mt-auto">Issue Area Alert</button>
            </>
          ) : (
            <div className="loading-state">Select a hotspot to see details</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotspotDetection;
