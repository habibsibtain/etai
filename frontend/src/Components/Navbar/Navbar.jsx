import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, MapPin, Loader2, Map, ChevronDown } from 'lucide-react';
import { useCity } from '../../context/CityContext';
import './Navbar.css';

const Navbar = () => {
  const { selectedCity, changeCity, cities, citySummary } = useCity();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCityMenu, setShowCityMenu] = useState(false);
  
  const dropdownRef = useRef(null);
  const cityMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (cityMenuRef.current && !cityMenuRef.current.contains(event.target)) {
        setShowCityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=in&limit=5`);
          const data = await response.json();
          setResults(data);
          setShowDropdown(true);
        } catch (error) {
          console.error("Search failed", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectLocation = (location) => {
    const nameParts = location.display_name.split(',');
    const cityName = nameParts[0].trim();
    // Check if it matches any known city
    const matchedCity = cities.find(c => c.toLowerCase() === cityName.toLowerCase());
    if (matchedCity) {
      changeCity(matchedCity);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const getAqiBadgeClass = (aqi) => {
    if (!aqi) return 'badge-muted';
    if (aqi <= 50) return 'badge-good';
    if (aqi <= 100) return 'badge-satisfactory';
    if (aqi <= 200) return 'badge-moderate';
    if (aqi <= 300) return 'badge-poor';
    return 'badge-severe';
  };

  const currentAqi = citySummary?.avg_aqi;

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="location-selector" ref={cityMenuRef}>
          <button className="city-selector-btn" onClick={() => setShowCityMenu(!showCityMenu)}>
            <MapPin className="location-icon" size={18} />
            <span className="current-city">{selectedCity}</span>
            <span className={`city-aqi ${getAqiBadgeClass(currentAqi)}`}>
              AQI: {currentAqi ? Math.round(currentAqi) : '—'}
            </span>
            <ChevronDown size={14} className={`chevron ${showCityMenu ? 'rotated' : ''}`} />
          </button>
          
          {showCityMenu && (
            <div className="city-dropdown">
              <div className="city-dropdown-header">Select City</div>
              <ul>
                {cities.map((city) => (
                  <li 
                    key={city} 
                    className={city === selectedCity ? 'active' : ''}
                    onClick={() => { changeCity(city); setShowCityMenu(false); }}
                  >
                    <MapPin size={14} />
                    <span>{city}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="navbar-center">
        <div className="search-container" ref={dropdownRef}>
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Search location in India..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          />
          {isSearching && (
            <div className="search-spinner">
              <Loader2 size={16} className="spinner-icon" />
            </div>
          )}
          
          {showDropdown && results.length > 0 && (
            <div className="search-dropdown">
              <ul>
                {results.map((result) => (
                  <li key={result.place_id} onClick={() => handleSelectLocation(result)}>
                    <Map size={14} className="result-icon" />
                    <div className="result-info">
                      <span className="result-name">{result.name || result.display_name.split(',')[0]}</span>
                      <span className="result-address">{result.display_name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {showDropdown && searchQuery.length > 2 && results.length === 0 && !isSearching && (
            <div className="search-dropdown">
              <div className="no-results">No locations found in India</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="navbar-right">
        <div className="live-indicator">
          <span className="live-dot"></span>
          <span className="live-text">Live</span>
        </div>
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
