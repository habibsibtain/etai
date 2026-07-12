import React from 'react';
import MapContainer from '../../Components/Map/MapContainer';
import MarkerLayer from '../../Components/Map/MarkerLayer';
import MetricCard from '../../Components/Cards/MetricCard';
import { Wind, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import './Dashboard.css';

const dummyStations = [
  { name: 'Sanathnagar CAAQMS', lat: 17.456, lng: 78.444, aqi: 152, pm25: 65, lastUpdated: '10 mins ago' },
  { name: 'Zoo Park CAAQMS', lat: 17.350, lng: 78.450, aqi: 85, pm25: 32, lastUpdated: '15 mins ago' },
  { name: 'ICRISAT Patancheru', lat: 17.510, lng: 78.275, aqi: 45, pm25: 15, lastUpdated: '5 mins ago' },
  { name: 'Bollaram Industrial', lat: 17.545, lng: 78.350, aqi: 245, pm25: 110, lastUpdated: '2 mins ago' },
  { name: 'Kompally', lat: 17.535, lng: 78.485, aqi: 110, pm25: 45, lastUpdated: '20 mins ago' },
];

const Dashboard = () => {
  return (
    <div className="dashboard-page">
      <div className="map-section">
        <MapContainer center={[17.40, 78.48]} zoom={11}>
          <MarkerLayer stations={dummyStations} />
        </MapContainer>
        
        {/* We can overlay a legend or controls here via absolute positioning */}
        <div className="map-overlay-panel">
          <h4>Live AQI Network</h4>
          <p>5 Active Stations</p>
        </div>
      </div>
      
      <div className="analytics-panel">
        <div className="analytics-header">
          <h3>Current Analytics</h3>
          <span className="timestamp">Last updated: Just now</span>
        </div>
        <div className="metrics-grid">
          <MetricCard 
            title="Avg AQI" 
            value="127" 
            trend="down" 
            trendValue="5%" 
            icon={Activity} 
            colorClass="warning"
          />
          <MetricCard 
            title="Highest AQI" 
            value="245" 
            trend="up" 
            trendValue="12%" 
            icon={AlertTriangle} 
            colorClass="danger"
          />
          <MetricCard 
            title="Dominant" 
            value="PM2.5" 
            unit="µg/m³"
            icon={TrendingUp} 
            colorClass="purple"
          />
          <MetricCard 
            title="Wind" 
            value="12" 
            unit="km/h NW"
            icon={Wind} 
            colorClass="accent"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
