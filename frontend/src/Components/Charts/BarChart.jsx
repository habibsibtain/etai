import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './BarChart.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        <p className="tooltip-item" style={{ color: payload[0].payload.color || payload[0].fill }}>
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const BarChart = ({ data, xKey, barKey, height = 300, layout = 'horizontal', name = "Value" }) => {
  return (
    <div className="chart-container" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart 
          data={data} 
          layout={layout}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={layout === 'horizontal'} vertical={layout === 'vertical'} />
          
          {layout === 'horizontal' ? (
            <>
              <XAxis dataKey={xKey} stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis type="number" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis dataKey={xKey} type="category" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={false} width={100} />
            </>
          )}

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          
          <Bar dataKey={barKey} name={name} radius={[4, 4, 4, 4]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || 'var(--color-accent)'} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;
