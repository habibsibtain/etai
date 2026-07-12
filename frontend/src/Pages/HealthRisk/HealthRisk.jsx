import React from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MetricCard from '../../Components/Cards/MetricCard';
import BarChart from '../../Components/Charts/BarChart';
import { HeartPulse, Users, ShieldAlert, Activity } from 'lucide-react';
import './HealthRisk.css';

const ageData = [
  { group: '0-12 yrs', affected: 15000, color: '#EF4444' },
  { group: '13-30 yrs', affected: 45000, color: '#38BDF8' },
  { group: '31-60 yrs', affected: 55000, color: '#38BDF8' },
  { group: '60+ yrs', affected: 18000, color: '#EF4444' },
];

const HealthRisk = () => {
  return (
    <div className="health-page">
      <div className="health-header">
        <h2><HeartPulse size={24} color="var(--color-purple)" /> Health Risk Analysis</h2>
        <p>Evaluate population exposure and vulnerable demographic impacts.</p>
      </div>

      <div className="health-metrics">
        <MetricCard title="Affected Population" value="133k" icon={Users} colorClass="warning" />
        <MetricCard title="Vulnerable Groups" value="33k" icon={ShieldAlert} colorClass="danger" />
        <MetricCard title="Avg Risk Level" value="High" icon={Activity} colorClass="purple" />
      </div>

      <div className="health-layout">
        <div className="health-main panel-card">
          <div className="panel-header">
            <h3>Population Density vs AQI Overlay</h3>
          </div>
          <div className="health-map-wrapper">
             <MapContainer center={[17.385, 78.486]} zoom={11} />
          </div>
        </div>

        <div className="health-side panel-card">
          <div className="panel-header">
            <h3>Demographic Impact</h3>
          </div>
          <div className="chart-wrapper">
            <BarChart 
              data={ageData} 
              xKey="group" 
              barKey="affected" 
              height={220}
              name="Affected People"
            />
          </div>

          <div className="recommendations">
            <h4>Health Advisories</h4>
            
            <div className="advisory-card severe">
              <span className="advisory-target">Children & Elderly (0-12, 60+)</span>
              <p>Strictly avoid all outdoor physical activities. Remain indoors and keep windows closed.</p>
            </div>
            
            <div className="advisory-card warning">
              <span className="advisory-target">General Population</span>
              <p>Reduce prolonged or heavy outdoor exertion. Wear N95 masks if stepping out.</p>
            </div>
            
            <div className="advisory-card info">
              <span className="advisory-target">Asthma Patients</span>
              <p>Keep relief medicine handy. Seek medical advice if experiencing palpitations or shortness of breath.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthRisk;
