import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CityProvider } from './context/CityContext';
import AppRoutes from './Routes/AppRoutes';
import './App.css';

function App() {
  return (
    <CityProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </CityProvider>
  );
}

export default App;
