import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FACILITY_COLORS, FACILITY_ICONS, FACILITY_LABELS } from '../utils/overpassQuery';
import { haversine, formatDistance } from '../utils/haversine';

// Fix leaflet default icon path issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createFacilityIcon(type) {
  return L.divIcon({
    html: `<div class="map-marker" style="background:${FACILITY_COLORS[type] || '#666'}">${FACILITY_ICONS[type] || '📍'}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function createUserIcon() {
  return L.divIcon({
    html: `<div class="user-marker">📍</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

export default function MapView({ userLocation, facilities }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  // Initialize Map with clean dark theme
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const defaultLat = userLocation.lat;
    const defaultLon = userLocation.lon;

    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
      tap: false,        // prevents ghost click / double-tap issues on Android Chrome
      tapTolerance: 15,  // looser tolerance for thick fingers
    }).setView([defaultLat, defaultLon], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, CartoDB',
      maxZoom: 20,
    }).addTo(mapInstanceRef.current);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update user marker
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lon], 14);

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lon], { icon: createUserIcon(), zIndexOffset: 1000 })
      .addTo(mapInstanceRef.current)
      .bindPopup('<b>📍 You are here</b>');
  }, [userLocation]);

  // Update facility markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    facilities.forEach(f => {
      const dist = userLocation ? haversine(userLocation.lat, userLocation.lon, f.lat, f.lon) : null;
      const mapsLink = `https://www.google.com/maps/dir/${userLocation?.lat || ''},${userLocation?.lon || ''}/${f.lat},${f.lon}`;
      const callBtn = f.phone ? `<a href="tel:${f.phone}" style="background:#E53935;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">📞 Call</a>` : '';
      const navBtn = `<a href="${mapsLink}" target="_blank" style="background:#1565C0;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">🗺 Navigate</a>`;

      const popup = `
        <div style="font-family:sans-serif;min-width:160px;color:#1e293b;">
          <b style="font-size:14px;color:#0f172a">${f.name}</b><br>
          <span style="font-size:12px;color:#64748b;font-weight:600">${FACILITY_LABELS[f.type] || f.type}</span><br>
          ${dist ? `<span style="font-size:12px;color:#3b82f6;font-weight:700">📏 ${formatDistance(dist)}</span><br>` : ''}
          ${f.address ? `<span style="font-size:11px;color:#94a3b8">${f.address}</span><br>` : ''}
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">${callBtn}${navBtn}</div>
        </div>
      `;

      // Crisp vector markers
      const marker = L.marker([f.lat, f.lon], { icon: createFacilityIcon(f.type) })
        .addTo(mapInstanceRef.current)
        .bindPopup(popup);
      markersRef.current.push(marker);
    });
  }, [facilities, userLocation]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '340px' }} />
    </div>
  );
}
