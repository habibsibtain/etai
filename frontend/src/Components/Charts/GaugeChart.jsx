import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './GaugeChart.css';

const GaugeChart = ({ value = 0, title, color = "var(--color-accent)", height = 180 }) => {
  // Gauge is a half-pie chart
  const data = [
    { name: 'value', value: value, color: color },
    { name: 'remainder', value: 100 - value, color: 'var(--border-color)' }
  ];

  return (
    <div className="gauge-container" style={{ height }}>
      {title && <h4 className="gauge-title">{title}</h4>}
      <div className="gauge-chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="80%" // Move down for half circle
              startAngle={180}
              endAngle={0}
              innerRadius={50}
              outerRadius={70}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
        <div className="gauge-value">
          <span>{value}%</span>
        </div>
      </div>
    </div>
  );
};

export default GaugeChart;
