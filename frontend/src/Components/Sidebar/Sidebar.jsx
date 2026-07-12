import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wind, 
  PieChart, 
  MapPin, 
  Activity, 
  ShieldAlert, 
  Sliders, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'AQI Forecasting', path: '/forecast', icon: Wind },
  { name: 'Pollution Attribution', path: '/attribution', icon: PieChart },
  { name: 'Hotspot Detection', path: '/hotspots', icon: MapPin },
  { name: 'Health Risk Analysis', path: '/health', icon: Activity },
  { name: 'Enforcement Intelligence', path: '/enforcement', icon: ShieldAlert },
  { name: 'Scenario Simulator', path: '/simulator', icon: Sliders },
];

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        {isOpen ? (
          <div className="logo-container">
            <Wind className="logo-icon" size={28} />
            <span className="logo-text">Urban Air Intel</span>
          </div>
        ) : (
          <Wind className="logo-icon" size={28} />
        )}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={!isOpen ? item.name : ''}
              >
                <item.icon className="nav-icon" size={20} />
                {isOpen && <span className="nav-text">{item.name}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <ul className="footer-nav">
          <li>
            <NavLink to="/settings" className="nav-link" title={!isOpen ? "Settings" : ""}>
              <Settings className="nav-icon" size={20} />
              {isOpen && <span className="nav-text">Settings</span>}
            </NavLink>
          </li>
        </ul>
        
        <div className="sidebar-actions">
          <button className="icon-btn theme-toggle" title="Toggle Theme">
            <Moon size={18} />
            {isOpen && <span>Dark Mode</span>}
          </button>
          
          <button className="icon-btn collapse-btn" onClick={toggleSidebar} title="Collapse Sidebar">
            {isOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {isOpen && (
          <div className="user-profile">
            <div className="avatar">A</div>
            <div className="user-info">
              <span className="user-name">Admin User</span>
              <span className="user-role">City Authority</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
