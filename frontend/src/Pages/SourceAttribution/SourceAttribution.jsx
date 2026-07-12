import React from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import PieChart from '../../Components/Charts/PieChart';
import BarChart from '../../Components/Charts/BarChart';
import GaugeChart from '../../Components/Charts/GaugeChart';
import EvidenceCard from '../../Components/Cards/EvidenceCard';
import { Target, AlertCircle, FileSearch } from 'lucide-react';
import './SourceAttribution.css';

const sourceData = [
  { name: 'Traffic', value: 45, color: '#EF4444' },
  { name: 'Construction', value: 25, color: '#FACC15' },
  { name: 'Industry', value: 15, color: '#A855F7' },
  { name: 'Waste Burning', value: 10, color: '#F97316' },
  { name: 'Others', value: 5, color: '#64748B' },
];

const shapData = [
  { feature: 'Wind Speed', contribution: 0.8, color: '#38BDF8' },
  { feature: 'Truck Traffic', contribution: 0.65, color: '#EF4444' },
  { feature: 'Temperature', contribution: -0.4, color: '#22C55E' },
  { feature: 'Humidity', contribution: 0.3, color: '#FACC15' },
];

const SourceAttribution = () => {
  return (
    <div className="attribution-page">
      <div className="attribution-header">
        <h2><Target size={24} /> Pollution Source Attribution</h2>
        <p>Identify primary contributors to local AQI spikes using ML attribution models.</p>
      </div>

      <div className="attribution-layout">
        <div className="attribution-left">
          
          <div className="attribution-map panel-card">
            <div className="panel-header">
              <h3>Select Region</h3>
            </div>
            <div className="map-wrapper-small">
              <MapContainer center={[17.385, 78.486]} zoom={12} />
            </div>
          </div>

          <div className="attribution-charts">
            <div className="chart-panel panel-card">
              <div className="panel-header">
                <h3>Emission Sources</h3>
              </div>
              <PieChart data={sourceData} height={200} />
            </div>
            
            <div className="chart-panel panel-card">
              <div className="panel-header">
                <h3>SHAP Feature Importance</h3>
              </div>
              <BarChart 
                data={shapData} 
                xKey="feature" 
                barKey="contribution" 
                layout="vertical"
                height={200}
                name="Impact"
              />
            </div>
          </div>
        </div>

        <div className="attribution-right panel-card">
          <div className="panel-header">
            <h3><FileSearch size={18} /> Model Explanation & Evidence</h3>
          </div>
          
          <div className="gauge-section">
            <GaugeChart value={89} title="Overall Attribution Confidence" color="var(--color-success)" height={160} />
          </div>

          <div className="llm-summary">
            <h4><AlertCircle size={16} /> AI Summary</h4>
            <p>
              The model attributes <strong>45% of PM2.5</strong> in this ward to <strong>Traffic</strong>. 
              This prediction is heavily influenced by the low wind speed and a 30% increase in heavy truck traffic over the last 4 hours on the NH65 highway.
            </p>
          </div>

          <div className="evidence-list">
            <h4>Supporting Evidence</h4>
            <EvidenceCard title="Satellite Imagery" type="Visual Data" confidence={92}>
              High density of NO2 concentration observed over the primary highway corridor crossing the selected ward.
            </EvidenceCard>
            <EvidenceCard title="Traffic API" type="Sensor Data" confidence={88}>
              Average vehicle speed reduced by 15km/h indicating severe congestion.
            </EvidenceCard>
            <EvidenceCard title="Construction Permits" type="Registry" confidence={75}>
              2 active commercial construction permits within 500m of the highest pollution node.
            </EvidenceCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceAttribution;
