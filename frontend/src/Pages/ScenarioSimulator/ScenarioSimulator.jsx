import React, { useState } from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import LineChart from '../../Components/Charts/LineChart';
import { Sliders, Zap, CheckCircle2 } from 'lucide-react';
import './ScenarioSimulator.css';

const scenarioData = [
  { time: 'Day 1', base: 145, simulated: 145 },
  { time: 'Day 2', base: 150, simulated: 135 },
  { time: 'Day 3', base: 155, simulated: 125 },
  { time: 'Day 4', base: 160, simulated: 110 },
  { time: 'Day 5', base: 150, simulated: 95 },
];

const ScenarioSimulator = () => {
  const [traffic, setTraffic] = useState(20);
  const [industry, setIndustry] = useState(10);
  const [construction, setConstruction] = useState(0);

  return (
    <div className="simulator-page">
      <div className="simulator-header">
        <h2><Sliders size={24} color="var(--color-accent)" /> Scenario Simulator</h2>
        <p>"What if" analysis for policy interventions and their impact on AQI.</p>
      </div>

      <div className="simulator-layout">
        <div className="simulator-controls panel-card">
          <div className="panel-header">
            <h3>Policy Interventions</h3>
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Traffic Reduction</span>
              <span className="slider-val text-accent">{traffic}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={traffic} 
              onChange={(e) => setTraffic(e.target.value)} 
              className="custom-range"
            />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Industry Shutdown</span>
              <span className="slider-val text-purple">{industry}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={industry} 
              onChange={(e) => setIndustry(e.target.value)} 
              className="custom-range purple"
            />
          </div>
          
          <div className="slider-group">
            <div className="slider-label">
              <span>Construction Halt</span>
              <span className="slider-val text-warning">{construction}%</span>
            </div>
            <input 
              type="range" 
              min="0" max="100" 
              value={construction} 
              onChange={(e) => setConstruction(e.target.value)} 
              className="custom-range warning"
            />
          </div>

          <button className="simulate-btn">
            <Zap size={16} /> Run Simulation
          </button>

          <div className="sim-llm-summary">
            <h4>Impact Summary</h4>
            <p>
              Reducing traffic by <strong>{traffic}%</strong> and industry by <strong>{industry}%</strong> is expected to reduce overall PM2.5 by <strong>~18%</strong> within 4 days. Total affected population drops by 45,000.
            </p>
          </div>
        </div>

        <div className="simulator-main">
          <div className="sim-top panel-card">
            <div className="panel-header">
              <h3>Simulation Map Overlay</h3>
            </div>
            <div className="map-wrapper-small">
              <MapContainer center={[17.385, 78.486]} zoom={10} />
            </div>
          </div>
          
          <div className="sim-bottom panel-card">
            <div className="panel-header">
              <h3>Base AQI vs Simulated AQI Trend</h3>
            </div>
            <LineChart 
              data={scenarioData} 
              xKey="time"
              lines={[
                { dataKey: 'base', name: 'Business as Usual', color: 'var(--color-danger)' },
                { dataKey: 'simulated', name: 'Simulated Intervention', color: 'var(--color-success)' }
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
