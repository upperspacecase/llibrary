/**
 * Nominatim (OpenStreetMap) — Geocoding & Reverse Geocoding
 * Free, rate-limited to 1 req/sec. No API key needed.
 * https://nominatim.org/release-docs/develop/api/
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'User-Agent': 'Libraries/1.0 (bioregional-wiki)' };

export async function geocode(query, options = {}) {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: String(options.limit || 5),
  });
  if (options.countrycodes) params.set('countrycodes', options.countrycodes);
  if (options.viewbox) params.set('viewbox', options.viewbox);
  if (options.bounded) params.set('bounded', '1');

  const res = await fetchWithPolicy(`${BASE}/search?${params}`, { headers: HEADERS }, {
    source: 'nominatim-search', timeoutMs: 5000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
  return res.json();
}

export async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lng),
    zoom: '16',
  });
  const res = await fetchWithPolicy(`${BASE}/reverse?${params}`, { headers: HEADERS }, {
    source: 'nominatim-reverse', timeoutMs: 5000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Nominatim reverse error: ${res.status}`);
  return res.json();
}

export async function lookupOsmId(osmType, osmId) {
  const prefix = { node: 'N', way: 'W', relation: 'R' }[osmType] || osmType.charAt(0).toUpperCase();
  const params = new URLSearchParams({
    format: 'json',
    osm_ids: `${prefix}${osmId}`,
    polygon_geojson: '1',
  });
  const res = await fetchWithPolicy(`${BASE}/lookup?${params}`, { headers: HEADERS }, {
    source: 'nominatim-lookup', timeoutMs: 5000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Nominatim lookup error: ${res.status}`);
  return res.json();
}
