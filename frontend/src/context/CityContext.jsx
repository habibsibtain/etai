/**
 * CityContext.jsx — Global city state for the AQI-Intel app.
 * 
 * Provides selected city, station list, and city summary
 * shared across all pages.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCities, fetchDashboardSummary } from '../services/api';

const CityContext = createContext();

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [cities, setCities] = useState([]);
  const [citySummary, setCitySummary] = useState(null);
  const [cityStations, setCityStations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load available cities on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const data = await fetchCities();
        if (data && data.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.warn('Failed to load cities:', err);
        // Fallback cities
        setCities(['Delhi', 'Mumbai', 'Kolkata', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Lucknow', 'Jaipur', 'Patna']);
      }
    }
    loadCities();
  }, []);

  // Load city data when selected city changes
  const loadCityData = useCallback(async (city) => {
    setLoading(true);
    try {
      const data = await fetchDashboardSummary(city);
      if (data) {
        setCitySummary(data.summary || null);
        setCityStations(data.stations || []);
      }
    } catch (err) {
      console.warn('Failed to load city data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCityData(selectedCity);
  }, [selectedCity, loadCityData]);

  const changeCity = useCallback((city) => {
    setSelectedCity(city);
  }, []);

  const refreshData = useCallback(() => {
    loadCityData(selectedCity);
  }, [selectedCity, loadCityData]);

  return (
    <CityContext.Provider value={{
      selectedCity,
      changeCity,
      cities,
      citySummary,
      cityStations,
      loading,
      refreshData,
    }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}

export default CityContext;
