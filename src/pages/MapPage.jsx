import { useState, useEffect } from 'react';
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
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

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

  // 2. Synchronize and trigger reload when live location resolves
  useEffect(() => {
    if (liveLocation) {
      setLocation(liveLocation);
      localStorage.setItem('roadsos_last_loc', JSON.stringify(liveLocation));
      loadFacilities(liveLocation);
    }
  }, [liveLocation]);

  async function loadFacilities(targetLoc = location) {
    const activeLoc = targetLoc || liveLocation;
    if (!activeLoc) return;

    setLoading(true);
    setError(null);
    try {
      const results = await queryNearbyFacilities(activeLoc.lat, activeLoc.lon);
      const sorted = results.sort((a, b) =>
        haversine(activeLoc.lat, activeLoc.lon, a.lat, a.lon) -
        haversine(activeLoc.lat, activeLoc.lon, b.lat, b.lon)
      );
      setFacilities(sorted);
      localStorage.setItem('roadsos_facilities', JSON.stringify(sorted));
    } catch (e) {
      console.warn('MapPage network error loading facilities:', e);
      setError('📡 Offline mode — showing cached facilities.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === 'all' ? facilities : facilities.filter(f => f.type === filter);

  return (
    <div className="page map-page">
      <div className="page-header">
        <h1 className="page-title">🗺 Nearest Facilities</h1>
        <button className="refresh-btn" onClick={() => loadFacilities(location)} disabled={loading}>
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {locLoading && !location && (
        <div className="skeleton-banner" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60A5FA' }}>
          📡 Resolving GPS satellite lock...
        </div>
      )}

      {error && (
        <div className="error-banner" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#FCA5A5', padding: '10px 14px', borderRadius: '12px', marginBottom: '14px', fontSize: '12px', fontWeight: '700' }}>
          {error}
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
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No {filter === 'all' ? 'facilities' : FACILITY_LABELS[filter] + 's'} cached near this zone</p>
          </div>
        ) : (
          filtered.map(f => (
            <FacilityCard key={f.id} facility={f} userLocation={location} />
          ))
        )}
      </div>
    </div>
  );
}
