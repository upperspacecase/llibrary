/**
 * Geometry helpers — polygon calculations, coordinate utilities
 */

const EARTH_RADIUS = 6371000; // meters

/**
 * Polygon area on the sphere (Bevis-Cambareri / Karney form).
 * For each vertex i: term_i = (λ_{i+1} - λ_{i-1}) · sin(φ_i), all in radians.
 * Area = | R² · Σ term_i / 2 |.
 *
 * The previous implementation indexed `coords[i+2][0]` instead of `coords[i][0]`,
 * which understated area by ~50% on small polygons (a 1° equatorial square
 * returned ~6,200 km² where the true value is ~12,365 km²).
 *
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @returns {number} Area in square meters
 */
export function polygonArea(coords) {
  if (!coords || coords.length < 3) return 0;

  const toRad = d => d * Math.PI / 180;
  const n = coords.length;
  let total = 0;

  for (let i = 0; i < n; i++) {
    const prev = coords[(i - 1 + n) % n];
    const curr = coords[i];
    const next = coords[(i + 1) % n];
    total += (toRad(next[1]) - toRad(prev[1])) * Math.sin(toRad(curr[0]));
  }

  return Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
}

/**
 * Calculate perimeter of a polygon.
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @returns {number} Perimeter in meters
 */
export function polygonPerimeter(coords) {
  if (!coords || coords.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    perimeter += haversineDistance(coords[i], coords[j]);
  }
  return perimeter;
}

/**
 * Calculate centroid of a polygon.
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @returns {[number, number]} [lat, lng] of centroid
 */
export function polygonCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  const n = coords.length;
  const lat = coords.reduce((s, c) => s + c[0], 0) / n;
  const lng = coords.reduce((s, c) => s + c[1], 0) / n;
  return [lat, lng];
}

/**
 * Get bounding box of a polygon.
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @returns {[number, number, number, number]} [south, west, north, east]
 */
export function polygonBounds(coords) {
  if (!coords || coords.length === 0) return [0, 0, 0, 0];
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  coords.forEach(([lat, lng]) => {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  });
  return [south, west, north, east];
}

/**
 * Check if a point is inside a polygon (ray casting algorithm).
 */
export function pointInPolygon(point, polygon) {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Haversine distance between two points.
 * @param {[number, number]} p1 - [lat, lng]
 * @param {[number, number]} p2 - [lat, lng]
 * @returns {number} Distance in meters
 */
export function haversineDistance(p1, p2) {
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(p2[0] - p1[0]);
  const dLng = toRad(p2[1] - p1[1]);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[0])) * Math.cos(toRad(p2[0])) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Convert square meters to hectares.
 */
export function sqmToHectares(sqm) {
  return sqm / 10000;
}

/**
 * Format area with appropriate unit.
 */
export function formatArea(sqm) {
  const ha = sqmToHectares(sqm);
  if (ha >= 100) return `${(ha / 100).toFixed(1)} km²`;
  if (ha >= 1) return `${ha.toFixed(2)} ha`;
  return `${Math.round(sqm)} m²`;
}

/**
 * Format distance with appropriate unit.
 */
export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/**
 * Convert polygon coords to GeoJSON.
 */
export function toGeoJSON(coords) {
  if (!coords || coords.length < 3) return null;
  const ring = coords.map(([lat, lng]) => [lng, lat]);
  // Close the ring
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([...ring[0]]);
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {},
  };
}

/**
 * Convert GeoJSON polygon back to [lat, lng] coords.
 */
export function fromGeoJSON(geojson) {
  if (!geojson || !geojson.geometry || geojson.geometry.type !== 'Polygon') return [];
  const ring = geojson.geometry.coordinates[0];
  return ring.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

/**
 * Expand a bounding box by a given percentage.
 */
export function expandBounds(bbox, factor = 0.1) {
  const [south, west, north, east] = bbox;
  const latPad = (north - south) * factor;
  const lngPad = (east - west) * factor;
  return [south - latPad, west - lngPad, north + latPad, east + lngPad];
}
