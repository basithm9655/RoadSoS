const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function queryNearbyFacilities(lat, lon, radius = 5000) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lon});
      node["amenity"="clinic"](around:${radius},${lat},${lon});
      node["amenity"="police"](around:${radius},${lat},${lon});
      node["amenity"="fire_station"](around:${radius},${lat},${lon});
      node["amenity"="pharmacy"](around:${radius},${lat},${lon});
    );
    out body;
  `;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!res.ok) throw new Error('Overpass API error');
  const data = await res.json();

  return data.elements.map(el => ({
    id: el.id,
    type: el.tags?.amenity || 'unknown',
    name: el.tags?.name || el.tags?.['name:en'] || getFacilityDefault(el.tags?.amenity),
    lat: el.lat,
    lon: el.lon,
    phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
    website: el.tags?.website || null,
    opening_hours: el.tags?.opening_hours || null,
    address: buildAddress(el.tags),
  }));
}

function getFacilityDefault(amenity) {
  const defaults = {
    hospital: 'Hospital',
    clinic: 'Clinic',
    police: 'Police Station',
    fire_station: 'Fire Station',
    pharmacy: 'Pharmacy',
  };
  return defaults[amenity] || 'Facility';
}

function buildAddress(tags = {}) {
  const parts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
  ].filter(Boolean);
  return parts.join(', ') || null;
}

export const FACILITY_COLORS = {
  hospital: '#E53935',
  clinic: '#43A047',
  police: '#1565C0',
  fire_station: '#FF6D00',
  pharmacy: '#00897B',
};

export const FACILITY_ICONS = {
  hospital: '🏥',
  clinic: '🩺',
  police: '👮',
  fire_station: '🚒',
  pharmacy: '💊',
};

export const FACILITY_LABELS = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  police: 'Police',
  fire_station: 'Fire Station',
  pharmacy: 'Pharmacy',
};
