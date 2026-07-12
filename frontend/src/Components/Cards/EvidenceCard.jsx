import React from 'react';
import './EvidenceCard.css';

const EvidenceCard = ({ title, type, confidence, children }) => {
  return (
    <div className="evidence-card">
      <div className="evidence-header">
        <span className="evidence-title">{title}</span>
        <span className={`confidence-badge ${confidence > 80 ? 'high' : 'medium'}`}>
          {confidence}% Confidence
        </span>
      </div>
      <div className="evidence-type">{type}</div>
      <div className="evidence-content">
        {children}
      </div>
    </div>
  );
};

export default EvidenceCard;
