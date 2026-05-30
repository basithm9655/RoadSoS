import { haversine, formatDistance } from '../utils/haversine';
import { FACILITY_COLORS, FACILITY_ICONS, FACILITY_LABELS } from '../utils/overpassQuery';

export default function FacilityCard({ facility, userLocation }) {
  const dist = userLocation
    ? haversine(userLocation.lat, userLocation.lon, facility.lat, facility.lon)
    : null;

  const mapsLink = userLocation
    ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lon}/${facility.lat},${facility.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${facility.lat},${facility.lon}`;

  const color = FACILITY_COLORS[facility.type] || '#666';
  const icon = FACILITY_ICONS[facility.type] || '📍';
  const label = FACILITY_LABELS[facility.type] || facility.type;

  return (
    <div className="facility-card">
      <div className="facility-card-header">
        <div className="facility-icon-badge" style={{ background: color }}>
          {icon}
        </div>
        <div className="facility-info">
          <h3 className="facility-name">{facility.name}</h3>
          <span className="facility-type" style={{ color }}>{label}</span>
          {facility.address && <p className="facility-address">{facility.address}</p>}
        </div>
        {dist !== null && (
          <div className="facility-distance" style={{ color }}>
            <span className="distance-value">{formatDistance(dist)}</span>
            <span className="distance-label">away</span>
          </div>
        )}
      </div>
      <div className="facility-actions">
        {facility.phone && (
          <a href={`tel:${facility.phone}`} className="facility-btn facility-btn-call">
            📞 Call
          </a>
        )}
        <a href={mapsLink} target="_blank" rel="noreferrer" className="facility-btn facility-btn-nav">
          🗺 Navigate
        </a>
      </div>
    </div>
  );
}
