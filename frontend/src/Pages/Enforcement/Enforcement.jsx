import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import EvidenceCard from '../../Components/Cards/EvidenceCard';
import { useCity } from '../../context/CityContext';
import { fetchViolations } from '../../services/api';
import { ShieldAlert, Crosshair, FileText, Send, Loader2, CheckCircle2 } from 'lucide-react';
import './Enforcement.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
};

const Enforcement = () => {
  const { selectedCity } = useCity();
  const [data, setData] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await fetchViolations(selectedCity);
        if (result) {
          setData(result);
          if (result.violations?.length > 0) setSelectedViolation(result.violations[0]);
        }
      } catch (err) { console.warn('Enforcement load failed:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [selectedCity]);

  const violations = data?.violations || [];
  const summary = data?.summary || {};
  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];

  const markers = violations.map(v => ({
    lat: v.lat, lng: v.lon, name: v.type,
    aqi: v.aqi_at_detection, pm25: v.aqi_at_detection * 0.5, lastUpdated: 'Detected',
  }));

  const sel = selectedViolation;

  return (
    <div className="enforcement-page">
      <div className="enforcement-header">
        <h2><ShieldAlert size={24} color="var(--color-warning)" /> Enforcement Intelligence — {selectedCity}</h2>
        <p>Actionable intelligence for field inspectors and regulatory bodies.</p>
      </div>

      <div className="enforcement-summary-bar">
        <div className="summary-stat">
          <span className="stat-value danger">{summary.critical || 0}</span>
          <span className="stat-label">Critical</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value warning">{summary.high || 0}</span>
          <span className="stat-label">High</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value accent">{summary.medium || 0}</span>
          <span className="stat-label">Medium</span>
        </div>
        <div className="summary-stat total">
          <span className="stat-value">{summary.total || 0}</span>
          <span className="stat-label">Total</span>
        </div>
      </div>

      <div className="enforcement-layout">
        <div className="enforcement-main panel-card">
          <div className="panel-header"><h3>Violation Map</h3></div>
          <div className="map-wrapper-large">
            <MapContainer center={center} zoom={11} key={selectedCity}>
              <MarkerLayer stations={markers} />
            </MapContainer>
          </div>
          
          <div className="violation-list">
            {loading ? (
              <div className="loading-state"><Loader2 size={20} className="spinner-icon" /> Analyzing violations...</div>
            ) : (
              violations.map(v => (
                <div 
                  key={v.id} 
                  className={`violation-item ${sel?.id === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedViolation(v)}
                >
                  <div className="v-info">
                    <h4>{v.type}</h4>
                    <p>{v.description}</p>
                  </div>
                  <div className="v-priority">
                    <span className="priority-val">{v.priority}%</span>
                    <span className={`priority-label ${v.priority_label?.toLowerCase()}`}>{v.priority_label}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="enforcement-side panel-card">
          <div className="panel-header"><h3><Crosshair size={18} /> Action Center</h3></div>
          
          {sel ? (
            <>
              <div className="selected-target">
                <div className="target-badge">{sel.priority_label} — {sel.priority}%</div>
                <h4>{sel.type}</h4>
                <p>{sel.description}</p>
                <p className="text-muted" style={{marginTop: '0.5rem', fontSize: '0.8rem'}}>
                  Station: {sel.station_name} • AQI at detection: {sel.aqi_at_detection}
                </p>
              </div>

              <div className="recommended-action">
                <h4><CheckCircle2 size={16} /> Recommended Action</h4>
                <p>{sel.recommended_action}</p>
                <p className="impact-text">{sel.estimated_impact}</p>
              </div>

              <div className="evidence-viewer">
                <h4>Evidence Viewer</h4>
                {sel.evidence?.map((ev, i) => (
                  <EvidenceCard key={i} title={ev.title} type={ev.type} confidence={ev.confidence}>
                    {ev.text}
                  </EvidenceCard>
                ))}
              </div>

              <div className="action-buttons">
                <button className="btn-primary"><Send size={16} /> Assign Inspector</button>
                <button className="btn-secondary"><FileText size={16} /> Generate Notice PDF</button>
              </div>
            </>
          ) : (
            <div className="loading-state">Select a violation to see details</div>
          )}
        </div>
      </div>

      {data?.action_plan && (
        <div className="action-plan-bar panel-card">
          <h4><ShieldAlert size={16} /> Deployment Strategy</h4>
          <p dangerouslySetInnerHTML={{ __html: data.action_plan }} />
        </div>
      )}
    </div>
  );
};

export default Enforcement;
