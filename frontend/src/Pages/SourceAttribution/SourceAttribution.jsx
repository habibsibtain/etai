import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import PieChart from '../../Components/Charts/PieChart';
import BarChart from '../../Components/Charts/BarChart';
import GaugeChart from '../../Components/Charts/GaugeChart';
import EvidenceCard from '../../Components/Cards/EvidenceCard';
import { useCity } from '../../context/CityContext';
import { fetchAttribution } from '../../services/api';
import { Target, AlertCircle, FileSearch, Loader2 } from 'lucide-react';
import './SourceAttribution.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
};

const SourceAttribution = () => {
  const { selectedCity, cityStations } = useCity();
  const [selectedStation, setSelectedStation] = useState('');
  const [attribution, setAttribution] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cityStations.length > 0) {
      setSelectedStation(cityStations[0].station_id);
    }
  }, [cityStations]);

  useEffect(() => {
    if (!selectedStation) return;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchAttribution(selectedStation);
        if (data) setAttribution(data);
      } catch (err) { console.warn('Attribution load failed:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [selectedStation]);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];
  const markers = cityStations.filter(s => s.lat && s.lon && s.aqi).map(s => ({
    name: s.name || s.station_id, lat: s.lat, lng: s.lon,
    aqi: s.aqi || 0, pm25: s.pm25 || 0, lastUpdated: 'Live',
  }));

  const sourceData = attribution?.source_breakdown || [];
  const shapData = attribution?.shap_features || [];
  const evidence = attribution?.evidence || [];

  return (
    <div className="attribution-page">
      <div className="attribution-header">
        <h2><Target size={24} /> Pollution Source Attribution</h2>
        <p>ML-powered source identification at station level — {selectedCity}</p>
      </div>

      <div className="station-selector-bar">
        <select className="custom-select station-select" value={selectedStation} onChange={(e) => setSelectedStation(e.target.value)}>
          {cityStations.map(s => (
            <option key={s.station_id} value={s.station_id}>
              {s.name || s.station_id} — AQI: {s.aqi ? Math.round(s.aqi) : 'N/A'}
            </option>
          ))}
        </select>
        {attribution && <span className="zone-badge">{attribution.zone_type} zone</span>}
      </div>

      <div className="attribution-layout">
        <div className="attribution-left">
          <div className="attribution-map panel-card">
            <div className="panel-header"><h3>Station Map</h3></div>
            <div className="map-wrapper-small">
              <MapContainer center={center} zoom={12} key={selectedCity}>
                <MarkerLayer stations={markers} />
              </MapContainer>
            </div>
          </div>

          <div className="attribution-charts">
            <div className="chart-panel panel-card">
              <div className="panel-header"><h3>Emission Sources</h3></div>
              {loading ? (
                <div className="loading-state"><Loader2 size={20} className="spinner-icon" /></div>
              ) : (
                <PieChart data={sourceData} height={200} />
              )}
            </div>
            
            <div className="chart-panel panel-card">
              <div className="panel-header"><h3>Feature Importance (SHAP)</h3></div>
              {loading ? (
                <div className="loading-state"><Loader2 size={20} className="spinner-icon" /></div>
              ) : (
                <BarChart 
                  data={shapData} xKey="feature" barKey="contribution" 
                  layout="vertical" height={200} name="Impact"
                />
              )}
            </div>
          </div>
        </div>

        <div className="attribution-right panel-card">
          <div className="panel-header">
            <h3><FileSearch size={18} /> Model Explanation & Evidence</h3>
          </div>
          
          <div className="gauge-section">
            <GaugeChart 
              value={attribution?.overall_confidence || 0} 
              title="Attribution Confidence" 
              color="var(--color-success)" height={160} 
            />
          </div>

          <div className="llm-summary">
            <h4><AlertCircle size={16} /> AI Summary</h4>
            {attribution?.ai_summary ? (
              <p dangerouslySetInnerHTML={{ __html: attribution.ai_summary }} />
            ) : (
              <p>Select a station to see AI-powered source attribution analysis.</p>
            )}
          </div>

          <div className="evidence-list">
            <h4>Supporting Evidence</h4>
            {evidence.map((ev, i) => (
              <EvidenceCard key={i} title={ev.title} type={ev.type} confidence={ev.confidence}>
                {ev.text}
              </EvidenceCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceAttribution;
