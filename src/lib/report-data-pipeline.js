/**
 * Report Data Pipeline
 * Extracts and normalizes data from 23+ API calls into the canonical reportData shape.
 * Import this module instead of inlining API calls in the report generator.
 */

// ── API imports ────────────────────────────────────────────
import {
  getElevation,
  getForecast,
  getClimateAverages,
  getHistoricalWeather,
  getSolarWind,
  processSoilMoisture,
  estimateFrostDates,
} from '../api/open-meteo.js';

import { getPollenIndex } from '../api/google-pollen.js';

import {
  getSoilProperties,
  getSoilClassification,
  parseSoilProperties,
  parseSoilClassification,
} from '../api/soilgrids.js';

import { getGeology, parseGeology } from '../api/macrostrat.js';

import {
  getSpeciesCounts,
  getThreatenedSpecies,
  summarizeSpeciesCounts,
} from '../api/inaturalist.js';

import {
  getSpeciesOccurrences,
  summarizeOccurrences,
} from '../api/gbif.js';

import {
  getFloodForecastWithHistory,
  analyzeFloodRisk,
} from '../api/flood.js';

import {
  getWaterFeatures,
  getInfrastructure,
  getProtectedAreas,
  extractNodes,
  extractWays,
} from '../api/overpass.js';

import {
  getActiveFiresNearby,
  summarizeFireDetections,
} from '../api/nasa-firms.js';

import { fetchRiskScores } from '../api/risk-scores.js';
import { findNearestDrainage, floodRiskFromHAND } from './flood-hand.js';
import { getAdminUnit } from '../api/dgt.js';
import { getLandCoverTimeSeries } from '../api/livingatlas.js';
import { getForecast as getIPMAForecast, getNearestForecastLocation } from '../api/ipma.js';
import { reverseGeocode } from '../api/nominatim.js';

import {
  computeAllScores,
  computeEcosystemServices,
  computeNaturalCapitalPremiums,
  PREMIUM_METHODOLOGY,
  computeRevenueScenarios,
  computeRiskProfile,
  computeSoilScore,
  computeCarbonScore,
  computeBioScore,
} from './report-scores.js';

import {
  classifyError,
  newRunId,
  writePipelineError,
} from './pipeline-errors.js';

import { fetchWithPolicy } from './fetch-policy.js';

import { validateReportData } from './report-data-schema.js';

import { missingEnv } from './source-registry.js';

import { snapshotSensors } from './sensor-source.js';

// ── Helpers ────────────────────────────────────────────────

// Run context — set once at the start of fetchAllData, read by withStage so
// every error gets tagged with the same runId without threading it through
// every callsite. Phase 3 will surface this at the orchestrator boundary.
let _currentRunCtx = null;

/**
 * Run a stage (typically a single source fetch) with structured failure capture.
 * Returns { ok: true, data, durationMs } | { ok: false, error, code, durationMs }.
 *
 * On failure, writes a row to pipeline_errors (best-effort — no-op if Mongo
 * is unavailable) and logs a warning. The pipeline never throws past this
 * boundary; callers branch on .ok.
 */
async function withStage(label, fn) {
  const t0 = Date.now();
  try {
    const data = await fn();
    return { ok: true, data, durationMs: Date.now() - t0 };
  } catch (error) {
    const durationMs = Date.now() - t0;
    const code = classifyError(error);
    const message = error?.message || String(error);
    console.warn(`[pipeline] ${label} failed [${code}]:`, message);
    if (_currentRunCtx) {
      writePipelineError({
        runId: _currentRunCtx.runId,
        landbookId: _currentRunCtx.landbookId ?? null,
        source: label,
        stage: 'fetch',
        code,
        message,
        durationMs,
      }).catch(() => {});
    }
    return { ok: false, error: message, code, durationMs };
  }
}

/** Bounding box from boundary array [[lat,lng], ...] with optional padding */
function getBbox(boundary, padding = 0.02) {
  const lats = boundary.map(p => p[0]);
  const lngs = boundary.map(p => p[1]);
  return [
    Math.min(...lats) - padding, // south
    Math.min(...lngs) - padding, // west
    Math.max(...lats) + padding, // north
    Math.max(...lngs) + padding, // east
  ];
}

/** Least-squares linear trend */
function linearTrend(xValues, yValues) {
  const pairs = xValues.map((x, i) => [x, yValues[i]]).filter(([, y]) => y != null && !isNaN(y));
  const m = pairs.length;
  if (m < 2) return { slope: 0, perDecade: 0, rSquared: 0 };
  const sumX = pairs.reduce((s, [x]) => s + x, 0);
  const sumY = pairs.reduce((s, [, y]) => s + y, 0);
  const sumXY = pairs.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = pairs.reduce((s, [x]) => s + x * x, 0);
  const denom = m * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, perDecade: 0, rSquared: 0 };
  const slope = (m * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / m;
  const meanY = sumY / m;
  const ssTot = pairs.reduce((s, [, y]) => s + (y - meanY) ** 2, 0);
  const ssRes = pairs.reduce((s, [x, y]) => s + (y - (slope * x + intercept)) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, perDecade: slope * 10, rSquared, intercept };
}

/** Great-circle distance between two lat/lng points, in metres. */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Score 0-100 to human label */
function scoreToLabel(score) {
  if (score >= 80) return 'Extreme';
  if (score >= 60) return 'Severe';
  if (score >= 40) return 'High';
  if (score >= 20) return 'Moderate';
  if (score >= 10) return 'Low';
  return 'Very Low';
}

/** Classify climate zone from annual mean temp and rainfall */
function classifyClimateZone(meanTemp, annualRainfall, lat) {
  if (annualRainfall < 250) return 'Arid';
  if (annualRainfall < 500 && meanTemp > 18) return 'Semi-Arid';
  if (lat >= 35 && lat <= 45 && annualRainfall >= 400 && annualRainfall <= 1000) return 'Mediterranean';
  if (meanTemp > 20 && annualRainfall > 1500) return 'Tropical';
  if (meanTemp < 5) return 'Boreal';
  if (annualRainfall > 800 && meanTemp > 10) return 'Oceanic';
  return 'Temperate';
}

// ── 1. fetchAllData ────────────────────────────────────────

/**
 * Call all APIs in parallel with fault isolation.
 * Each slot returns { ok: true, data, durationMs } or
 * { ok: false, error, code, durationMs }.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {Array<[number, number]>} boundary
 * @param {number} areaHa
 * @param {{ runId?: string, landbookId?: string | null }} [options]
 */
export async function fetchAllData(lat, lng, boundary, areaHa, options = {}) {
  const runId = options.runId || newRunId();
  const landbookId = options.landbookId ?? null;
  _currentRunCtx = { runId, landbookId };

  try {
    return await _fetchAllDataInner(lat, lng, boundary, areaHa);
  } finally {
    _currentRunCtx = null;
  }
}

