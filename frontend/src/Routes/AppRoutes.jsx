import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../Layout/AppLayout/AppLayout';

// Lazy loading pages can be added here later. 
// For now we will create standard imports.
import Dashboard from '../Pages/Dashboard/Dashboard';
import Forecast from '../Pages/Forecast/Forecast';
import SourceAttribution from '../Pages/SourceAttribution/SourceAttribution';
import HotspotDetection from '../Pages/HotspotDetection/HotspotDetection';
import HealthRisk from '../Pages/HealthRisk/HealthRisk';
import Enforcement from '../Pages/Enforcement/Enforcement';
import ScenarioSimulator from '../Pages/ScenarioSimulator/ScenarioSimulator';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="attribution" element={<SourceAttribution />} />
        <Route path="hotspots" element={<HotspotDetection />} />
        <Route path="health" element={<HealthRisk />} />
        <Route path="enforcement" element={<Enforcement />} />
        <Route path="simulator" element={<ScenarioSimulator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
