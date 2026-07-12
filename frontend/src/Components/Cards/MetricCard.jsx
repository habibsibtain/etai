import React from 'react';
import './MetricCard.css';

const MetricCard = ({ title, value, unit, trend, trendValue, icon: Icon, colorClass = "accent" }) => {
  return (
    <div className={`metric-card border-${colorClass}`}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && <div className={`metric-icon-bg bg-${colorClass}`}><Icon size={16} /></div>}
      </div>
      
      <div className="metric-body">
        <div className="metric-value-container">
          <span className="metric-val">{value}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        
        {trend && (
          <div className={`metric-trend ${trend === 'up' ? 'trend-bad' : 'trend-good'}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