async function _fetchAllDataInner(lat, lng, boundary, areaHa) {
  const bbox = getBbox(boundary);
  const center = [lat, lng];

  // 50-year historical window for trend analysis
  const endYear = new Date().getFullYear() - 1;
  const startYear50 = endYear - 49;

  const results = {};

  // Fire all calls simultaneously
  const entries = [
    ['elevation', () => getElevation(lat, lng)],
    ['forecast', () => getForecast(lat, lng)],
    ['climate', () => getClimateAverages(lat, lng)],
    ['climateTrends', () => getHistoricalWeather(lat, lng, `${startYear50}-01-01`, `${endYear}-12-31`)],
    ['soilProps', () => getSoilProperties(lat, lng)],
    ['soilClass', () => getSoilClassification(lat, lng)],
    ['geology', () => getGeology(lat, lng)],
    ['species', () => getSpeciesCounts(lat, lng)],
    ['threatened', () => getThreatenedSpecies(lat, lng)],
    ['gbif', () => getSpeciesOccurrences(lat, lng)],
    ['flood', () => getFloodForecastWithHistory(lat, lng)],
    ['water', () => getWaterFeatures(bbox)],
    ['infrastructure', () => getInfrastructure(bbox)],
    ['protectedAreas', () => getProtectedAreas(bbox)],
    ['activeFires', () => getActiveFiresNearby(lat, lng, 50, 2)],
    ['historicalFires', () => getActiveFiresNearby(lat, lng, 25, 10)],
    ['riskScores', () => fetchRiskScores(lat, lng)],
    ['admin', () => getAdminUnit(lat, lng)],
    ['ipmaLocation', () => getNearestForecastLocation(lat, lng)],
    ['terrainProfile', () => getMultiPointElevation(boundary, center)],
    ['landCover', () => getLandCoverAtPoint(lat, lng)],
    ['nominatim', () => reverseGeocode(lat, lng)],
    ['solarWind', () => getSolarWind(lat, lng)],
    ['pollen', () => getPollenIndex(lat, lng)],
    ['regionalBaseline', () => fetchRegionalBaseline(lat, lng)],
    ['livingatlasLandCover', () => getLandCoverTimeSeries(boundary)],
    // Species trend windows — 3 five-year periods for temporal comparison
    ...computeBioWindows(lat, lng).map((w, i) => [
      `speciesWindow${i}`, () => getSpeciesCounts(lat, lng, 15, { d1: w.d1, d2: w.d2 }),
    ]),
  ];

  // Sensor snapshots — only enqueued when a landbookId is in scope (the
  // sensor collection is per-landbook). Skip outside that context (e.g.
  // baseline capture script) so we don't pollute observations with empty rows.
  const landbookIdInCtx = _currentRunCtx?.landbookId;
  if (landbookIdInCtx) {
    entries.push(
      ['sensorWeather', () => snapshotSensors(landbookIdInCtx, 'weather')],
      ['sensorWater',   () => snapshotSensors(landbookIdInCtx, 'water')],
      ['sensorSoil',    () => snapshotSensors(landbookIdInCtx, 'soil')],
      ['sensorAudio',   () => snapshotSensors(landbookIdInCtx, 'audio')],
    );
  }

  // Pre-filter sources whose required env is missing. Sets a clean
  // "skipped" result without calling the fetcher (so pipeline_errors
  // doesn't fill up with KEY_MISSING noise on every run).
  const settled = await Promise.all(
    entries.map(async ([label, fn]) => {
      const missing = missingEnv(label);
      if (missing.length > 0) {
        return {
          ok: false,
          skipped: true,
          status: 'skipped',
          code: 'KEY_MISSING',
          error: `${missing.join(', ')} not set`,
          durationMs: 0,
        };
      }
      return withStage(label, fn);
    })
  );

  entries.forEach(([label], i) => {
    results[label] = settled[i];
  });

  // IPMA forecast depends on ipmaLocation result
  if (results.ipmaLocation.ok && results.ipmaLocation.data) {
    const locId = results.ipmaLocation.data.globalIdLocal;
    if (locId) {
      results.ipmaForecast = await withStage('ipmaForecast', () => getIPMAForecast(locId));
    } else {
      results.ipmaForecast = { ok: false, error: 'No IPMA location ID', code: 'MISSING_REQUIRED' };
    }
  } else {
    results.ipmaForecast = { ok: false, error: 'IPMA location lookup failed', code: 'FETCH_FAILED' };
  }

  return results;
}

// ── Multi-point elevation for slope/aspect ─────────────────

export async function getMultiPointElevation(boundary, center) {
  const points = [center];
  const step = Math.max(1, Math.floor(boundary.length / 8));
  for (let i = 0; i < boundary.length; i += step) {
    points.push(boundary[i]);
  }
  const d = 0.002;
  points.push([center[0] + d, center[1]]); // N
  points.push([center[0] - d, center[1]]); // S
  points.push([center[0], center[1] + d]); // E
  points.push([center[0], center[1] - d]); // W

  const lats = points.map(p => p[0]).join(',');
  const lngs = points.map(p => p[1]).join(',');
  const res = await fetchWithPolicy(
    `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`,
    {},
    { source: 'open-meteo-elevation', timeoutMs: 8000, accept: 'application/json' }
  );
  if (!res.ok) throw new Error(`Elevation API error: ${res.status}`);
  const data = await res.json();
  if (!data?.elevation) throw new Error('No elevation data');

  const elevations = data.elevation;
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const avg = elevations.reduce((a, b) => a + b, 0) / elevations.length;

  const n = elevations.length;
  const elN = elevations[n - 4], elS = elevations[n - 3];
  const elE = elevations[n - 2], elW = elevations[n - 1];
  const nsSlope = elS - elN;
  const ewSlope = elE - elW;

  let aspect = 'Flat';
  const threshold = 2;
  if (Math.abs(nsSlope) > threshold || Math.abs(ewSlope) > threshold) {
    const angle = Math.atan2(ewSlope, nsSlope) * 180 / Math.PI;
    if (angle >= -22.5 && angle < 22.5) aspect = 'South-facing';
    else if (angle >= 22.5 && angle < 67.5) aspect = 'Southeast-facing';
    else if (angle >= 67.5 && angle < 112.5) aspect = 'East-facing';
    else if (angle >= 112.5 && angle < 157.5) aspect = 'Northeast-facing';
    else if (angle >= 157.5 || angle < -157.5) aspect = 'North-facing';
    else if (angle >= -157.5 && angle < -112.5) aspect = 'Northwest-facing';
    else if (angle >= -112.5 && angle < -67.5) aspect = 'West-facing';
    else aspect = 'Southwest-facing';
  }

  const latRange = Math.max(...boundary.map(p => p[0])) - Math.min(...boundary.map(p => p[0]));
  const lngRange = Math.max(...boundary.map(p => p[1])) - Math.min(...boundary.map(p => p[1]));
  const runMeters = Math.sqrt(
    Math.pow(latRange * 111320, 2) +
    Math.pow(lngRange * 111320 * Math.cos(center[0] * Math.PI / 180), 2)
  );
  const rise = max - min;
  const slopePct = runMeters > 0 ? (rise / runMeters * 100) : 0;

  return {
    elevations, min, max, avg: Math.round(avg),
    range: max - min, aspect,
    slopePct: Math.round(slopePct * 10) / 10,
  };
}

// ── Land cover via WMS GetFeatureInfo ───────────────────────

