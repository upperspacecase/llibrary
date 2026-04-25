/**
 * Source Registry
 *
 * Maps every API source key (matching fetchAllData's entries array) to its
 * TTL (seconds before stale), logical group for batch refresh, and timeout
 * budget. Fetchers in src/api/* hard-code their own timeouts at the network
 * layer — the timeoutMs here is the overall stage budget the orchestrator
 * uses to size its AbortController and to bound per-run latency.
 */

const DAY = 86400;

/**
 * @typedef {Object} SourceMeta
 * @property {number} ttl        Seconds before fetched data is considered stale.
 * @property {string} group      Logical group for batch refresh.
 * @property {string} label      Human-readable label.
 * @property {number} timeoutMs  Stage timeout budget (ms).
 */

export const SOURCE_REGISTRY = {
  elevation:        { ttl: 365 * DAY, group: 'terrain',         label: 'Open-Meteo Elevation',           timeoutMs:  5000 },
  forecast:         { ttl: 3600,      group: 'climate',         label: 'Open-Meteo Forecast',            timeoutMs:  8000 },
  climate:          { ttl: 30 * DAY,  group: 'climate',         label: 'Open-Meteo Climate Averages',    timeoutMs: 20000 },
  climateTrends:    { ttl: 90 * DAY,  group: 'trends',          label: 'Open-Meteo 50yr Archive',        timeoutMs: 45000 },
  soilProps:        { ttl: 365 * DAY, group: 'soil',            label: 'SoilGrids Properties',           timeoutMs: 12000 },
  soilClass:        { ttl: 365 * DAY, group: 'soil',            label: 'SoilGrids Classification',       timeoutMs: 12000 },
  geology:          { ttl: 365 * DAY, group: 'geology',         label: 'Macrostrat Geology',             timeoutMs:  8000 },
  species:          { ttl: 7 * DAY,   group: 'biodiversity',    label: 'iNaturalist Species',            timeoutMs: 10000 },
  threatened:       { ttl: 7 * DAY,   group: 'biodiversity',    label: 'iNaturalist Threatened',         timeoutMs: 10000 },
  gbif:             { ttl: 7 * DAY,   group: 'biodiversity',    label: 'GBIF Occurrences',               timeoutMs: 12000 },
  flood:            { ttl: DAY,       group: 'water',           label: 'GloFAS Flood Forecast',          timeoutMs:  8000 },
  water:            { ttl: 30 * DAY,  group: 'water',           label: 'Overpass Water Features',        timeoutMs: 35000 },
  infrastructure:   { ttl: 30 * DAY,  group: 'infrastructure',  label: 'Overpass Infrastructure',        timeoutMs: 35000 },
  protectedAreas:   { ttl: 30 * DAY,  group: 'regional',        label: 'Overpass Protected Areas',       timeoutMs: 35000 },
  activeFires:      { ttl: 3600,      group: 'fire',            label: 'NASA FIRMS Active',              timeoutMs:  8000, requiresEnv: ['VITE_FIRMS_KEY'] },
  historicalFires:  { ttl: 7 * DAY,   group: 'fire',            label: 'NASA FIRMS Historical',          timeoutMs: 15000, requiresEnv: ['VITE_FIRMS_KEY'] },
  riskScores:       { ttl: DAY,       group: 'risk',            label: 'Risk Scores (computed)',         timeoutMs: 20000 },
  admin:            { ttl: 365 * DAY, group: 'property',        label: 'DGT Admin Unit',                 timeoutMs:  8000 },
  ipmaLocation:     { ttl: 365 * DAY, group: 'climate',         label: 'IPMA Location',                  timeoutMs:  5000 },
  terrainProfile:   { ttl: 365 * DAY, group: 'terrain',         label: 'Multi-point Elevation',          timeoutMs:  8000 },
  landCover:        { ttl: 365 * DAY, group: 'agriculture',     label: 'CORINE Land Cover',              timeoutMs:  8000 },
  nominatim:        { ttl: 365 * DAY, group: 'property',        label: 'Nominatim Geocode',              timeoutMs:  5000 },
  solarWind:        { ttl: 30 * DAY,  group: 'energy',          label: 'Open-Meteo Solar/Wind',          timeoutMs: 20000 },
  pollen:           { ttl: DAY,       group: 'biodiversity',    label: 'Google Pollen',                  timeoutMs:  8000, requiresEnv: ['GOOGLE_API_KEY'] },
  regionalBaseline: { ttl: 7 * DAY,   group: 'regional',        label: 'Regional 8-pt Baseline',         timeoutMs: 90000 },
  speciesWindow0:   { ttl: 30 * DAY,  group: 'biodiversity',    label: 'iNaturalist Window 1',           timeoutMs: 10000 },
  speciesWindow1:   { ttl: 30 * DAY,  group: 'biodiversity',    label: 'iNaturalist Window 2',           timeoutMs: 10000 },
  speciesWindow2:   { ttl: 30 * DAY,  group: 'biodiversity',    label: 'iNaturalist Window 3',           timeoutMs: 10000 },
  ipmaForecast:     { ttl: 3600,      group: 'climate',         label: 'IPMA Forecast',                  timeoutMs:  5000 },
  // Sensor snapshots — latest readings per metric, written via the existing
  // HMAC ingest path. Read-only here; folded into observations on every run
  // so admin replay sees the sensor state at any historical run point.
  sensorWeather:    { ttl: 300,       group: 'sensor',          label: 'Sensor: weather',                timeoutMs:  3000 },
  sensorWater:      { ttl: 300,       group: 'sensor',          label: 'Sensor: water',                  timeoutMs:  3000 },
  sensorSoil:       { ttl: 300,       group: 'sensor',          label: 'Sensor: soil',                   timeoutMs:  3000 },
  sensorAudio:      { ttl: 300,       group: 'sensor',          label: 'Sensor: audio',                  timeoutMs:  3000 },
};

/** All unique group names */
export const GROUPS = [...new Set(Object.values(SOURCE_REGISTRY).map(s => s.group))];

/** Get all source keys belonging to a group */
export function sourcesByGroup(group) {
  return Object.entries(SOURCE_REGISTRY)
    .filter(([, meta]) => meta.group === group)
    .map(([key]) => key);
}

/**
 * Check whether the env vars a source requires are present. Returns the list
 * of missing var names, empty array if everything is set or none required.
 */
export function missingEnv(sourceKey) {
  const meta = SOURCE_REGISTRY[sourceKey];
  if (!meta?.requiresEnv?.length) return [];
  return meta.requiresEnv.filter((k) => !process.env[k]);
}

/** Check whether a fetched-at timestamp is stale for a given source */
export function isStale(sourceKey, fetchedAt) {
  const meta = SOURCE_REGISTRY[sourceKey];
  if (!meta) return true;
  if (!fetchedAt) return true;
  const ts = new Date(fetchedAt).getTime();
  if (!Number.isFinite(ts)) return true;
  const age = (Date.now() - ts) / 1000;
  return age > meta.ttl;
}
