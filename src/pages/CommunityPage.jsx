import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

// Replace with your published Google Sheet CSV URL
// Sheet must be: File > Share > Publish to web > CSV format
const SHEET_CSV_URL = import.meta.env.VITE_COMMUNITY_SHEET_URL ||
  'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0';

const JOIN_FORM_URL = import.meta.env.VITE_COMMUNITY_FORM_URL ||
  'https://forms.google.com';

const ROLE_COLORS = {
  Doctor: '#E53935',
  Nurse: '#1565C0',
  Paramedic: '#2E7D32',
  'First Aider': '#6A1B9A',
};

const STATIC_VOLUNTEERS = [
  { Name: 'Dr. Arun Kumar', Role: 'Doctor', Phone: '9876543210', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Nurse Priya R', Role: 'Nurse', Phone: '9123456789', Area: 'Coimbatore', Available: 'yes' },
  { Name: 'Ramesh P', Role: 'Paramedic', Phone: '8765432109', Area: 'Tiruppur', Available: 'no' },
  { Name: 'Dr. Meena S', Role: 'Doctor', Phone: '7654321098', Area: 'Salem', Available: 'yes' },
  { Name: 'James T', Role: 'First Aider', Phone: '6543210987', Area: 'Erode', Available: 'yes' },
  { Name: 'Dr. Rajesh Sharma', Role: 'Doctor', Phone: '9944332211', Area: 'Chennai', Available: 'yes' },
  { Name: 'Nurse Sarah M', Role: 'Nurse', Phone: '9845123456', Area: 'Bangalore', Available: 'yes' },
  { Name: 'Vikram Singh', Role: 'Paramedic', Phone: '8877665544', Area: 'Mumbai', Available: 'yes' },
];

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i] || '' }), {});
  });
}

export default function CommunityPage() {
  const { showToast } = useToast();
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');

  useEffect(() => {
    const cached = localStorage.getItem('roadsos_community');
    if (cached) {
      try { setVolunteers(JSON.parse(cached)); setLoading(false); } catch (_) {}
    }
    loadCommunity();
  }, []);

  async function loadCommunity() {
    setLoading(true);
    try {
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error('Sheet fetch failed');
      const text = await res.text();
      const sheetData = parseCSV(text);
      // Merge sheet data with our rich local directory to show ALL contacts
      const merged = [...sheetData, ...STATIC_VOLUNTEERS.filter(sv => !sheetData.some(sd => sd.Phone === sv.Phone))];
      setVolunteers(merged);
      localStorage.setItem('roadsos_community', JSON.stringify(merged));
    } catch (err) {
      console.warn('Community load sheet warning:', err);
      // Fallback: make sure we definitely show all static volunteers
      setVolunteers(STATIC_VOLUNTEERS);
    } finally {
      setLoading(false);
    }
  }

  const roles = ['all', ...new Set(volunteers.map(v => v.Role).filter(Boolean))];
  const areas = [...new Set(volunteers.map(v => v.Area).filter(Boolean))];

  const filtered = volunteers.filter(v => {
    const matchRole = roleFilter === 'all' || v.Role === roleFilter;
    const matchArea = !areaFilter || (v.Area || '').toLowerCase().includes(areaFilter.toLowerCase());
    const matchSearch = !search ||
      (v.Name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.Area || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchArea && matchSearch;
  });

  return (
    <div className="page community-page">
      <div className="page-header">
        <h1 className="page-title">🤝 First Aid Community</h1>
        <button className="refresh-btn" onClick={loadCommunity} disabled={loading}>
          {loading ? '⏳' : '🔄'}
        </button>
      </div>
      <p className="page-sub">Volunteer medical professionals near you</p>

      <a href={JOIN_FORM_URL} target="_blank" rel="noreferrer" className="join-community-btn">
        🩺 Join as a Volunteer
      </a>

      <div className="search-bar-wrap">
        <input
          className="search-input"
          placeholder="🔍 Search by name or area..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        {roles.map(r => (
          <button
            key={r}
            className={`filter-tab ${roleFilter === r ? 'filter-tab-active' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r === 'all' ? 'All' : r}
          </button>
        ))}
      </div>

      <div className="area-filter">
        <select className="form-input" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
          <option value="">All Areas</option>
          {areas.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {loading && volunteers.length === 0 ? (
        <div className="community-grid">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="volunteer-card skeleton-card">
              <div className="skeleton-pulse" style={{ height: '120px', borderRadius: '16px' }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>No volunteers found matching your criteria</p>
        </div>
      ) : (
        <div className="community-grid">
          {filtered.map((v, i) => {
            const isAvailable = (v.Available || '').toLowerCase() === 'yes';
            const color = ROLE_COLORS[v.Role] || '#37474F';
            return (
              <div key={i} className="volunteer-card">
                <div className="volunteer-card-header">
                  <div className="volunteer-avatar" style={{ background: color }}>
                    {v.Name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="volunteer-meta">
                    <h3 className="volunteer-name">{v.Name}</h3>
                    <span className="volunteer-role" style={{ background: color }}>{v.Role}</span>
                  </div>
                  <div className={`availability-dot ${isAvailable ? 'available' : 'unavailable'}`} title={isAvailable ? 'Available' : 'Unavailable'} />
                </div>
                <div className="volunteer-details">
                  <span className="volunteer-area">📍 {v.Area}</span>
                  <span className={`volunteer-status ${isAvailable ? 'status-available' : 'status-busy'}`}>
                    {isAvailable ? '✅ Available' : '🔴 Busy'}
                  </span>
                </div>
                {v.Phone && (
                  <a href={`tel:${v.Phone}`} className="volunteer-call-btn" style={{ background: isAvailable ? 'var(--accent-blue)' : '#475569' }}>
                    📞 Contact: {v.Phone}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="community-footer">
        <p>Data from community volunteers. Always call 108 for professional help.</p>
      </div>
    </div>
  );
}
