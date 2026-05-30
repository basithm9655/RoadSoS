import { formatDistance } from '../utils/haversine';

export default function AmbulanceCard({ event, driverLocation, onAccept, onNavigate, accepted }) {
  const dist = driverLocation && event.lat && event.lon
    ? require('../utils/haversine').haversine(driverLocation.lat, driverLocation.lon, event.lat, event.lon)
    : null;

  const elapsed = event.timestamp?.seconds
    ? Math.floor(Date.now() / 1000 - event.timestamp.seconds)
    : null;

  const formatElapsed = (secs) => {
    if (!secs) return 'Just now';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s ago`;
    return `${m}m ${s}s ago`;
  };

  const mapsLink = `https://www.google.com/maps/dir/${driverLocation?.lat || ''},${driverLocation?.lon || ''}/${event.lat},${event.lon}`;

  return (
    <div className={`ambulance-card ${accepted ? 'ambulance-card-accepted' : ''}`}>
      <div className="amb-card-header">
        <div className="amb-status-dot" />
        <span className="amb-status-text">{accepted ? 'ACCEPTED' : 'PENDING'}</span>
        <span className="amb-time">{formatElapsed(elapsed)}</span>
      </div>

      <h3 className="amb-victim-name">🆘 {event.userName || 'Unknown Victim'}</h3>

      <div className="amb-details">
        {dist !== null && (
          <div className="amb-detail-item">
            <span>📏</span>
            <span>{formatDistance(dist)} away</span>
          </div>
        )}
        <div className="amb-detail-item">
          <span>📍</span>
          <span>{event.lat?.toFixed(4)}, {event.lon?.toFixed(4)}</span>
        </div>
      </div>

      <div className="amb-actions">
        {!accepted && (
          <button className="amb-btn amb-btn-accept" onClick={() => onAccept(event.id)}>
            ✅ Accept
          </button>
        )}
        <a href={mapsLink} target="_blank" rel="noreferrer" className="amb-btn amb-btn-nav">
          🗺 Navigate
        </a>
      </div>
    </div>
  );
}
