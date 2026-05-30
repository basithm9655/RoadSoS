import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/map', label: 'Map', icon: '🗺' },
  { path: '/numbers', label: 'Numbers', icon: '📞' },
  { path: '/chatbot', label: 'First Aid', icon: '🩺' },
  { path: '/more', label: 'More', icon: '☰' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          aria-label={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