export async function getLandCoverAtPoint(lat, lng) {
  // Try CORINE
  const d = 0.0005;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const url = `https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=12&QUERY_LAYERS=12&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
  const res = await fetchWithPolicy(url, {}, { source: 'corine-landcover', timeoutMs: 8000 });
  if (!res.ok) throw new Error(`Land cover HTTP ${res.status}`);
  const text = await res.text();
  const codeMatch = text.match(/CODE_18="(\d+)"/);
  const labelMatch = text.match(/LABEL3="([^"]+)"/);
  if (codeMatch) {
    const code = parseInt(codeMatch[1]);
    return {
      source: 'CORINE 2018',
      code,
      label: labelMatch?.[1] || CORINE_LABELS[code] || `CORINE ${code}`,
    };
  }
  return null;
}

const CORINE_LABELS = {
  111: 'Continuous urban fabric', 112: 'Discontinuous urban fabric',
  211: 'Non-irrigated arable', 212: 'Permanently irrigated', 213: 'Rice fields',
  221: 'Vineyards', 222: 'Fruit & berry', 223: 'Olive groves',
  231: 'Pastures', 241: 'Annual crops + permanent', 242: 'Complex cultivation',
  243: 'Agriculture + natural vegetation', 244: 'Agro-forestry',
  311: 'Broad-leaved forest', 312: 'Coniferous forest', 313: 'Mixed forest',
  321: 'Natural grassland', 322: 'Moors & heathland', 323: 'Sclerophyllous vegetation',
  324: 'Transitional woodland-shrub', 334: 'Burnt areas',
  411: 'Inland marshes', 511: 'Water courses', 512: 'Water bodies',
};

// ── iNaturalist & GBIF temporal trends ─────────────────────

function computeBioWindows(lat, lng) {
  const currentYear = new Date().getFullYear();
  return [
    { label: `${currentYear - 15}-${currentYear - 10}`, d1: `${currentYear - 15}-01-01`, d2: `${currentYear - 10}-12-31` },
    { label: `${currentYear - 10}-${currentYear - 5}`, d1: `${currentYear - 10}-01-01`, d2: `${currentYear - 5}-12-31` },
    { label: `${currentYear - 5}-${currentYear}`, d1: `${currentYear - 5}-01-01`, d2: `${currentYear}-12-31` },
  ];
}

function computeGBIFWindows() {
  const currentYear = new Date().getFullYear();
  const windows = [];
  for (let y = currentYear - 20; y <= currentYear; y += 5) {
    const endY = Math.min(y + 4, currentYear);
    windows.push({ label: `${y}-${endY}`, yearStart: y, yearEnd: endY });
  }
  return windows;
}

// ── 2. processRawData ──────────────────────────────────────

/**
 * Transform raw API results into the canonical reportData shape.
 * @param {Object} raw - Output from fetchAllData
 * @param {Object} submission - User submission with name, address, coords, boundary, areaHa
 * @param {number} areaHa - Property area in hectares
 * @param {{ runId?: string, landbookId?: string | null }} [options]
 */
export async function processRawData(raw, submission, areaHa, options = {}) {
  const missingFields = [];
  const apiStatus = {};

  // Track API statuses
  for (const [key, result] of Object.entries(raw)) {
    if (result.ok) apiStatus[key] = 'ok';
    else if (result.skipped || result.status === 'skipped') apiStatus[key] = 'skipped';
    else apiStatus[key] = result.error || 'error';
    if (!result.ok) missingFields.push(key);
  }

  const lat = submission.coords?.[0] ?? submission.lat;
  const lng = submission.coords?.[1] ?? submission.lng;
  const boundary = submission.boundary || [];
  const center = [lat, lng];

  // ── Property ──────────────────────────────────────────
  const admin = raw.admin?.ok ? raw.admin.data : null;
  const nominatim = raw.nominatim?.ok ? raw.nominatim.data : null;

  const fullAddress = submission.address || nominatim?.display_name || null;
  const derivedName = fullAddress
    ? fullAddress.split(',')[0].trim()
    : (submission.postcode || 'Untitled Property');

  const property = {
    name: submission.name || submission.propertyName || derivedName,
    address: fullAddress,
    coords: { lat, lng },
    area: areaHa,
    boundary,
    municipality: admin?.municipality || nominatim?.address?.town || nominatim?.address?.city || null,
    parish: admin?.parish || nominatim?.address?.suburb || nominatim?.address?.village || null,
  };

  // ── Climate ───────────────────────────────────────────
  const climateMonthly = raw.climate?.ok ? raw.climate.data : null;
  const forecastData = raw.forecast?.ok ? raw.forecast.data : null;

  let annualMeanTemp = null;
  let summerMean = null;
  let winterMean = null;
  let annualRainfall = null;
  let frostDays = 0;
  let growingSeason = 0;
  let monthlyAvgHigh = [];
  let monthlyAvgLow = [];
  let monthlyPrecip = [];

  if (climateMonthly && Array.isArray(climateMonthly)) {
    monthlyAvgHigh = climateMonthly.map(m => m.avgHigh != null ? Math.round(m.avgHigh * 10) / 10 : null);
    monthlyAvgLow = climateMonthly.map(m => m.avgLow != null ? Math.round(m.avgLow * 10) / 10 : null);
    monthlyPrecip = climateMonthly.map(m => m.totalPrecip != null ? Math.round(m.totalPrecip) : null);

    const allHighs = monthlyAvgHigh.filter(v => v != null);
    const allLows = monthlyAvgLow.filter(v => v != null);
    if (allHighs.length && allLows.length) {
      annualMeanTemp = Math.round(
        ((allHighs.reduce((a, b) => a + b, 0) / allHighs.length) +
         (allLows.reduce((a, b) => a + b, 0) / allLows.length)) / 2 * 10
      ) / 10;
    }

    // Summer = Jun-Aug (indices 5-7), Winter = Dec-Feb (indices 11,0,1)
    const summerHighs = [5, 6, 7].map(i => monthlyAvgHigh[i]).filter(v => v != null);
    const summerLows = [5, 6, 7].map(i => monthlyAvgLow[i]).filter(v => v != null);
    if (summerHighs.length && summerLows.length) {
      summerMean = Math.round(
        ((summerHighs.reduce((a, b) => a + b, 0) / summerHighs.length) +
         (summerLows.reduce((a, b) => a + b, 0) / summerLows.length)) / 2 * 10
      ) / 10;
    }

    const winterHighs = [11, 0, 1].map(i => monthlyAvgHigh[i]).filter(v => v != null);
    const winterLows = [11, 0, 1].map(i => monthlyAvgLow[i]).filter(v => v != null);
    if (winterHighs.length && winterLows.length) {
      winterMean = Math.round(
        ((winterHighs.reduce((a, b) => a + b, 0) / winterHighs.length) +
         (winterLows.reduce((a, b) => a + b, 0) / winterLows.length)) / 2 * 10
      ) / 10;
    }

    annualRainfall = monthlyPrecip.filter(v => v != null).reduce((a, b) => a + b, 0);

    // Frost days: count months where avgLow <= 0
    frostDays = climateMonthly.filter(m => m.avgLow != null && m.avgLow <= 0).length * 5; // rough estimate

    // Growing season: months with avgLow > 5C
    growingSeason = climateMonthly.filter(m => m.avgLow != null && m.avgLow > 5).length;
  }

  const frostDates = climateMonthly ? estimateFrostDates(climateMonthly) : null;
  const zone = classifyClimateZone(annualMeanTemp, annualRainfall, lat);

  // Forecast array
  const forecast = [];
  if (forecastData?.daily) {
    const d = forecastData.daily;
    (d.time || []).forEach((date, i) => {
      forecast.push({
        date,
        high: d.temperature_2m_max?.[i] ?? null,
        low: d.temperature_2m_min?.[i] ?? null,
        precip: d.precipitation_sum?.[i] ?? null,
        wind: d.wind_speed_10m_max?.[i] ?? null,
        weatherCode: d.weathercode?.[i] ?? null,
        uvIndex: d.uv_index_max?.[i] ?? null,
      });
    });
  }

  // IPMA forecast
  const ipmaForecast = raw.ipmaForecast?.ok && Array.isArray(raw.ipmaForecast.data)
    ? raw.ipmaForecast.data
    : [];

  const climate = {
    annualMeanTemp, summerMean, winterMean, annualRainfall,
    frostDays, growingSeason, zone,
    monthlyAvgHigh, monthlyAvgLow, monthlyPrecip,
    forecast, ipmaForecast,
    frostDates,
  };

  // Wire last-12-months monthly precip from the trends pass below — promoted
  // onto the climate object so the dashboard's drought card can compare it
  // directly to climate.monthlyPrecip (the 1991-2020 normal).

  // ── Terrain ───────────────────────────────────────────
  const elevVal = raw.elevation?.ok ? raw.elevation.data : null;
  const terrainData = raw.terrainProfile?.ok ? raw.terrainProfile.data : null;

  const terrain = {
    elevation: terrainData?.avg ?? elevVal ?? null,
    slope: terrainData?.slopePct ?? null,
    aspect: terrainData?.aspect ?? null,
    profile: terrainData?.elevations || [],
    min: terrainData?.min ?? null,
    max: terrainData?.max ?? null,
    range: terrainData?.range ?? null,
  };

  // ── Soil ──────────────────────────────────────────────
  const soilRaw = raw.soilProps?.ok ? raw.soilProps.data : null;
  let soilParsed = null;
  try { soilParsed = soilRaw ? parseSoilProperties(soilRaw) : null; } catch (e) { console.warn('[pipeline] parseSoilProperties failed:', e.message); }
  const soilClassRaw = raw.soilClass?.ok ? raw.soilClass.data : null;
  let soilClassParsed = null;
  try { soilClassParsed = soilClassRaw ? parseSoilClassification(soilClassRaw) : null; } catch (e) { console.warn('[pipeline] parseSoilClassification failed:', e.message); }

  // toNum: parseFloat that returns null for non-finite results.
  // parseFloat(null) → NaN, which JSON-serialises to null but trips canonical
  // schema validation in-memory. Always go through toNum on parsed soil values.
  const toNum = (v) => {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const clayPct = toNum(soilParsed?.clay);
  const sandPct = toNum(soilParsed?.sand);
  const siltPct = (clayPct != null && sandPct != null)
    ? (100 - clayPct - sandPct)
    : toNum(soilParsed?.silt);

  const soil = {
    ph: toNum(soilParsed?.ph),
    organicCarbon: soilParsed?.organicCarbon ?? null,
    clay: clayPct,
    sand: sandPct,
    silt: siltPct,
    nitrogen: soilParsed?.nitrogen ?? null,
    cec: soilParsed?.cec ?? null,
    bulkDensity: soilParsed?.bulkDensity ?? null,
    classification: soilClassParsed?.primary ?? null,
    texture: soilParsed?.texture ?? null,
  };

  // ── Geology ───────────────────────────────────────────
  const geoRaw = raw.geology?.ok ? raw.geology.data : null;
  let geoParsed = null;
  try { geoParsed = geoRaw ? parseGeology(geoRaw) : null; } catch (e) { console.warn('[pipeline] parseGeology failed:', e.message); }
  const geoPrimary = geoParsed?.primary || {};

  const geology = {
    lithology: geoPrimary.lithology || null,
    environment: geoPrimary.environment || null,
    period: geoPrimary.period || null,
    age: geoPrimary.age || null,
  };

  // ── Water ─────────────────────────────────────────────
  const waterRaw = raw.water?.ok ? raw.water.data : null;
  let springs = 0, wells = 0, waterways = 0, waterBodies = 0;
  let waterFeatures = [];
  let nearestNamedStream = null;
  let nearestNamedBody = null;

  if (waterRaw) {
    const nodes = extractNodes(waterRaw);
    const ways = extractWays(waterRaw);
    springs = nodes.filter(n => n.tags?.natural === 'spring').length;
    wells = nodes.filter(n => n.tags?.man_made === 'water_well').length;
    waterways = ways.filter(w => w.tags?.waterway).length;
    waterBodies = ways.filter(w => w.tags?.natural === 'water').length;

    // Per-feature list with distance from property centre. Used by the
    // dashboard water panel; capped to 30 entries to bound fact-doc size.
    const featureFromTags = (tags = {}) => {
      if (tags.natural === 'spring') return 'spring';
      if (tags.man_made === 'water_well') return 'well';
      if (tags.waterway) return tags.waterway;
      if (tags.natural === 'water') return tags.water || 'water_body';
      return 'water';
    };
    const allFeatures = [];
    for (const n of nodes) {
      if (typeof n.lat !== 'number' || typeof n.lon !== 'number') continue;
      allFeatures.push({
        kind: featureFromTags(n.tags),
        name: n.tags?.name || null,
        distanceM: Math.round(haversineMeters(lat, lng, n.lat, n.lon)),
      });
    }
    for (const w of ways) {
      const coord = w.coords?.[0];
      if (!coord || typeof coord[0] !== 'number' || typeof coord[1] !== 'number') continue;
      allFeatures.push({
        kind: featureFromTags(w.tags),
        name: w.tags?.name || null,
        distanceM: Math.round(haversineMeters(lat, lng, coord[0], coord[1])),
      });
    }
    const sortedAll = allFeatures.sort((a, b) => a.distanceM - b.distanceM);
    waterFeatures = sortedAll.slice(0, 30);

    // Walk the FULL sorted list (not the 30-cap) for the nearest *named* stream
    // and water body. The closest features are often unnamed farm ponds; the
    // Mira / Foupana / Aguieiras kind of names live further out.
    const streamKinds = new Set(['river', 'stream', 'canal', 'drain', 'ditch', 'waterway']);
    const bodyKinds   = new Set(['water_body', 'water', 'reservoir', 'lake', 'pond', 'lagoon']);
    const namedStream = sortedAll.find(f => f.name && streamKinds.has(f.kind));
    const namedBody   = sortedAll.find(f => f.name && bodyKinds.has(f.kind));
    nearestNamedStream = namedStream
      ? { name: namedStream.name, kind: namedStream.kind, distanceM: namedStream.distanceM }
      : null;
    nearestNamedBody = namedBody
      ? { name: namedBody.name, kind: namedBody.kind, distanceM: namedBody.distanceM }
      : null;
  }

  const floodRaw = raw.flood?.ok ? raw.flood.data : null;
  const floodAnalysis = floodRaw ? analyzeFloodRisk(floodRaw) : null;
  const totalWaterFeatures = springs + wells + waterways + waterBodies;
  const waterSecurityIndex = Math.min(10, 2 + totalWaterFeatures * 0.8 + (annualRainfall ? annualRainfall / 200 : 0));

  // ── HAND (Height Above Nearest Drainage) for flood risk ──
  const drainage = waterRaw
    ? findNearestDrainage(extractWays(waterRaw), lat, lng, haversineMeters)
    : null;
  let drainageElevation = null;
  if (drainage) {
    try {
      drainageElevation = await getElevation(drainage.lat, drainage.lng);
    } catch (e) {
      console.warn('[pipeline] HAND drainage elevation lookup failed:', e.message);
    }
  }
  const parcelMinElev = terrain.min;
  const hand = (drainageElevation != null && parcelMinElev != null)
    ? Math.round((parcelMinElev - drainageElevation) * 10) / 10
    : null;

  const water = {
    springs, wells, waterways, waterBodies,
    features: waterFeatures,
    nearestDistanceM: waterFeatures[0]?.distanceM ?? null,
    nearestNamedStream,
    nearestNamedBody,
    securityIndex: Math.round(waterSecurityIndex * 10) / 10,
    floodDischarge: floodAnalysis?.current ?? null,
    floodAnomalyPct: floodAnalysis?.anomalyPct ?? null,
  };

  // ── Species ───────────────────────────────────────────
  const speciesRaw = raw.species?.ok ? raw.species.data : null;
  const speciesSummary = speciesRaw ? summarizeSpeciesCounts(speciesRaw) : { total: 0, groups: {}, species: [] };

  const threatenedRaw = raw.threatened?.ok ? raw.threatened.data : null;
  const threatenedSummary = threatenedRaw ? summarizeSpeciesCounts(threatenedRaw) : { total: 0 };

  const gbifRaw = raw.gbif?.ok ? raw.gbif.data : null;
  const gbifSummary = gbifRaw ? summarizeOccurrences(gbifRaw) : { total: 0, kingdoms: {}, species: [] };

  const groupEntries = Object.entries(speciesSummary.groups).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // IUCN code from iNat's conservation_status. iNat exposes either a string
  // (e.g. 'LC') or an object { status: 'LC' / status_name: 'least concern' }.
  const iucnCodeOf = (cs) => {
    if (!cs) return null;
    if (typeof cs === 'string') return cs.toUpperCase();
    const raw = (cs.status || cs.status_name || '').toString().trim();
    if (!raw) return null;
    const upper = raw.toUpperCase();
    if (['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX', 'DD'].includes(upper)) return upper;
    const m = {
      'LEAST CONCERN': 'LC',
      'NEAR THREATENED': 'NT',
      'VULNERABLE': 'VU',
      'ENDANGERED': 'EN',
      'CRITICALLY ENDANGERED': 'CR',
      'EXTINCT IN THE WILD': 'EW',
      'EXTINCT': 'EX',
      'DATA DEFICIENT': 'DD',
    };
    return m[upper] || null;
  };

  const top10 = speciesSummary.species.slice(0, 10).map(s => ({
    name: s.name,
    scientificName: s.scientificName,
    group: s.group,
    count: s.observationCount,
    photoUrl: s.photoUrl ?? null,
    iucn: iucnCodeOf(s.conservationStatus),
    threatened: !!s.threatened,
  }));

  const gbifKingdoms = Object.entries(gbifSummary.kingdoms).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Derive species trends from temporal windows
  const bioWindows = computeBioWindows(lat, lng);
  const windowCounts = bioWindows.map((w, i) => {
    const key = `speciesWindow${i}`;
    if (raw[key]?.ok && raw[key].data) {
      const summary = summarizeSpeciesCounts(raw[key].data);
      return { label: w.label, count: summary.total };
    }
    return { label: w.label, count: null };
  });
  const validCounts = windowCounts.filter(w => w.count != null);
  let trendDirection = null;
  if (validCounts.length >= 2) {
    const first = validCounts[0].count;
    const last = validCounts[validCounts.length - 1].count;
    const change = (last - first) / Math.max(first, 1);
    trendDirection = change > 0.1 ? 'Increasing' : change < -0.1 ? 'Declining' : 'Stable';
  }

  const species = {
    total: speciesSummary.total,
    groups: groupEntries,
    top10,
    threatened: threatenedSummary.total,
    gbifTotal: gbifSummary.total,
    gbifKingdoms,
    trends: {
      direction: trendDirection,
      windows: windowCounts,
    },
  };

  // ── Agriculture systems (computed early for revenue scenarios) ──
  const lcData = raw.landCover?.ok ? raw.landCover.data : null;
  const agriSystems = deriveAgriSystems(lcData, climate, soil, terrain);

  // ── Scores ────────────────────────────────────────────
  const allScores = computeAllScores(raw, areaHa);
  const ecosystemServices = computeEcosystemServices(areaHa, raw);
  const revenueScenarios = computeRevenueScenarios(areaHa, agriSystems);
  const riskProfile = computeRiskProfile(raw);

  const scores = {
    naturalCapital: allScores.overallScore,
    carbon: allScores.carbon?.score ?? null,
    biodiversity: allScores.bio?.score ?? null,
    water: Math.round((allScores.water?.score ?? 5) * 10),
    soil: allScores.soil?.score ?? null,
    pollination: allScores.dimensions?.find(d => d.key === 'pollination')?.score ?? null,
    dimensions: allScores.dimensions,
    regional: Object.fromEntries(
      (allScores.dimensions || []).map(d => [d.key, d.avg])
    ), // literature-based global averages from TEEB/IPCC benchmarks
  };

  // ── Fire ──────────────────────────────────────────────
  const activeFiresRaw = raw.activeFires?.ok ? raw.activeFires.data : [];
  const fireSummary = summarizeFireDetections(activeFiresRaw);
  const riskScoresData = raw.riskScores?.ok ? raw.riskScores.data : null;

  const fire = {
    riskScore: riskScoresData?.fire != null ? Math.round(riskScoresData.fire / 20) : null, // 0-100 → 0-5
    riskLevel: riskScoresData?.fireLabel ?? scoreToLabel(riskScoresData?.fire ?? 0),
    activeFires: fireSummary.count,
    historical: [], // populated from historical fires data
    peakYear: null,
    seasonal: [],
  };

  // Historical fires processing
  if (raw.historicalFires?.ok && Array.isArray(raw.historicalFires.data)) {
    // historicalFires came from getActiveFiresNearby which returns fire detections,
    // not yearly aggregates. We group them by date for display.
    const fires = raw.historicalFires.data;
    const yearCounts = {};
    fires.forEach(f => {
      if (f.date) {
        const yr = f.date.substring(0, 4);
        yearCounts[yr] = (yearCounts[yr] || 0) + 1;
      }
    });
    fire.historical = Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => a.year - b.year);
    if (fire.historical.length) {
      fire.peakYear = fire.historical.reduce((a, b) => a.count > b.count ? a : b).year;
    }
  }

  // ── Flood (HAND-based: parcel elevation vs nearest drainage) ──
  // No nearby drainage in the Overpass radius means no fluvial flood vector.
  const noNearbyDrainage = !!waterRaw && !drainage;
  const handRisk = floodRiskFromHAND(hand);
  const flood = {
    riskScore: noNearbyDrainage ? 0 : handRisk.riskScore,
    riskLevel: noNearbyDrainage ? 'Very Low' : handRisk.riskLevel,
    hand,
    distanceToDrainageM: drainage?.distanceM ?? null,
    drainageName: drainage?.name ?? null,
    drainageKind: drainage?.kind ?? null,
  };

  // ── Drought ───────────────────────────────────────────
  const drought = {
    riskScore: riskScoresData?.drought != null ? Math.round(riskScoresData.drought / 20) : null, // 0-100 → 0-5
    riskLevel: riskScoresData?.droughtLabel ?? scoreToLabel(riskScoresData?.drought ?? 0),
  };

  // ── Climate trends (computed early for NPV scenarios) ──
  const trendsData = computeTrends(raw);

  // Promote last-12-months monthly precip onto the climate object for the
  // drought card's wetter/drier-than-normal anomaly chart.
  if (trendsData.last12MonthsPrecip) {
    climate.last12MonthsPrecip = trendsData.last12MonthsPrecip;
    climate.last12MonthsYear   = trendsData.last12MonthsYear ?? null;
  }

  // ── Energy potential ──────────────────────────────────
  const solarWindData = raw.solarWind?.ok ? raw.solarWind.data : null;
  const energy = deriveEnergyPotential(lat, terrain, water, annualRainfall, solarWindData);

  // ── Economics ─────────────────────────────────────────
  const carbonStockPerHa = allScores.carbonStockTotal ? allScores.carbonStockTotal / areaHa : 0;

  // Carbon sequestration rate by land cover type (IPCC 2006 Tier 1, tCO2e/ha/yr)
  const seqRateByLandCover = {
    311: 8.0,  // Broad-leaved forest
    312: 6.5,  // Coniferous forest
    313: 7.0,  // Mixed forest
    324: 4.0,  // Transitional woodland-shrub
    244: 5.5,  // Agro-forestry (cork oak, montado)
    323: 3.0,  // Sclerophyllous vegetation (maquis)
    322: 2.5,  // Moors & heathland
    321: 1.5,  // Natural grassland
    231: 1.2,  // Pastures
    211: 0.8,  // Non-irrigated arable
    221: 2.0,  // Vineyards
    222: 2.5,  // Fruit & berry
    223: 3.0,  // Olive groves
    242: 1.5,  // Complex cultivation
    243: 2.5,  // Agriculture + natural vegetation
  };
  const lcCode = raw.landCover?.ok ? raw.landCover.data?.code : null;
  const seqRate = seqRateByLandCover[lcCode] ?? 3.5; // fallback to Mediterranean average
  const carbonAnnualSeq = Math.round(areaHa * seqRate);

  // Carbon credit price: EU ETS reference price, timestamped
  const carbonPriceEur = 65; // EU ETS ~€65/tCO2 as of Q1 2026
  const carbonPriceDate = '2026-Q1';
  const carbonCreditValue = Math.round(carbonAnnualSeq * carbonPriceEur);

  // Convert services array to keyed object for template consumption
  const svcArray = ecosystemServices.services || [];
  const svcKeyed = {
    total: ecosystemServices.total ?? 0,
    water: (svcArray.find(s => s.name?.includes('Water Provisioning')) || {}).value || 0,
    food: (svcArray.find(s => s.name?.includes('Food')) || {}).value || 0,
    carbon: (svcArray.find(s => s.name?.includes('Carbon')) || {}).value || 0,
    regulation: (svcArray.find(s => s.name?.includes('Water Regulation')) || {}).value || 0,
    soil: (svcArray.find(s => s.name?.includes('Soil')) || {}).value || 0,
    cultural: (svcArray.find(s => s.name?.includes('Recreation')) || {}).value || 0,
    services: svcArray, // keep full array too
  };

  // Natural Capital Premium Estimates (TEEB DE 2018 benefit transfer)
  const premiums = computeNaturalCapitalPremiums(
    areaHa,
    ecosystemServices.biomeGroup,
    ecosystemServices.waterFeatures ?? 0,
  );

  // NPV from computeEcosystemServices; scenarios derived from premiums + climate risk
  const npvValue = ecosystemServices.npv ?? 0;
  const npvObj = buildNPVScenarios(npvValue, trendsData, premiums);

  // Transform revenueScenarios array into keyed object for template
  const revArr = revenueScenarios || [];
  const revKeyed = {
    conservative: revArr.find(s => s.scenario === 'Conservative')?.annual ?? null,
    moderate: revArr.find(s => s.scenario === 'Moderate')?.annual ?? null,
    optimized: revArr.find(s => s.scenario === 'Optimized')?.annual ?? null,
    details: revArr, // keep full array
  };

  const economics = {
    valuePerHa: svcKeyed.total ? Math.round(svcKeyed.total / areaHa) : null,
    totalValue: svcKeyed.total ?? null,
    ecosystemServices: svcKeyed,
    premiums,
    premiumMethodology: PREMIUM_METHODOLOGY,
    npv: npvObj,
    revenueScenarios: revKeyed,
    carbonStock: Number.isFinite(allScores.carbonStockTotal) ? allScores.carbonStockTotal : 0,
    carbonAnnualSeq,
    carbonCreditValue,
    carbonSeqRate: seqRate,
    carbonPriceEur: carbonPriceEur,
    carbonPriceDate,
  };

  // ── Agriculture ───────────────────────────────────────
  const livingAtlas = raw.livingatlasLandCover?.ok ? raw.livingatlasLandCover.data : null;
  const agriculture = {
    landCover: lcData?.label ?? null,
    systems: agriSystems,
    landCoverTimeSeries: livingAtlas?.years ?? null,
  };

  // ── Maps ──────────────────────────────────────────────
  const maps = buildMapUrls(boundary, center);

  // ── Regional ──────────────────────────────────────────
  const protectedRaw = raw.protectedAreas?.ok ? raw.protectedAreas.data : null;
  const protectedList = [];
  if (protectedRaw?.elements) {
    const seen = new Set();
    protectedRaw.elements.forEach(el => {
      const name = el.tags?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        protectedList.push({
          name,
          type: el.tags?.boundary || el.tags?.leisure || 'protected_area',
          designation: el.tags?.protect_class || el.tags?.designation || null,
        });
      }
    });
  }

  // Regional percentiles from 8-point radius sampling
  const baseline = raw.regionalBaseline?.ok ? raw.regionalBaseline.data : { averages: {}, sampleCount: 0 };
  const propertyScores = {
    soil: scores.soil,
    carbon: scores.carbon,
    biodiversity: scores.biodiversity,
  };
  const percentiles = computePercentiles(propertyScores, baseline.averages);

  const regional = {
    protectedAreas: protectedList,
    percentiles,
    averages: baseline.averages,
    sampleCount: baseline.sampleCount,
  };

  // ── Trends ────────────────────────────────────────────
  const trends = {
    tempPerDecade: trendsData.tempPerDecade,
    precipPerDecade: trendsData.precipPerDecade,
    fireProneByDecade: trendsData.fireProneByDecade,
    yearly: trendsData.yearly,
    bioWindows: computeBioWindows(lat, lng),
    gbifWindows: computeGBIFWindows(),
  };

  // ── Compliance (country-aware) ─────────────────────────
  const countryCode = (nominatim?.address?.country_code || '').toUpperCase() || 'PT';
  const compliance = buildComplianceSection(property, protectedList, countryCode);

  // ── Actions ───────────────────────────────────────────
  const actions = deriveActions(riskProfile, scores, water, fire, soil, terrain, areaHa);

  const reportData = {
    property,
    scores,
    climate,
    terrain,
    soil,
    geology,
    water,
    species,
    fire,
    flood,
    drought,
    energy,
    economics,
    agriculture,
    maps,
    regional,
    trends,
    compliance,
    actions,
    narratives: {}, // filled by AI layer later
    meta: {
      generatedAt: new Date().toISOString(),
      version: '2.0.0',
      apiStatus,
      missingFields,
      uncertainty: computeUncertainty(apiStatus),
    },
  };

  // ── Canonical schema validation ────────────────────────
  // Non-blocking: drift is recorded but the report still ships. Phase 4's
  // admin page surfaces these issues; downstream consumers can read
  // meta.validation to decide whether to render a "data-quality" banner.
  const validation = validateReportData(reportData);
  reportData.meta.validation = {
    ok: validation.ok,
    issueCount: validation.issues.length,
    firstIssues: validation.issues.slice(0, 5),
  };
  if (!validation.ok) {
    console.warn(
      `[pipeline] reportData schema drift: ${validation.issues.length} issues`,
      validation.issues.slice(0, 3)
    );
    const runId = options.runId || _currentRunCtx?.runId || null;
    const landbookId = options.landbookId ?? _currentRunCtx?.landbookId ?? null;
    if (runId) {
      writePipelineError({
        runId,
        landbookId,
        source: 'reportData',
        stage: 'validate',
        code: 'SCHEMA_DRIFT',
        message: `${validation.issues.length} validation issues; first: ${validation.issues[0]?.path} ${validation.issues[0]?.message}`,
        details: validation.issues.slice(0, 20),
      }).catch(() => {});
    }
  }

  return reportData;
}

// ── NPV scenario builder ─────────────────────────────────

/**
 * Build NPV scenarios derived from baseline ES value + TEEB DE intervention premiums.
 *
 * Methodology:
 * - Baseline: 30-yr NPV of current ecosystem service flow at 3.5% discount.
 * - One scenario per applicable TEEB DE intervention: Baseline + intervention's
 *   30-yr NPV uplift (mid-range estimate). Premiums with annual €/ha values
 *   carry through quantitatively; BCR-only premiums appear as qualitative rows.
 * - Combined Stewardship: Baseline + sum of all per-hectare premium uplifts.
 *
 * Climate trends (observed temp/precip) inform scenario riskLevel text but no
 * longer adjust NPV directly — uplift figures come from sourced TEEB DE data,
 * not invented decline multipliers.
 */
function buildNPVScenarios(npvValue, trendsData, premiums) {
  const tempTrend = trendsData?.tempPerDecade || 0;
  const precipTrend = trendsData?.precipPerDecade || 0;
  const climatePressure = Math.abs(tempTrend) * 3 * 0.03 + (precipTrend < 0 ? Math.abs(precipTrend) / 50 * 0.02 * 3 : 0);
  const baseRisk = climatePressure > 0.15 ? 'High' : climatePressure > 0.05 ? 'Medium' : 'Low';

  const trendNote = `Observed climate trend: ${tempTrend >= 0 ? '+' : ''}${tempTrend.toFixed(2)}°C/decade, ${precipTrend >= 0 ? '+' : ''}${Math.round(precipTrend)}mm/decade precipitation.`;

  const scenarios = [
    {
      name: 'Baseline',
      npv: npvValue,
      intervention: null,
      assumptions: `Current land cover and management held constant. ${trendNote}`,
      riskLevel: baseRisk,
    },
  ];

  const quantitativePremiums = (premiums || []).filter((p) => p.basis === 'per-hectare' && p.thirtyYearNpvMid != null);

  for (const p of quantitativePremiums) {
    scenarios.push({
      name: `+ ${p.name}`,
      npv: Math.round(npvValue + p.thirtyYearNpvMid),
      intervention: p.id,
      uplift30yr: p.thirtyYearNpvMid,
      annualUplift: p.annualMid,
      assumptions: `Baseline plus mid-range uplift from ${p.name}. Source: ${p.source}.`,
      riskLevel: p.confidence === 'lower' ? 'Medium-High' : 'Medium',
    });
  }

  if (quantitativePremiums.length > 1) {
    const sumHigh30yr = quantitativePremiums.reduce((s, p) => s + (p.thirtyYearNpvHigh || 0), 0);
    const sumHighAnnual = quantitativePremiums.reduce((s, p) => s + (p.annualHigh || 0), 0);
    scenarios.push({
      name: 'Combined Stewardship Programme',
      npv: Math.round(npvValue + sumHigh30yr),
      intervention: 'all',
      uplift30yr: sumHigh30yr,
      annualUplift: sumHighAnnual,
      assumptions: 'All applicable TEEB-DE-aligned interventions implemented at upper-bound rates. Higher delivery risk.',
      riskLevel: 'Higher (delivery)',
    });
  }

  return {
    thirtyYear: npvValue,
    scenarios,
    methodology: {
      tempTrend,
      precipTrend,
      climatePressure: Math.round(climatePressure * 100),
      note: 'Scenarios = baseline NPV + TEEB DE 2018 intervention uplifts at 3.5% discount rate. Climate trend reflected in scenario risk level only.',
    },
  };
}

// ── Regional baseline sampling ───────────────────────────

/**
 * Sample 8 points in a 15km radius around the property center.
 * Fetch lightweight scoring inputs (soil, species, water) for each.
 * Return averaged dimension scores as the regional baseline + percentiles.
 */
export async function fetchRegionalBaseline(lat, lng) {
  const RADIUS_KM = 15;
  const SAMPLES = 8;
  const points = [];
  for (let i = 0; i < SAMPLES; i++) {
    const angle = (i / SAMPLES) * 2 * Math.PI;
    // ~0.009 degrees per km at mid-latitudes
    const dLat = (RADIUS_KM * Math.cos(angle)) * 0.009;
    const dLng = (RADIUS_KM * Math.sin(angle)) * 0.009 / Math.cos(lat * Math.PI / 180);
    points.push([lat + dLat, lng + dLng]);
  }

  // For each sample point, fetch soil + species count (lightweight)
  const sampleScores = await Promise.all(points.map(async ([sLat, sLng]) => {
    try {
      const [soilRes, speciesRes] = await Promise.all([
        withStage('regionalBaseline:soil', () => getSoilProperties(sLat, sLng)),
        withStage('regionalBaseline:species', () => getSpeciesCounts(sLat, sLng, 10)),
      ]);

      const soilScore = computeSoilScore(soilRes.ok ? soilRes.data : null).score;
      const carbonScore = computeCarbonScore(soilRes.ok ? soilRes.data : null).score;
      const bioScore = computeBioScore(speciesRes.ok ? speciesRes.data : null).score;

      return { soil: soilScore, carbon: carbonScore, biodiversity: bioScore };
    } catch {
      return null;
    }
  }));

  const valid = sampleScores.filter(Boolean);
  if (valid.length === 0) return { averages: {}, percentiles: {}, sampleCount: 0 };

  const avg = (key) => Math.round(valid.reduce((s, v) => s + v[key], 0) / valid.length);
  const averages = {
    soil: avg('soil'),
    carbon: avg('carbon'),
    biodiversity: avg('biodiversity'),
  };

  return { averages, sampleCount: valid.length };
}

/**
 * Compute percentiles for property scores against regional averages.
 * Returns percentile rank (0-100) for each dimension.
 */
function computePercentiles(propertyScores, regionalAverages) {
  if (!regionalAverages || !Object.keys(regionalAverages).length) return {};
  const result = {};
  for (const [key, avg] of Object.entries(regionalAverages)) {
    const propVal = propertyScores[key];
    if (propVal != null && avg != null && avg > 0) {
      // Simple percentile: how far above/below average (50th = average)
      const ratio = propVal / avg;
      result[key] = Math.min(99, Math.max(1, Math.round(ratio * 50)));
    }
  }
  // Overall percentile = average of dimension percentiles
  const vals = Object.values(result);
  if (vals.length > 0) {
    result.overall = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return result;
}

// ── Uncertainty calculation ───────────────────────────────

/**
 * Compute uncertainty interval based on data completeness.
 * More missing APIs = wider interval. All present = ±12%, all missing = ±35%.
 */
function computeUncertainty(apiStatus) {
  const criticalApis = [
    'soilProps', 'climate', 'species', 'water', 'riskScores',
    'landCover', 'flood', 'solarWind', 'pollen',
  ];
  const total = criticalApis.length;
  const ok = criticalApis.filter(k => apiStatus[k] === 'ok').length;
  const completeness = ok / total;
  // Linear interpolation: 100% complete = ±12%, 0% complete = ±35%
  const interval = Math.round(35 - completeness * 23);
  return {
    interval,
    confidence: 95,
    label: `\u00b1${interval}% at 95% CI`,
    completeness: Math.round(completeness * 100),
    apisOk: ok,
    apisTotal: total,
  };
}

// ── 3. buildMapUrls ────────────────────────────────────────

/**
 * Generate Mapbox static map URLs at 4 zoom levels with GeoJSON boundary overlay.
 * Boundary overlay color: #D4A574 (brand-amber).
 */
export function buildMapUrls(boundary, center) {
  const token = typeof process !== 'undefined' ? process.env?.VITE_MAPBOX_TOKEN : null;
  if (!token || !boundary || boundary.length < 3) {
    return { satellite: null, overview: null, regional: null, detail: null };
  }

  const STROKE = '#D4A574';
  const coords = boundary.map(p => [p[1], p[0]]); // [lng, lat]
  if (coords.length > 0) coords.push(coords[0]); // close polygon

  const geojson = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        stroke: STROKE,
        'stroke-width': 3,
        'stroke-opacity': 1,
        fill: STROKE,
        'fill-opacity': 0.12,
      },
      geometry: { type: 'Polygon', coordinates: [coords] },
    }],
  };

  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  const lng = center[1], lat = center[0];

  function url(style, zoom, w = 700, h = 440) {
    if (zoom === 'auto') {
      return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${w}x${h}@2x?access_token=${token}&padding=40`;
    }
    return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${token}`;
  }

  return {
    satellite: url('satellite-v9', 'auto'),
    overview: url('outdoors-v12', 'auto'),
    regional: url('light-v11', 9, 700, 440),
    detail: url('satellite-streets-v12', 15, 700, 440),
  };
}

// ── Derived data helpers ───────────────────────────────────

function computeTrends(raw) {
  const result = {
    tempPerDecade: null,
    precipPerDecade: null,
    fireProneByDecade: [],
    yearly: [],
  };

  const trendsRaw = raw.climateTrends?.ok ? raw.climateTrends.data : null;
  if (!trendsRaw?.daily) return result;

  const daily = trendsRaw.daily;
  const yearlyStats = {};

  (daily.time || []).forEach((dateStr, i) => {
    const year = dateStr.substring(0, 4);
    if (!yearlyStats[year]) yearlyStats[year] = { temps: [], precip: 0, fireProneDays: 0, hotDays: 0, et0: 0, et0Days: 0 };
    const tMax = daily.temperature_2m_max?.[i];
    const tMin = daily.temperature_2m_min?.[i];
    const precip = daily.precipitation_sum?.[i];
    const et0   = daily.et0_fao_evapotranspiration?.[i];
    if (tMax != null && tMin != null) yearlyStats[year].temps.push((tMax + tMin) / 2);
    if (precip != null) yearlyStats[year].precip += precip;
    if (precip != null && precip < 1 && tMax > 30) yearlyStats[year].fireProneDays++;
    if (tMax != null && tMax > 30) yearlyStats[year].hotDays++;
    if (typeof et0 === 'number') { yearlyStats[year].et0 += et0; yearlyStats[year].et0Days++; }
  });

  const years = Object.keys(yearlyStats).sort();
  const annualTemps = years.map(y =>
    yearlyStats[y].temps.length
      ? +(yearlyStats[y].temps.reduce((a, b) => a + b, 0) / yearlyStats[y].temps.length).toFixed(2)
      : null
  );
  const annualPrecip = years.map(y => Math.round(yearlyStats[y].precip));
  const fireProneDays = years.map(y => yearlyStats[y].fireProneDays);

  const tempTrend = linearTrend(years.map(Number), annualTemps);
  const precipTrend = linearTrend(years.map(Number), annualPrecip);

  result.tempPerDecade = Math.round(tempTrend.perDecade * 100) / 100;
  result.precipPerDecade = Math.round(precipTrend.perDecade);

  // Decadal fire-prone days
  const decades = {};
  years.forEach((y, i) => {
    const dec = y.substring(0, 3) + '0s';
    if (!decades[dec]) decades[dec] = [];
    decades[dec].push(fireProneDays[i]);
  });
  result.fireProneByDecade = Object.entries(decades).map(([decade, vals]) => ({
    decade,
    avgDays: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10,
  }));

  // Per-year mean temp + total precip — preserved for the dashboard's
  // historic panel which renders the actual time series, not just the trend.
  result.yearly = years.map((y, i) => {
    const s = yearlyStats[y];
    // Only surface ET₀ when the year is reasonably complete (≥ 300 days
    // with data) — partial years would otherwise show artificially low
    // ET₀ and inflate the apparent water surplus.
    const et0 = s.et0Days >= 300 ? Math.round(s.et0) : null;
    const precip = annualPrecip[i];
    return {
      year: Number(y),
      meanTemp: annualTemps[i],
      precip,
      hotDays: s.hotDays,
      et0,
      waterBalance: (et0 != null && typeof precip === 'number') ? precip - et0 : null,
    };
  }).filter(y => Number.isFinite(y.year));

  // Last full calendar year's monthly precip (Jan→Dec), aligned to the
  // 1991–2020 monthly normals so the dashboard can render a 12-month
  // wetter/drier-than-normal anomaly.
  const lastYear = years[years.length - 1];
  if (lastYear) {
    const monthly = Array(12).fill(0);
    const monthlyHasData = Array(12).fill(false);
    (daily.time || []).forEach((dateStr, i) => {
      if (!dateStr.startsWith(lastYear)) return;
      const m = Number(dateStr.substring(5, 7)) - 1;
      const v = daily.precipitation_sum?.[i];
      if (typeof v === 'number') { monthly[m] += v; monthlyHasData[m] = true; }
    });
    result.last12MonthsPrecip = monthly.map((total, i) => ({
      monthIndex: i,
      total: monthlyHasData[i] ? Math.round(total) : null,
    }));
    result.last12MonthsYear = Number(lastYear);
  }

  return result;
}

function deriveEnergyPotential(lat, terrain, water, annualRainfall, solarWindData) {
  function levelFromScore(score) {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
  }

  // Solar: use real irradiance data if available (MJ/m²/day), else latitude proxy
  // Reference: 10 MJ/m²/day = low, 15 = moderate, 20+ = high (Southern Europe ~18-22)
  let solarScore;
  let solarDetail;
  if (solarWindData?.solarIrradianceMJ != null) {
    const irr = solarWindData.solarIrradianceMJ;
    solarScore = Math.min(100, Math.round((irr / 25) * 100));
    solarDetail = `${irr} MJ/m²/day (${solarWindData.year})`;
  } else {
    solarScore = Math.min(100, Math.round(Math.max(0, 100 - Math.abs(lat - 35) * 3)));
    solarDetail = `${solarScore}/100 (latitude estimate)`;
  }

  // Wind: use real wind speed if available (km/h mean), else elevation proxy
  // Reference: <10 km/h = low, 10-20 = moderate, 20+ = high
  let windScore;
  let windDetail;
  if (solarWindData?.windSpeedMean != null) {
    const ws = solarWindData.windSpeedMean;
    windScore = Math.min(100, Math.round((ws / 30) * 100));
    windDetail = `${ws} km/h mean (${solarWindData.year})`;
  } else {
    const elevBonus = terrain.elevation ? Math.min(20, terrain.elevation / 50) : 0;
    windScore = Math.min(100, Math.round(30 + elevBonus));
    windDetail = `${windScore}/100 (elevation estimate)`;
  }

  // Micro-hydro: depends on water features, slope, and rainfall
  const waterFeatures = water.springs + water.waterways;
  const slopeBonus = terrain.slope ? Math.min(20, terrain.slope * 2) : 0;
  const rainBonus = annualRainfall ? Math.min(20, annualRainfall / 50) : 0;
  const hydroScore = Math.min(100, Math.round(waterFeatures * 15 + slopeBonus + rainBonus));

  // Biomass: moderate in Mediterranean, depends on rainfall and vegetation
  const biomassScore = Math.min(100, Math.round(30 + (annualRainfall ? annualRainfall / 30 : 0)));

  // Independence score: weighted average
  const independenceScore = Math.round((solarScore * 0.4 + windScore * 0.2 + hydroScore * 0.2 + biomassScore * 0.2));

  return {
    solar: {
      level: levelFromScore(solarScore),
      detail: solarDetail,
      score: solarScore,
      kWhPerM2Yr: solarWindData?.solarAnnualKWhPerM2 ?? null,
    },
    wind: {
      level: levelFromScore(windScore),
      detail: windDetail,
      score: windScore,
      ms100m: solarWindData?.windSpeedMs100m ?? null,
    },
    microHydro: { level: levelFromScore(hydroScore), detail: `${hydroScore}/100 potential`, score: hydroScore },
    biomass: { level: levelFromScore(biomassScore), detail: `${biomassScore}/100 potential`, score: biomassScore },
    independenceScore,
  };
}

function deriveAgriSystems(landCover, climate, soil, terrain) {
  const systems = [];
  const label = landCover?.label?.toLowerCase() || '';

  // Suggest systems based on land cover and conditions
  if (label.includes('olive') || label.includes('agro-forestry') || label.includes('agroforestry')) {
    systems.push({ name: 'Olive Groves', suitability: 'High', description: 'Existing olive or agroforestry land cover detected' });
  }
  if (label.includes('vineyard')) {
    systems.push({ name: 'Viticulture', suitability: 'High', description: 'Existing vineyard land cover detected' });
  }
  if (label.includes('pasture') || label.includes('grassland')) {
    systems.push({ name: 'Pastoral / Grazing', suitability: 'High', description: 'Existing pasture or grassland cover' });
  }
  if (label.includes('forest') || label.includes('woodland')) {
    systems.push({ name: 'Agroforestry', suitability: 'High', description: 'Existing forest or woodland cover suitable for silvopasture' });
  }

  // Climate-based suggestions
  if (climate.zone === 'Mediterranean' || climate.annualMeanTemp > 14) {
    if (!systems.find(s => s.name === 'Olive Groves')) {
      systems.push({ name: 'Olive Groves', suitability: 'Moderate', description: 'Climate suitable for olive cultivation' });
    }
    systems.push({ name: 'Cork Oak', suitability: 'Moderate', description: 'Mediterranean climate supports cork oak silviculture' });
  }
  if (climate.annualRainfall > 500) {
    systems.push({ name: 'Rain-fed Cereals', suitability: 'Moderate', description: 'Adequate rainfall for rain-fed grain production' });
  }

  // Soil-based
  if (soil.ph != null && soil.ph >= 5.5 && soil.ph <= 7.5) {
    systems.push({ name: 'Horticulture', suitability: 'Moderate', description: 'Soil pH within optimal range for vegetable/fruit production' });
  }

  // Terrain-based
  if (terrain.slope != null && terrain.slope < 10) {
    systems.push({ name: 'Row Crops', suitability: terrain.slope < 5 ? 'High' : 'Moderate', description: `Slope of ${terrain.slope}% allows mechanised cultivation` });
  }

  // Deduplicate
  const seen = new Set();
  return systems.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}

const REGULATIONS_BY_COUNTRY = {
  PT: [
    { name: 'PDM (Plano Director Municipal)', description: 'Municipal master plan — zoning, building, land-use rules', authority: 'Câmara Municipal' },
    { name: 'RAN (Reserva Agrícola Nacional)', description: 'National agricultural reserve — restricts non-agricultural use of quality farmland', authority: 'DGADR' },
    { name: 'REN (Reserva Ecológica Nacional)', description: 'National ecological reserve — protects sensitive ecological areas', authority: 'CCDR' },
    { name: 'Natura 2000', description: 'EU habitat and bird protection network', authority: 'ICNF' },
    { name: 'RJUE (Regime Jurídico da Urbanização e Edificação)', description: 'Building and urbanization legal framework', authority: 'Câmara Municipal' },
    { name: 'Water Resources Law (Lei da Água)', description: 'Riparian buffer zones, water abstraction permits', authority: 'APA' },
    { name: 'Forest Fire Prevention (DFCI)', description: 'Fuel management, firebreak maintenance requirements', authority: 'ICNF / Câmara Municipal' },
    { name: 'EU CAP (Common Agricultural Policy)', description: 'Subsidy eligibility, cross-compliance, eco-schemes', authority: 'IFAP' },
  ],
  ES: [
    { name: 'PGOU (Plan General de Ordenación Urbana)', description: 'Municipal urban planning and zoning', authority: 'Ayuntamiento' },
    { name: 'Ley de Montes', description: 'Forest law — reforestation obligations, fire prevention', authority: 'Comunidad Autónoma' },
    { name: 'Natura 2000', description: 'EU habitat and bird protection network', authority: 'Ministerio para la Transición Ecológica' },
    { name: 'Ley de Aguas', description: 'Water resources law — concessions, riparian zones', authority: 'Confederación Hidrográfica' },
    { name: 'PAC (Política Agrícola Común)', description: 'CAP subsidies, eco-schemes, cross-compliance', authority: 'FEGA' },
    { name: 'Ley de Patrimonio Natural y Biodiversidad', description: 'Protected species and habitats', authority: 'Comunidad Autónoma' },
  ],
  FR: [
    { name: 'PLU (Plan Local d\'Urbanisme)', description: 'Local urban plan — zoning and land use', authority: 'Mairie / Communauté de communes' },
    { name: 'Natura 2000', description: 'EU habitat and bird protection network', authority: 'DREAL' },
    { name: 'Code Forestier', description: 'Forest code — reforestation, fire clearing obligations', authority: 'ONF / DDT' },
    { name: 'Loi sur l\'eau', description: 'Water law — abstraction permits, wetland protection', authority: 'Agence de l\'eau' },
    { name: 'PAC (Politique Agricole Commune)', description: 'CAP subsidies, eco-schemes, cross-compliance', authority: 'ASP' },
    { name: 'Code de l\'environnement', description: 'Environmental protection, impact assessments', authority: 'DREAL' },
  ],
};

const TIMELINES_BY_COUNTRY = {
  PT: [
    { action: 'Verify PDM zoning classification', deadline: 'Before any development', priority: 'High' },
    { action: 'Check RAN/REN status at CCDR', deadline: 'Before land use changes', priority: 'High' },
    { action: 'Register with IFAP for CAP subsidies', deadline: 'Annual application cycle', priority: 'Medium' },
    { action: 'Submit DFCI fuel management plan', deadline: 'Before fire season (May)', priority: 'High' },
    { action: 'Apply for water abstraction license if needed', deadline: 'Before installation', priority: 'Medium' },
  ],
  ES: [
    { action: 'Verify PGOU classification at Ayuntamiento', deadline: 'Before any development', priority: 'High' },
    { action: 'Check Natura 2000 / Red Natura overlay', deadline: 'Before land use changes', priority: 'High' },
    { action: 'Register for PAC at FEGA', deadline: 'Annual application cycle', priority: 'Medium' },
    { action: 'Submit fire prevention plan if forested', deadline: 'Before fire season (June)', priority: 'High' },
  ],
  FR: [
    { action: 'Verify PLU classification at Mairie', deadline: 'Before any development', priority: 'High' },
    { action: 'Check Natura 2000 overlay at DREAL', deadline: 'Before land use changes', priority: 'High' },
    { action: 'Register for PAC at ASP', deadline: 'Annual application cycle (May)', priority: 'Medium' },
    { action: 'Declare water usage if applicable', deadline: 'Before abstraction', priority: 'Medium' },
  ],
};

function buildComplianceSection(property, protectedAreas, countryCode) {
  const cc = countryCode || 'PT'; // default Portugal
  const baseItems = REGULATIONS_BY_COUNTRY[cc] || REGULATIONS_BY_COUNTRY.PT;

  // Check Natura 2000 overlap from Overpass protected areas data
  const natura2000Names = protectedAreas
    .filter(pa => pa.type === 'protected_area' || pa.designation?.includes('natura') || pa.name?.toLowerCase().includes('natura'))
    .map(pa => pa.name);
  const inNatura2000 = natura2000Names.length > 0;

  const items = baseItems.map(item => {
    if (item.name.includes('Natura 2000')) {
      return {
        ...item,
        status: inNatura2000 ? 'Applicable' : 'Not applicable',
        notes: inNatura2000 ? `Inside: ${natura2000Names.slice(0, 2).join(', ')}` : 'No Natura 2000 sites detected within property boundary',
      };
    }
    return { ...item, status: 'Check required' };
  });

  const timeline = TIMELINES_BY_COUNTRY[cc] || TIMELINES_BY_COUNTRY.PT;

  return { items, timeline, countryCode: cc };
}

function deriveActions(riskProfile, scores, water, fire, soil, terrain, areaHa) {
  const immediate = [];
  const shortTerm = [];
  const longTerm = [];

  // Fire risk actions
  if (riskProfile?.fire?.level === 'High' || riskProfile?.fire?.level === 'Critical') {
    immediate.push({
      action: 'Create 10m firebreaks around buildings and property boundaries',
      category: 'Fire Safety',
      priority: 'Critical',
      impact: 'Reduces structural fire exposure',
    });
    shortTerm.push({
      action: 'Develop a fuel management plan — clear dry brush, prune lower branches',
      category: 'Fire Safety',
      priority: 'High',
      impact: 'Lowers fire intensity and spread rate',
    });
  } else if (riskProfile?.fire?.level === 'Moderate') {
    shortTerm.push({
      action: 'Maintain firebreaks and clear vegetation around structures',
      category: 'Fire Safety',
      priority: 'Medium',
      impact: 'Maintains defensible space',
    });
  }

  // Water security
  if (water.securityIndex < 5) {
    immediate.push({
      action: 'Assess water sources — consider drilling a borehole or building cisterns',
      category: 'Water Security',
      priority: 'High',
      impact: 'Secures year-round water access',
    });
  }
  if (water.springs === 0 && water.wells === 0) {
    shortTerm.push({
      action: 'Commission a hydrogeological survey to identify groundwater potential',
      category: 'Water Security',
      priority: 'Medium',
      impact: 'Identifies viable water extraction points',
    });
  }

  // Soil
  if (soil.ph != null && (soil.ph < 5.5 || soil.ph > 7.5)) {
    shortTerm.push({
      action: `Soil pH is ${soil.ph} — consider ${soil.ph < 5.5 ? 'liming to raise' : 'sulfur amendment to lower'} pH`,
      category: 'Soil Health',
      priority: 'Medium',
      impact: 'Improves nutrient availability and crop viability',
    });
  }

  // Biodiversity
  if (scores.biodiversity != null && scores.biodiversity < 40) {
    longTerm.push({
      action: 'Plant native species corridors to improve habitat connectivity',
      category: 'Biodiversity',
      priority: 'Medium',
      impact: 'Increases species richness and ecological resilience',
    });
  }

  // Erosion / slope
  if (terrain.slope != null && terrain.slope > 10) {
    shortTerm.push({
      action: 'Install erosion control measures on steep slopes — terracing, swales, or cover crops',
      category: 'Land Management',
      priority: 'High',
      impact: 'Prevents topsoil loss and sedimentation',
    });
  }

  // Carbon
  longTerm.push({
    action: 'Develop a carbon sequestration plan — explore voluntary carbon market registration',
    category: 'Carbon',
    priority: 'Medium',
    impact: 'Unlocks carbon credit revenue stream',
  });

  // General
  if (areaHa > 5) {
    longTerm.push({
      action: 'Design an integrated land management plan covering water, fire, biodiversity, and production',
      category: 'Strategy',
      priority: 'Medium',
      impact: 'Coordinates interventions for maximum return',
    });
  }

  // Always recommend
  immediate.push({
    action: 'Walk the property boundaries — verify fence lines, access points, and water features',
    category: 'Assessment',
    priority: 'Medium',
    impact: 'Ground-truths satellite and API data',
  });

  return { immediate, shortTerm, longTerm };
}
