/**
 * Generate a Landbook from the most recent waitlist submission.
 * Geocodes the address, creates a synthetic boundary, calls all 15 data APIs
 * in parallel, and saves the complete landbook to MongoDB.
 *
 * Run: node scripts/generate-landbook.js
 */
import { readFileSync } from 'fs';

// Load .env.local into process.env BEFORE any other imports
const envLines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n');
for (const line of envLines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// Shim import.meta.env for browser-side API modules (nasa-firms, openrouteservice)
import.meta.env = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))
);

// Dynamic imports — must happen after env is loaded (api/_db.js reads MONGODB_URI at top-level)
const { getCollection } = await import('../api/_db.js');
const { polygonArea, polygonPerimeter, polygonBounds, expandBounds } = await import('../src/lib/geo.js');
// Mapbox Geocoding (better than Nominatim for addresses)
const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;
async function geocodeMapbox(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=false&limit=5&types=address,place,locality,neighborhood,poi`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox geocoding error: ${res.status}`);
  const data = await res.json();
  return data.features || [];
}
const { getForecast, getClimateAverages, getElevation } = await import('../src/api/open-meteo.js');
const { getSoilProperties, getSoilClassification } = await import('../src/api/soilgrids.js');
const { getWaterFeatures, getInfrastructure } = await import('../src/api/overpass.js');
const { getSpeciesCounts, getThreatenedSpecies } = await import('../src/api/inaturalist.js');
const { getSpeciesOccurrences } = await import('../src/api/gbif.js');
const { getActiveFiresNearby } = await import('../src/api/nasa-firms.js');
const { getFloodForecastWithHistory } = await import('../src/api/flood.js');
const { getGeology } = await import('../src/api/macrostrat.js');
const { getProtectedAreas } = await import('../src/api/natura2000.js');
const { fetchRiskScores } = await import('../src/api/risk-scores.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout(promise, ms = 30000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

function createSyntheticBoundary(lat, lng) {
  const offset = 0.00045; // ~50m in latitude
  const lngOff = offset / Math.cos(lat * Math.PI / 180);
  return [
    [lat - offset, lng - lngOff],
    [lat - offset, lng + lngOff],
    [lat + offset, lng + lngOff],
    [lat + offset, lng - lngOff],
  ];
}

function snippet(data) {
  if (data == null) return 'null';
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') return data.slice(0, 60);
  if (Array.isArray(data)) return `[${data.length} items]`;
  const keys = Object.keys(data);
  return `{${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', ...' : ''}}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const startTime = Date.now();

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║          LANDBOOK GENERATOR — Batch Script                  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// --- Data classification ---
console.log('┌─ DATA CLASSIFICATION ─────────────────────────────────────────┐');
console.log('│ REAL (15 live APIs):                                          │');
console.log('│  1. Elevation ............... Open-Meteo (free, no key)       │');
console.log('│  2. Weather Forecast ........ Open-Meteo (free, no key)       │');
console.log('│  3. 30yr Climate Averages ... Open-Meteo Archive (free)       │');
console.log('│  4. Soil Properties ......... SoilGrids/ISRIC (free)          │');
console.log('│  5. Soil Classification ..... SoilGrids/ISRIC (free)          │');
console.log('│  6. Species Counts .......... iNaturalist (free)              │');
console.log('│  7. Threatened Species ...... iNaturalist (free)              │');
console.log('│  8. Water Features .......... Overpass/OSM (free)             │');
console.log('│  9. Species Occurrences ..... GBIF (free)                     │');
console.log('│ 10. Flood Forecast .......... Open-Meteo Flood (free)         │');
console.log('│ 11. Infrastructure .......... Overpass/OSM (free)             │');
console.log('│ 12. Geology ................ Macrostrat (free)                │');
console.log('│ 13. Protected Areas ......... Overpass/OSM (free)             │');
console.log('│ 14. Risk Scores ............ Computed from Open-Meteo         │');
console.log('│ 15. Active Fires ........... NASA FIRMS (key: VITE_FIRMS_KEY) │');
console.log('│                                                               │');
console.log('│ SYNTHETIC:                                                    │');
console.log('│  • Boundary polygon — ~1ha square around geocoded center      │');
console.log('│  • Area / Perimeter — calculated from synthetic boundary      │');
console.log('│                                                               │');
console.log('│ HARDCODED:                                                    │');
console.log('│  • Drought baseline uses Odemira rainfall (not location-aware)│');
console.log('│  • Erosion risk — not yet backed by API                       │');
console.log('└───────────────────────────────────────────────────────────────┘\n');

// --- Step 1: Get most recent waitlist entry ---
console.log('Step 1: Fetching most recent waitlist entry...');
const waitlistCol = await getCollection('waitlist');
const entry = await waitlistCol.find({}).sort({ createdAt: -1 }).limit(1).next();

if (!entry) {
  console.error('No waitlist entries found. Exiting.');
  process.exit(1);
}

console.log(`  Email:   ${entry.email}`);
console.log(`  Address: ${entry.address || '(none)'}`);
console.log(`  Date:    ${entry.createdAt}`);
console.log(`  Location:${entry.location ? ` ${entry.location.lat}, ${entry.location.lng}` : ' (none — will geocode)'}\n`);

// --- Step 2: Get coordinates ---
console.log('Step 2: Resolving coordinates...');
let lat, lng;

if (entry.location && entry.location.lat && entry.location.lng) {
  lat = entry.location.lat;
  lng = entry.location.lng;
  console.log(`  Using stored location: ${lat}, ${lng}\n`);
} else if (entry.address) {
  console.log(`  Geocoding "${entry.address}" via Mapbox...`);
  const features = await geocodeMapbox(entry.address);
  if (!features || features.length === 0) {
    console.error('  Geocoding failed — no results. Exiting.');
    process.exit(1);
  }
  // Mapbox returns [lng, lat] in feature.center
  lng = features[0].center[0];
  lat = features[0].center[1];
  console.log(`  Geocoded to: ${lat}, ${lng} (${features[0].place_name})\n`);
} else {
  console.error('  No address or location available. Exiting.');
  process.exit(1);
}

// --- Step 3: Create synthetic boundary ---
console.log('Step 3: Creating synthetic boundary (~1ha square)...');
const boundary = createSyntheticBoundary(lat, lng);
const center = [lat, lng];
const area = polygonArea(boundary);
const perimeter = polygonPerimeter(boundary);
const bounds = expandBounds(polygonBounds(boundary), 0.5);

console.log(`  Area:      ${(area / 10000).toFixed(2)} ha (${Math.round(area)} m²)`);
console.log(`  Perimeter: ${Math.round(perimeter)} m`);
console.log(`  Bounds:    [${bounds.map(b => b.toFixed(4)).join(', ')}]\n`);

// --- Step 4: Create landbook record ---
console.log('Step 4: Creating landbook record in MongoDB...');
const landbooksCol = await getCollection('landbooks');
const landbookId = crypto.randomUUID();
const doc = {
  id: landbookId,
  boundary,
  center,
  area,
  perimeter,
  address: entry.address || '',
  email: entry.email,
  autoData: {},
  userReported: {},
  source: 'batch-generate',
  syntheticBoundary: true,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
};
await landbooksCol.insertOne(doc);
console.log(`  Landbook ID: ${landbookId}`);
console.log(`  URL: /landbook?id=${landbookId}\n`);

// --- Step 5: Fetch all data in parallel ---
console.log('Step 5: Calling 15 APIs in parallel...\n');

const tasks = [
  { key: 'elevation',      fn: () => getElevation(lat, lng) },
  { key: 'forecast',       fn: () => getForecast(lat, lng) },
  { key: 'climate',        fn: () => getClimateAverages(lat, lng) },
  { key: 'soilProps',      fn: () => getSoilProperties(lat, lng) },
  { key: 'soilClass',      fn: () => getSoilClassification(lat, lng) },
  { key: 'species',        fn: () => getSpeciesCounts(lat, lng, 5) },
  { key: 'threatened',     fn: () => getThreatenedSpecies(lat, lng, 10) },
  { key: 'water',          fn: () => getWaterFeatures(bounds) },
  { key: 'gbif',           fn: () => getSpeciesOccurrences(lat, lng, 10) },
  { key: 'activeFires',    fn: () => getActiveFiresNearby(lat, lng, 50) },
  { key: 'flood',          fn: () => getFloodForecastWithHistory(lat, lng) },
  { key: 'infrastructure', fn: () => getInfrastructure(bounds) },
  { key: 'geology',        fn: () => getGeology(lat, lng) },
  { key: 'protectedAreas', fn: () => getProtectedAreas(lat, lng, 25) },
  { key: 'riskScores',     fn: () => fetchRiskScores(lat, lng) },
];

const results = await Promise.allSettled(
  tasks.map(t => withTimeout(t.fn(), 30000))
);

const autoData = { lastFetched: new Date().toISOString() };
let okCount = 0;
let failCount = 0;

tasks.forEach((t, i) => {
  const r = results[i];
  const pad = t.key.padEnd(16);
  if (r.status === 'fulfilled') {
    autoData[t.key] = r.value;
    okCount++;
    console.log(`  ✓ ${pad} OK    ${snippet(r.value)}`);
  } else {
    failCount++;
    console.log(`  ✗ ${pad} FAIL  ${r.reason?.message || r.reason}`);
  }
});

console.log(`\n  Results: ${okCount} OK, ${failCount} failed\n`);

// --- Step 6: Save autoData back ---
console.log('Step 6: Saving autoData to MongoDB...');
await landbooksCol.updateOne(
  { id: landbookId },
  { $set: { autoData, updated: new Date().toISOString() } }
);
console.log('  Saved.\n');

// --- Summary ---
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  COMPLETE                                                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`  Email:       ${entry.email}`);
console.log(`  Address:     ${entry.address || '(none)'}`);
console.log(`  Coordinates: ${lat}, ${lng}`);
console.log(`  Landbook ID: ${landbookId}`);
console.log(`  APIs:        ${okCount}/${tasks.length} succeeded`);
console.log(`  Time:        ${elapsed}s\n`);

process.exit(0);
