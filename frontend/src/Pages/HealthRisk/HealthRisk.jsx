import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import MetricCard from '../../Components/Cards/MetricCard';
import BarChart from '../../Components/Charts/BarChart';
import { useCity } from '../../context/CityContext';
import { fetchHealthRisk } from '../../services/api';
import { HeartPulse, Users, ShieldAlert, Activity, Globe, Loader2 } from 'lucide-react';
import './HealthRisk.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
};

const formatPop = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

const HealthRisk = () => {
  const { selectedCity, cityStations } = useCity();
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLang, setShowLang] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchHealthRisk(selectedCity);
        if (data) setRiskData(data);
      } catch (err) { console.warn('Health risk load failed:', err); }
      finally { setLoading(false); }
    }
    load();
  }, [selectedCity]);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];
  const markers = cityStations.filter(s => s.lat && s.lon && s.aqi).map(s => ({
    name: s.name || s.station_id, lat: s.lat, lng: s.lon,
    aqi: s.aqi || 0, pm25: s.pm25 || 0, lastUpdated: 'Live',
  }));

  const demoData = riskData?.demographics?.map(d => ({
    group: d.group, affected: d.affected, color: d.color,
  })) || [];

  return (
    <div className="health-page">
      <div className="health-header">
        <h2><HeartPulse size={24} color="var(--color-purple)" /> Health Risk Analysis — {selectedCity}</h2>
        <p>Population exposure assessment and vulnerability-weighted health advisories.</p>
      </div>

      {loading ? (
        <div className="loading-state full-page"><Loader2 size={24} className="spinner-icon" /> Analyzing health risk...</div>
      ) : (
        <>
          <div className="health-metrics">
            <MetricCard title="Affected Population" value={formatPop(riskData?.total_affected || 0)} icon={Users} colorClass="warning" />
            <MetricCard title="Vulnerable Groups" value={formatPop(riskData?.total_vulnerable || 0)} icon={ShieldAlert} colorClass="danger" />
            <MetricCard title="Risk Level" value={riskData?.risk_level || '—'} icon={Activity} colorClass="purple" />
          </div>

          <div className="health-layout">
            <div className="health-main panel-card">
              <div className="panel-header"><h3>Population Density vs AQI — {selectedCity}</h3></div>
              <div className="health-map-wrapper">
                <MapContainer center={center} zoom={11} key={selectedCity}>
                  <MarkerLayer stations={markers} />
                </MapContainer>
              </div>
            </div>

            <div className="health-side panel-card">
              <div className="panel-header"><h3>Demographic Impact</h3></div>
              <div className="chart-wrapper">
                <BarChart data={demoData} xKey="group" barKey="affected" height={220} name="Affected People" />
              </div>

              <div className="recommendations">
                <div className="advisory-section-header">
                  <h4>Health Advisories</h4>
                  <button className="lang-toggle" onClick={() => setShowLang(!showLang)}>
                    <Globe size={14} /> {showLang ? 'English' : 'Regional Languages'}
                  </button>
                </div>
                
                {!showLang ? (
                  riskData?.advisories?.map((adv, i) => (
                    <div key={i} className={`advisory-card ${adv.severity}`}>
                      <span className="advisory-target">{adv.target}</span>
                      <p>{adv.message}</p>
                    </div>
                  ))
                ) : (
                  riskData?.multilang_advisories?.map((adv, i) => (
                    <div key={i} className="advisory-card info">
                      <span className="advisory-target">{adv.language}</span>
                      <p>{adv.message}</p>
                      {adv.sensitive_message && <p className="sensitive-msg">{adv.sensitive_message}</p>}
                    </div>
                  ))
                )}
              </div>

              {riskData?.facilities_at_risk && (
                <div className="facilities-section">
                  <h4>Facilities at Risk</h4>
                  <div className="facility-list">
                    {riskData.facilities_at_risk.map((f, i) => (
                      <div key={i} className="facility-row">
                        <span className="facility-name">{f.type}</span>
                        <div className="facility-bar-wrapper">
                          <div className="facility-bar" style={{width: `${f.risk_pct}%`}}></div>
                        </div>
                        <span className="facility-stat">{f.at_risk}/{f.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HealthRisk;
