const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

/**
 * Robust fetch for nearby facilities with multi-mirror automatic fallback.
 * Bypasses Overpass server rate limits and outages.
 */
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

  let lastError = null;

  // Try each mirror sequentially until one succeeds
  for (const mirrorUrl of OVERPASS_MIRRORS) {
    try {
      console.log(`Querying facilities from Overpass mirror: ${mirrorUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second limit per mirror

      const res = await fetch(mirrorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.elements) {
        throw new Error('Malformed API response');
      }

      console.log(`Overpass mirror ${mirrorUrl} successfully loaded ${data.elements.length} facilities.`);

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
    } catch (e) {
      console.warn(`Overpass mirror ${mirrorUrl} failed:`, e.message || e);
      lastError = e;
    }
  }

  // If all mirrors failed, throw the final error
  throw lastError || new Error('All Overpass API mirrors are currently unreachable');
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
