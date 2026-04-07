/**
 * Google Pollen API — pollinator activity proxy
 * Requires GOOGLE_API_KEY in environment.
 * https://developers.google.com/maps/documentation/pollen
 */

const BASE = 'https://pollen.googleapis.com/v1/forecast:lookup';

/**
 * Fetch pollen forecast for a location.
 * Returns Universal Pollen Index (UPI) for grass, tree, and weed pollen types.
 * Higher pollen activity = more pollinator-supporting flora.
 * @param {number} lat
 * @param {number} lng
 * @param {number} days - forecast days (1-5)
 * @returns {{ grass: number|null, tree: number|null, weed: number|null, score: number }}
 */
export async function getPollenIndex(lat, lng, days = 5) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY not set');

  const url = `${BASE}?key=${key}&location.latitude=${lat}&location.longitude=${lng}&days=${days}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Pollen API error: ${res.status}`);
  const data = await res.json();

  const dailyInfo = data.dailyInfo || [];
  if (!dailyInfo.length) return { grass: null, tree: null, weed: null, score: null };

  // Collect UPI values across all days for each pollen type
  const indices = { GRASS: [], TREE: [], WEED: [] };
  for (const day of dailyInfo) {
    for (const pt of (day.pollenTypeInfo || [])) {
      if (indices[pt.code] && pt.indexInfo?.value != null) {
        indices[pt.code].push(pt.indexInfo.value);
      }
    }
  }

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : null;

  const grass = avg(indices.GRASS);
  const tree = avg(indices.TREE);
  const weed = avg(indices.WEED);

  // Derive pollination score (0-100): higher pollen = more active pollinator flora
  // UPI scale: 0-5 per type. Sum of 3 types max = 15. Map to 0-100.
  const validValues = [grass, tree, weed].filter(v => v != null);
  const totalUPI = validValues.reduce((a, b) => a + b, 0);
  const score = validValues.length > 0
    ? Math.min(100, Math.round((totalUPI / (validValues.length * 5)) * 100))
    : null;

  return { grass, tree, weed, score };
}
