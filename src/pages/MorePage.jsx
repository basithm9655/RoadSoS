import { Link } from 'react-router-dom';

const MORE_ITEMS = [
  { path: '/family', label: '👨‍👩‍👧 Family & Friends', desc: 'Manage emergency contacts' },
  { path: '/community', label: '🤝 First Aid Community', desc: 'Find medical volunteers' },
  { path: '/crowd-rescue', label: '📡 Crowd Rescue Network', desc: 'Volunteer responder network' },
  { path: '/ambulance-dashboard', label: '🚑 Ambulance Panel', desc: 'Driver login & dashboard' },
  { path: '/settings', label: '⚙️ Settings', desc: 'Profile, API keys, preferences' },
];

export default function MorePage() {
  return (
    <div className="page more-page">
      <div className="page-header">
        <h1 className="page-title">More</h1>
      </div>
      <div className="more-list">
        {MORE_ITEMS.map(item => (
          <Link key={item.path} to={item.path} className="more-item">
            <div className="more-item-info">
              <span className="more-item-label">{item.label}</span>
              <span className="more-item-desc">{item.desc}</span>
            </div>
            <span className="more-chevron">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
