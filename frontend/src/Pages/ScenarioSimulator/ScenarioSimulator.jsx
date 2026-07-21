import React, { useState, useEffect } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import LineChart from '../../Components/Charts/LineChart';
import { useCity } from '../../context/CityContext';
import { runSimulation } from '../../services/api';
import { Sliders, Zap, Loader2 } from 'lucide-react';
import './ScenarioSimulator.css';

const CITY_CENTERS = {
  Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777],
  Kolkata: [22.5726, 88.3639], Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867],
};

const ScenarioSimulator = () => {
  const { selectedCity, cityStations } = useCity();
  const [traffic, setTraffic] = useState(20);
  const [industry, setIndustry] = useState(10);
  const [construction, setConstruction] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const center = CITY_CENTERS[selectedCity] || [20.5937, 78.9629];
  const markers = cityStations.filter(s => s.lat && s.lon && s.aqi).map(s => ({
    name: s.name || s.station_id, lat: s.lat, lng: s.lon,
    aqi: s.aqi || 0, pm25: s.pm25 || 0, lastUpdated: 'Live',
  }));

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const result = await runSimulation({
        city: selectedCity,
        traffic_reduction: parseFloat(traffic),
        industry_shutdown: parseFloat(industry),
        construction_halt: parseFloat(construction),
        simulation_days: 7,
      });
      if (result) setSimResult(result);
    } catch (err) { console.warn('Simulation failed:', err); }
    finally { setLoading(false); }
  };

  // Auto-run on mount with defaults
  useEffect(() => { handleSimulate(); }, [selectedCity]);

  const trendData = simResult?.trend || [];

  return (
    <div className="simulator-page">
      <div className="simulator-header">
        <h2><Sliders size={24} color="var(--color-accent)" /> Scenario Simulator — {selectedCity}</h2>
        <p>"What if" analysis for policy interventions and their projected impact on AQI.</p>
      </div>

      <div className="simulator-layout">
        <div className="simulator-controls panel-card">
          <div className="panel-header"><h3>Policy Interventions</h3></div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>🚗 Traffic Reduction</span>
              <span className="slider-val text-accent">{traffic}%</span>
            </div>
            <input type="range" min="0" max="100" value={traffic} onChange={(e) => setTraffic(e.target.value)} className="custom-range" />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>🏭 Industry Shutdown</span>
              <span className="slider-val text-purple">{industry}%</span>
            </div>
            <input type="range" min="0" max="100" value={industry} onChange={(e) => setIndustry(e.target.value)} className="custom-range purple" />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>🏗️ Construction Halt</span>
              <span className="slider-val text-warning">{construction}%</span>
            </div>
            <input type="range" min="0" max="100" value={construction} onChange={(e) => setConstruction(e.target.value)} className="custom-range warning" />
          </div>

          <button className="simulate-btn" onClick={handleSimulate} disabled={loading}>
            {loading ? <Loader2 size={16} className="spinner-icon" /> : <Zap size={16} />}
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>

          {simResult?.summary && (
            <div className="sim-metrics">
              <div className="sim-metric">
                <span className="sm-label">Current AQI</span>
                <span className="sm-value warning">{Math.round(simResult.current_aqi)}</span>
              </div>
              <div className="sim-metric">
                <span className="sm-label">Projected AQI</span>
                <span className="sm-value success">{Math.round(simResult.summary.final_simulated_aqi)}</span>
              </div>
              <div className="sim-metric">
                <span className="sm-label">Reduction</span>
                <span className="sm-value accent">{simResult.summary.total_reduction_pct}%</span>
              </div>
            </div>
          )}

          {simResult?.ai_summary && (
            <div className="sim-llm-summary">
              <h4>Impact Summary</h4>
              <p dangerouslySetInnerHTML={{ __html: simResult.ai_summary }} />
            </div>
          )}
        </div>

        <div className="simulator-main">
          <div className="sim-top panel-card">
            <div className="panel-header"><h3>Simulation Map — {selectedCity}</h3></div>
            <div className="map-wrapper-small">
              <MapContainer center={center} zoom={11} key={selectedCity}>
                <MarkerLayer stations={markers} />
              </MapContainer>
            </div>
          </div>
          
          <div className="sim-bottom panel-card">
            <div className="panel-header"><h3>Baseline AQI vs Simulated AQI</h3></div>
            <LineChart 
              data={trendData.map(t => ({ time: t.day, base: t.baseline, simulated: t.simulated }))}
              xKey="time"
              lines={[
                { dataKey: 'base', name: 'Business as Usual', color: 'var(--color-danger)' },
                { dataKey: 'simulated', name: 'With Intervention', color: 'var(--color-success)' }
              ]}
              height={220}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSimulator;
