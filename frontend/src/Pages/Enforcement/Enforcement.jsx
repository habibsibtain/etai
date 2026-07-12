import React, { useState } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import EvidenceCard from '../../Components/Cards/EvidenceCard';
import { ShieldAlert, Crosshair, FileText, Send } from 'lucide-react';
import './Enforcement.css';

const violations = [
  { id: 1, type: 'Construction Site', priority: 95, reason: 'Dust control permit expired & severe AQI spike', lat: 17.43, lng: 78.41, aqi: 220 },
  { id: 2, type: 'Illegal Waste Burning', priority: 82, reason: 'Detected via thermal satellite imagery', lat: 17.38, lng: 78.49, aqi: 180 },
  { id: 3, type: 'Industrial Emission', priority: 75, reason: 'Stack emissions exceed nighttime limits', lat: 17.52, lng: 78.35, aqi: 195 },
];

const Enforcement = () => {
  const [selectedViolation, setSelectedViolation] = useState(violations[0]);

  const markers = violations.map(v => ({
    lat: v.lat,
    lng: v.lng,
    name: v.type,
    aqi: v.aqi,
    pm25: v.aqi * 0.5,
    lastUpdated: '10 mins ago'
  }));

  return (
    <div className="enforcement-page">
      <div className="enforcement-header">
        <h2><ShieldAlert size={24} color="var(--color-warning)" /> Enforcement Intelligence</h2>
        <p>Actionable intelligence for field inspectors and regulatory bodies.</p>
      </div>

      <div className="enforcement-layout">
        <div className="enforcement-main panel-card">
          <div className="panel-header">
            <h3>Violation Map</h3>
          </div>
          <div className="map-wrapper-large">
            <MapContainer center={[17.42, 78.43]} zoom={11}>
              <MarkerLayer stations={markers} />
            </MapContainer>
          </div>
          
          <div className="violation-list">
            {violations.map(v => (
              <div 
                key={v.id} 
                className={`violation-item ${selectedViolation.id === v.id ? 'active' : ''}`}
                onClick={() => setSelectedViolation(v)}
              >
                <div className="v-info">
                  <h4>{v.type}</h4>
                  <p>{v.reason}</p>
                </div>
                <div className="v-priority">
                  <span className="priority-val">{v.priority}%</span>
                  <span className="priority-label">Priority</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="enforcement-side panel-card">
          <div className="panel-header">
            <h3><Crosshair size={18} /> Action Center</h3>
          </div>
          
          <div className="selected-target">
            <div className="target-badge">Priority {selectedViolation.priority}%</div>
            <h4>{selectedViolation.type}</h4>
            <p>{selectedViolation.reason}</p>
          </div>

          <div className="evidence-viewer">
            <h4>Evidence Viewer</h4>
            <EvidenceCard title="Permit DB Cross-check" type="Registry" confidence={99}>
              Site ID #4492. Construction dust-control permit expired on 10-Jul-2026.
            </EvidenceCard>
            <EvidenceCard title="Nearby Sensor" type="IoT Data" confidence={95}>
              Station 400m downwind reporting PM10 spike of +120µg/m³ in last 2 hours.
            </EvidenceCard>
          </div>

          <div className="action-buttons">
            <button className="btn-primary">
              <Send size={16} /> Assign Inspector
            </button>
            <button className="btn-secondary">
              <FileText size={16} /> Generate Notice PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enforcement;
