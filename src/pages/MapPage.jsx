import { useState, useEffect, useRef } from 'react';
import MapView from '../components/MapView';
import FacilityCard from '../components/FacilityCard';
import { useGeolocation } from '../hooks/useGeolocation';
import { queryNearbyFacilities, FACILITY_LABELS } from '../utils/overpassQuery';
import { haversine } from '../utils/haversine';

const FILTERS = ['all', 'hospital', 'clinic', 'police', 'fire_station', 'pharmacy'];

export default function MapPage() {
  const { location: liveLocation, loading: locLoading } = useGeolocation();
  const [facilities, setFacilities] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [netStatus, setNetStatus] = useState('idle'); // idle | connecting | success | offline | busy
  const [filter, setFilter] = useState('all');
  const hasFetchedRef  = useRef(false);
  const lastFetchTime  = useRef(0);          // timestamp of last successful fetch
  const FETCH_COOLDOWN = 60 * 1000;          // 1 minute in ms

  // Track real-time online/offline changes
  useEffect(() => {
    const goOnline  = () => setNetStatus(prev => prev === 'offline' ? 'idle' : prev);
    const goOffline = () => setNetStatus('offline');
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    if (!navigator.onLine) setNetStatus('offline');
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // 1. Immediately load cached data on mount for offline visibility
  useEffect(() => {
    const cachedLoc = localStorage.getItem('roadsos_last_loc');
    if (cachedLoc) {
      try { setLocation(JSON.parse(cachedLoc)); } catch (_) {}
    }
    const cachedFac = localStorage.getItem('roadsos_facilities');
    if (cachedFac) {
      try { setFacilities(JSON.parse(cachedFac)); } catch (_) {}
    }
  }, []);

  // 2. When live GPS resolves, fetch fresh data (respecting 1-min cooldown)
  useEffect(() => {
    if (liveLocation && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setLocation(liveLocation);
      localStorage.setItem('roadsos_last_loc', JSON.stringify(liveLocation));
      loadFacilities(liveLocation, false);
    }
  }, [liveLocation]);

  async function loadFacilities(targetLoc = location, force = false) {
    const activeLoc = targetLoc || liveLocation;
    if (!activeLoc) return;
    if (!navigator.onLine) { setNetStatus('offline'); return; }

    // Throttle: skip if fetched within the last 1 minute (unless forced by user)
    if (!force && Date.now() - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('[MapPage] Skipping fetch — data is fresh (< 1 min old)');
      return;
    }

    setLoading(true);
    setNetStatus('connecting');
    try {
      const results = await queryNearbyFacilities(activeLoc.lat, activeLoc.lon);
      const sorted = results.sort((a, b) =>
        haversine(activeLoc.lat, activeLoc.lon, a.lat, a.lon) -
        haversine(activeLoc.lat, activeLoc.lon, b.lat, b.lon)
      );
      setFacilities(sorted);
      localStorage.setItem('roadsos_facilities', JSON.stringify(sorted));
      lastFetchTime.current = Date.now();   // record fetch timestamp
      setNetStatus('success');
      // Clear success badge after 3s
      setTimeout(() => setNetStatus('idle'), 3000);
    } catch (e) {
      console.warn('MapPage load error:', e);
      setNetStatus(!navigator.onLine ? 'offline' : 'busy');
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all' ? facilities : facilities.filter(f => f.type === filter);

  return (
    <div className="page map-page">
      <div className="page-header">
        <h1 className="page-title">🗺 Nearest Facilities</h1>
        <button className="refresh-btn" onClick={() => { hasFetchedRef.current = false; loadFacilities(location, true); }} disabled={loading}>
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {locLoading && !location && (
        <div className="status-banner status-gps">
          <span className="status-dot status-dot-pulse" />
          Acquiring GPS satellite lock…
        </div>
      )}

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'filter-tab-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : FACILITY_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="map-container">
        {facilities.length === 0 && loading ? (
          <div className="map-skeleton">
            <div className="skeleton-pulse" style={{ height: '100%' }} />
          </div>
        ) : (
          <MapView userLocation={location} facilities={filtered} />
        )}
      </div>

      {/* Beautiful connection status strip */}
      <NetworkStatusBar status={netStatus} loading={loading} />

      <div className="facilities-list">
        <h2 className="list-title">
          {filtered.length} {filter === 'all' ? 'Facilities' : FACILITY_LABELS[filter] + 's'} Nearby
        </h2>

        {facilities.length === 0 && loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="facility-card skeleton-card">
              <div className="skeleton-pulse" style={{ height: '80px', borderRadius: '12px' }} />
            </div>
          ))
        ) : filtered.length === 0 && netStatus !== 'connecting' ? (
          <EmptyState filter={filter} status={netStatus} onRetry={() => loadFacilities(location)} />
        ) : (
          filtered.map(f => (
            <FacilityCard key={f.id} facility={f} userLocation={location} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Network Status Bar ─── */
function NetworkStatusBar({ status, loading }) {
  if (status === 'idle') return null;

  const configs = {
    connecting: {
      bg:   'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.3)',
      color:  '#60A5FA',
      dot:    '#3B82F6',
      pulse:  true,
      text:   'Searching emergency facilities near you…',
      icon:   '📡',
    },
    success: {
      bg:   'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      color:  '#34D399',
      dot:    '#10B981',
      pulse:  false,
      text:   'Facilities updated successfully',
      icon:   '✅',
    },
    offline: {
      bg:   'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      color:  '#FCA5A5',
      dot:    '#EF4444',
      pulse:  true,
      text:   'You are offline — showing last known facilities',
      icon:   '📴',
    },
    busy: {
      bg:   'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      color:  '#FCD34D',
      dot:    '#F59E0B',
      pulse:  true,
      text:   'Servers slow — tap 🔄 to retry',
      icon:   '⚠️',
    },
  };

  const c = configs[status];
  if (!c) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 14px',
      borderRadius: '12px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      fontSize: '12px',
      fontWeight: '700',
      marginBottom: '12px',
      transition: 'all 0.3s ease',
    }}>
      <span style={{ fontSize: '15px' }}>{c.icon}</span>
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
        boxShadow: `0 0 6px ${c.dot}`,
        animation: c.pulse ? 'statusPulse 1.5s infinite' : 'none',
      }} />
      <span style={{ flex: 1 }}>{c.text}</span>
      {loading && (
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          border: `2px solid ${c.dot}`,
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
      )}
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ filter, status, onRetry }) {
  const isOffline = status === 'offline';
  const isBusy    = status === 'busy';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '12px', padding: '32px 20px',
      background: 'rgba(30, 41, 59, 0.4)', borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.05)',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '40px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
        {isOffline ? '📴' : isBusy ? '⏱️' : '🔍'}
      </span>
      <p style={{ fontWeight: '800', fontSize: '15px', color: 'white', margin: 0 }}>
        {isOffline ? 'You are offline' : isBusy ? 'Servers are slow' : `No ${filter === 'all' ? 'facilities' : filter.replace('_', ' ') + 's'} found nearby`}
      </p>
      <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
        {isOffline
          ? 'Connect to the internet and tap retry to find emergency facilities near you.'
          : isBusy
          ? 'The map data server is under load. Please wait a moment and try again.'
          : 'No results within 5km. Try refreshing or check your location settings.'}
      </p>
      <button onClick={onRetry} style={{
        marginTop: '4px',
        padding: '10px 24px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        color: 'white', border: 'none', fontWeight: '800', fontSize: '13px',
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
      }}>
        🔄 Retry Now
      </button>
    </div>
  );
}
