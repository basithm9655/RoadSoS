const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter'
];

/**
 * PARALLEL RACE strategy — global high-availability mirrors queried simultaneously.
 * Whichever responds first wins. Dramatically faster than sequential fallback.
 * Uses POST requests to avoid CORS preflight blocks on mobile/WebView and prevent 406 blocks.
 * If all fail or offline, automatically returns hyper-localized realistic mock fallback data.
 */
export async function queryNearbyFacilities(lat, lon, radius = 15000) {
  // Query node, way, and relation (nwr) to find all matching facilities,
  // and use 'out center;' to get coordinate centers for polygons (ways/relations).
  const query = `[out:json][timeout:20];(nwr["amenity"="hospital"](around:${radius},${lat},${lon});nwr["amenity"="clinic"](around:${radius},${lat},${lon});nwr["amenity"="police"](around:${radius},${lat},${lon});nwr["amenity"="fire_station"](around:${radius},${lat},${lon});nwr["amenity"="pharmacy"](around:${radius},${lat},${lon});nwr["shop"="car_repair"](around:${radius},${lat},${lon});nwr["emergency"="roadside_assistance"](around:${radius},${lat},${lon}););out center;`;

  // Launch all mirrors simultaneously — first success wins
  const mirrorRaces = OVERPASS_MIRRORS.map(async (mirrorUrl) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout per mirror
    try {
      const res = await fetch(mirrorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.elements)) throw new Error('Bad response');
      if (data.elements.length === 0) {
        throw new Error('Zero emergency facilities returned by this mirror');
      }
      return data.elements;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  });

  // promiseAny: polyfill for Android Chrome < 89 which lacks Promise.any
  function promiseAny(promises) {
    return new Promise((resolve, reject) => {
      let rejCount = 0;
      const errors = [];
      promises.forEach((p, i) => {
        Promise.resolve(p).then(resolve).catch(err => {
          errors[i] = err;
          rejCount++;
          if (rejCount === promises.length) {
            const msg = 'All mirrors failed: ' + errors.map(e => e.message || e).join(', ');
            const errObj = typeof AggregateError !== 'undefined'
              ? new AggregateError(errors, msg)
              : new Error(msg);
            reject(errObj);
          }
        });
      });
    });
  }

  try {
    const elements = await promiseAny(mirrorRaces);

    if (!elements || elements.length === 0) {
      throw new Error('Zero emergency facilities found on OpenStreetMap in this radius');
    }

    return elements.map(el => {
      let type = 'unknown';
      if (el.tags?.amenity) {
        type = el.tags.amenity;
      } else if (el.tags?.shop === 'car_repair') {
        type = 'car_repair';
      } else if (el.tags?.emergency === 'roadside_assistance') {
        type = 'car_repair'; // Map to car_repair category
      }

      return {
        id: el.id,
        type,
        name: el.tags?.name || el.tags?.['name:en'] || getFacilityDefault(type),
        lat: el.lat || el.center?.lat,
        lon: el.lon || el.center?.lon,
        phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
        website: el.tags?.website || null,
        opening_hours: el.tags?.opening_hours || null,
        address: buildAddress(el.tags),
      };
    });
  } catch (err) {
    // If online, do NOT return fake mock data. Propagate the error so that the app correctly shows a real busy/offline state.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      throw err;
    }

    console.warn('[Overpass] Real mirrors failed or device offline. Generating highly realistic local fallback data:', err.message);

    // Create 7 high-fidelity fallback facilities offset from user coordinates
    const mockData = [
      {
        id: 'mock-hosp',
        type: 'hospital',
        name: 'Metro Life Emergency Hospital',
        lat: lat + 0.0034,
        lon: lon - 0.0041,
        phone: '044-28271010',
        address: '12 Emergency St, Central Zone',
        website: 'https://roadsos.org',
        isMock: true
      },
      {
        id: 'mock-clinic',
        type: 'clinic',
        name: 'Prime Diagnostic & Medical Clinic',
        lat: lat - 0.0028,
        lon: lon + 0.0035,
        phone: '044-24356789',
        address: '45 Health Ave, West Road',
        isMock: true
      },
      {
        id: 'mock-police',
        type: 'police',
        name: 'Central District Police Headquarters',
        lat: lat + 0.0051,
        lon: lon + 0.0012,
        phone: '100',
        address: '1 Law Enforcement Rd',
        isMock: true
      },
      {
        id: 'mock-fire',
        type: 'fire_station',
        name: 'Metro Fire Station & Emergency Rescue',
        lat: lat - 0.0042,
        lon: lon - 0.0025,
        phone: '101',
        address: '77 Safety Boulevard',
        isMock: true
      },
      {
        id: 'mock-pharm',
        type: 'pharmacy',
        name: '24/7 Wellness Emergency Pharmacy',
        lat: lat + 0.0015,
        lon: lon - 0.0022,
        phone: '044-24419999',
        address: '3 Pharmacy Plaza, Market Rd',
        isMock: true
      },
      {
        id: 'mock-mech1',
        type: 'car_repair',
        name: 'RoadSOS Emergency Towing & Mechanic',
        lat: lat + 0.0025,
        lon: lon + 0.0048,
        phone: '044-28889999',
        address: '88 Express Highway Service Rd',
        isMock: true
      },
      {
        id: 'mock-mech2',
        type: 'car_repair',
        name: 'Highway Rescue Towing Service',
        lat: lat - 0.0035,
        lon: lon - 0.0052,
        phone: '044-29990000',
        address: 'A-2 Bypass Link',
        isMock: true
      }
    ];

    return mockData;
  }
}

function getFacilityDefault(type) {
  return FACILITY_LABELS[type] || 'Facility';
}

function buildAddress(tags = {}) {
  return [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:state']]
    .filter(Boolean).join(', ') || null;
}

export const FACILITY_COLORS = {
  hospital: '#E53935',
  clinic: '#43A047',
  police: '#1565C0',
  fire_station: '#FF6D00',
  pharmacy: '#00897B',
  car_repair: '#7C3AED',
  roadside_assistance: '#7C3AED',
  unknown: '#666'
};

export const FACILITY_ICONS = {
  hospital: '🏥',
  clinic: '🩺',
  police: '👮',
  fire_station: '🚒',
  pharmacy: '💊',
  car_repair: '🔧',
  roadside_assistance: '🔧',
  unknown: '📍'
};

export const FACILITY_LABELS = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  police: 'Police',
  fire_station: 'Fire Station',
  pharmacy: 'Pharmacy',
  car_repair: 'Mechanic / Towing',
  roadside_assistance: 'Roadside Assist',
  unknown: 'Facility'
};
