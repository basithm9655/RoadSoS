import { NavLink } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

export default function BottomNav() {
  const { t } = useLang();

  const NAV_ITEMS = [
    { path: '/', label: t('navHome'), icon: '🏠' },
    { path: '/map', label: t('navMap'), icon: '🗺' },
    { path: '/numbers', label: t('navNumbers'), icon: '📞' },
    { path: '/chatbot', label: t('navFirstAid'), icon: '🩺' },
    { path: '/more', label: t('navMore'), icon: '☰' },
  ];

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
