const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

/**
 * Robust facility query using GET requests (avoids CORS blocks on mobile/WebView).
 * Auto-falls back through 3 global Overpass mirrors if any fails.
 */
export async function queryNearbyFacilities(lat, lon, radius = 5000) {
  const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:${radius},${lat},${lon});node["amenity"="clinic"](around:${radius},${lat},${lon});node["amenity"="police"](around:${radius},${lat},${lon});node["amenity"="fire_station"](around:${radius},${lat},${lon});node["amenity"="pharmacy"](around:${radius},${lat},${lon}););out body;`;

  let lastError = null;

  for (const mirrorUrl of OVERPASS_MIRRORS) {
    try {
      console.log(`[Overpass] Querying: ${mirrorUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Use GET request — avoids CORS preflight blocks on mobile/WebView
      const url = `${mirrorUrl}?data=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('Malformed response');

      console.log(`[Overpass] Got ${data.elements.length} results from ${mirrorUrl}`);

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
      console.warn(`[Overpass] Mirror ${mirrorUrl} failed: ${e.message}`);
      lastError = e;
    }
  }

  throw lastError || new Error('All Overpass mirrors unreachable');
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
  return [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
  ].filter(Boolean).join(', ') || null;
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
