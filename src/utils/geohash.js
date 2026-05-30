import ngeohash from 'ngeohash';

/**
 * Encode a lat/lon to a geohash string
 */
export function encode(lat, lon, precision = 7) {
  return ngeohash.encode(lat, lon, precision);
}

/**
 * Decode a geohash string to { latitude, longitude }
 */
export function decode(hash) {
  return ngeohash.decode(hash);
}

/**
 * Get geohash neighbors (for proximity search)
 */
export function neighbors(hash) {
  return ngeohash.neighbors(hash);
}

/**
 * Get all geohash prefixes for a bounding box query within a radius (meters)
 * Returns array of geohash strings to query
 */
export function getGeohashesForRadius(lat, lon, radiusM) {
  // Calculate appropriate precision
  const precision = radiusM < 100 ? 9 : radiusM < 500 ? 7 : radiusM < 5000 ? 6 : 5;
  const center = encode(lat, lon, precision);
  return [center, ...neighbors(center)];
}
