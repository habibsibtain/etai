import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, MapPin, Loader2, Map } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const [currentCity, setCurrentCity] = useState('Hyderabad');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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
          // Nominatim OpenStreetMap API, restricted to India (countrycodes=in)
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
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectLocation = (location) => {
    // Extract a concise name for the city display
    const nameParts = location.display_name.split(',');
    setCurrentCity(nameParts[0].trim());
    setSearchQuery('');
    setShowDropdown(false);
    
    // In a real app, we would probably dispatch this to a global store
    // to update the map center. For now, we just update the UI.
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="location-selector">
          <MapPin className="location-icon" size={18} />
          <span className="current-city">{currentCity}</span>
          <span className="city-aqi badge-warning">AQI: 142</span>
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
        <button className="notification-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
