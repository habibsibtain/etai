import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Create colored marker icons dynamically
const getColoredIcon = (colorHex) => {
  const markerHtmlStyles = `
    background-color: ${colorHex};
    width: 20px;
    height: 20px;
    display: block;
    left: -10px;
    top: -10px;
    position: relative;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 0 10px ${colorHex};
  `;

  return L.divIcon({
    className: 'custom-colored-marker',
    iconAnchor: [0, 0],
    labelAnchor: [-6, 0],
    popupAnchor: [0, -10],
    html: `<span style="${markerHtmlStyles}" />`
  });
};

const getAqiColor = (aqi) => {
  if (aqi <= 50) return 'var(--color-success)';
  if (aqi <= 100) return 'var(--color-warning)';
  if (aqi <= 200) return 'var(--color-accent)'; // Just for variety, typically orange
  if (aqi <= 300) return 'var(--color-danger)';
  return 'var(--color-purple)';
};

const MarkerLayer = ({ stations }) => {
  return (
    <>
      {stations.map((station, index) => (
        <Marker 
          key={index} 
          position={[station.lat, station.lng]}
          icon={getColoredIcon(getAqiColor(station.aqi))}
        >
          <Popup>
            <div style={{ minWidth: '150px' }}>
              <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                {station.name}
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>AQI</span>
                <span style={{ fontWeight: 'bold', color: getAqiColor(station.aqi) }}>{station.aqi}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>PM2.5</span>
                <span>{station.pm25} µg/m³</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Updated</span>
                <span>{station.lastUpdated}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default MarkerLayer;
