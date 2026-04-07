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
  processSoilMoisture,
  estimateFrostDates,
} from '../api/open-meteo.js';

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
import { getAdminUnit } from '../api/dgt.js';
import { getForecast as getIPMAForecast, getNearestForecastLocation } from '../api/ipma.js';
import { reverseGeocode } from '../api/nominatim.js';

import {
  computeAllScores,
  computeEcosystemServices,
  computeRevenueScenarios,
  computeRiskProfile,
} from './report-scores.js';

// ── Helpers ────────────────────────────────────────────────

/** Wrap an async call so one failure never crashes the pipeline */
async function safe(label, fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    console.warn(`[pipeline] ${label} failed:`, error.message);
    return { ok: false, error: error.message };
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
 * Each slot returns { ok: true, data } or { ok: false, error }.
 */
export async function fetchAllData(lat, lng, boundary, areaHa) {
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
  ];

  const settled = await Promise.all(
    entries.map(([label, fn]) => safe(label, fn))
  );

  entries.forEach(([label], i) => {
    results[label] = settled[i];
  });

  // IPMA forecast depends on ipmaLocation result
  if (results.ipmaLocation.ok && results.ipmaLocation.data) {
    const locId = results.ipmaLocation.data.globalIdLocal;
    if (locId) {
      results.ipmaForecast = await safe('ipmaForecast', () => getIPMAForecast(locId));
    } else {
      results.ipmaForecast = { ok: false, error: 'No IPMA location ID' };
    }
  } else {
    results.ipmaForecast = { ok: false, error: 'IPMA location lookup failed' };
  }

  return results;
}

// ── Multi-point elevation for slope/aspect ─────────────────

async function getMultiPointElevation(boundary, center) {
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
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
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

async function getLandCoverAtPoint(lat, lng) {
  // Try CORINE
  const d = 0.0005;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const url = `https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=12&QUERY_LAYERS=12&BBOX=${bbox}&WIDTH=2&HEIGHT=2&X=1&Y=1&SRS=EPSG:4326&INFO_FORMAT=application/json`;
  const res = await fetch(url);
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
 */
export function processRawData(raw, submission, areaHa) {
  const missingFields = [];
  const apiStatus = {};

  // Track API statuses
  for (const [key, result] of Object.entries(raw)) {
    apiStatus[key] = result.ok ? 'ok' : result.error;
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

  const clayPct = soilParsed ? parseFloat(soilParsed.clay) : null;
  const sandPct = soilParsed ? parseFloat(soilParsed.sand) : null;
  const siltPct = (clayPct != null && sandPct != null) ? (100 - clayPct - sandPct) : (soilParsed ? parseFloat(soilParsed.silt) : null);

  const soil = {
    ph: soilParsed ? parseFloat(soilParsed.ph) : null,
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

  if (waterRaw) {
    const nodes = extractNodes(waterRaw);
    const ways = extractWays(waterRaw);
    springs = nodes.filter(n => n.tags?.natural === 'spring').length;
    wells = nodes.filter(n => n.tags?.man_made === 'water_well').length;
    waterways = ways.filter(w => w.tags?.waterway).length;
    waterBodies = ways.filter(w => w.tags?.natural === 'water').length;
  }

  const floodRaw = raw.flood?.ok ? raw.flood.data : null;
  const floodAnalysis = floodRaw ? analyzeFloodRisk(floodRaw) : null;
  const totalWaterFeatures = springs + wells + waterways + waterBodies;
  const waterSecurityIndex = Math.min(10, 2 + totalWaterFeatures * 0.8 + (annualRainfall ? annualRainfall / 200 : 0));

  const water = {
    springs, wells, waterways, waterBodies,
    securityIndex: Math.round(waterSecurityIndex * 10) / 10,
    floodDischarge: floodAnalysis?.current ?? null,
    floodRisk: floodAnalysis?.level ?? 'Unknown',
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

  const top10 = speciesSummary.species.slice(0, 10).map(s => ({
    name: s.name,
    scientificName: s.scientificName,
    group: s.group,
    count: s.observationCount,
  }));

  const gbifKingdoms = Object.entries(gbifSummary.kingdoms).map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const species = {
    total: speciesSummary.total,
    groups: groupEntries,
    top10,
    threatened: threatenedSummary.total,
    gbifTotal: gbifSummary.total,
    gbifKingdoms,
    trends: null, // populated in trends section
  };

  // ── Scores ────────────────────────────────────────────
  const allScores = computeAllScores(raw, areaHa);
  const ecosystemServices = computeEcosystemServices(areaHa, raw);
  const revenueScenarios = computeRevenueScenarios(areaHa);
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

  // ── Flood ─────────────────────────────────────────────
  const flood = {
    riskScore: riskScoresData?.flood != null ? Math.round(riskScoresData.flood / 20) : null, // 0-100 → 0-5
    riskLevel: riskScoresData?.floodLabel ?? scoreToLabel(riskScoresData?.flood ?? 0),
  };

  // ── Drought ───────────────────────────────────────────
  const drought = {
    riskScore: riskScoresData?.drought != null ? Math.round(riskScoresData.drought / 20) : null, // 0-100 → 0-5
    riskLevel: riskScoresData?.droughtLabel ?? scoreToLabel(riskScoresData?.drought ?? 0),
  };

  // ── Energy potential ──────────────────────────────────
  const energy = deriveEnergyPotential(lat, terrain, water, annualRainfall);

  // ── Economics ─────────────────────────────────────────
  const carbonStockPerHa = allScores.carbonStockTotal ? allScores.carbonStockTotal / areaHa : 0;
  const carbonAnnualSeq = Math.round(areaHa * 3.5); // ~3.5 tCO2/ha/yr Mediterranean average
  const carbonCreditValue = Math.round(carbonAnnualSeq * 45); // ~EUR 45/tCO2

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

  // NPV from computeEcosystemServices returns a number; wrap in object with scenarios
  const npvValue = ecosystemServices.npv ?? 0;
  const npvObj = {
    thirtyYear: npvValue,
    scenarios: [
      { name: 'Business as Usual', npv: Math.round(npvValue * 0.8), assumptions: 'Current management', riskLevel: 'Low' },
      { name: 'Climate Resilience', npv: npvValue, assumptions: 'Water efficiency, fire protection', riskLevel: 'Medium' },
      { name: 'Conservation', npv: Math.round(npvValue * 1.1), assumptions: 'Ecosystem service markets', riskLevel: 'Medium-High' },
      { name: 'Intensification', npv: Math.round(npvValue * 0.75), assumptions: 'Maximize short-term yields', riskLevel: 'High' },
    ],
  };

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
    npv: npvObj,
    revenueScenarios: revKeyed,
    carbonStock: allScores.carbonStockTotal ?? 0,
    carbonAnnualSeq,
    carbonCreditValue,
  };

  // ── Agriculture ───────────────────────────────────────
  const lcData = raw.landCover?.ok ? raw.landCover.data : null;
  const agriculture = {
    landCover: lcData?.label ?? null,
    systems: deriveAgriSystems(lcData, climate, soil, terrain),
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

  const regional = {
    protectedAreas: protectedList,
    percentiles: {}, // would require regional comparison data
    comparisons: {},
  };

  // ── Trends ────────────────────────────────────────────
  const trendsData = computeTrends(raw);

  const trends = {
    tempPerDecade: trendsData.tempPerDecade,
    precipPerDecade: trendsData.precipPerDecade,
    fireProneByDecade: trendsData.fireProneByDecade,
    bioWindows: computeBioWindows(lat, lng),
    gbifWindows: computeGBIFWindows(),
  };

  // ── Compliance (static) ───────────────────────────────
  const compliance = buildComplianceSection(property);

  // ── Actions ───────────────────────────────────────────
  const actions = deriveActions(riskProfile, scores, water, fire, soil, terrain, areaHa);

  return {
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
    },
  };
}

// ── 3. buildMapUrls ────────────────────────────────────────

/**
 * Generate Mapbox static map URLs at 4 zoom levels with GeoJSON boundary overlay.
 * Boundary overlay color: #1B4332 (deep forest green).
 */
export function buildMapUrls(boundary, center) {
  const token = typeof process !== 'undefined' ? process.env?.VITE_MAPBOX_TOKEN : null;
  if (!token || !boundary || boundary.length < 3) {
    return { satellite: null, overview: null, regional: null, detail: null };
  }

  const STROKE = '#1B4332';
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
  };

  const trendsRaw = raw.climateTrends?.ok ? raw.climateTrends.data : null;
  if (!trendsRaw?.daily) return result;

  const daily = trendsRaw.daily;
  const yearlyStats = {};

  (daily.time || []).forEach((dateStr, i) => {
    const year = dateStr.substring(0, 4);
    if (!yearlyStats[year]) yearlyStats[year] = { temps: [], precip: 0, fireProneDays: 0 };
    const tMax = daily.temperature_2m_max?.[i];
    const tMin = daily.temperature_2m_min?.[i];
    const precip = daily.precipitation_sum?.[i];
    if (tMax != null && tMin != null) yearlyStats[year].temps.push((tMax + tMin) / 2);
    if (precip != null) yearlyStats[year].precip += precip;
    if (precip != null && precip < 1 && tMax > 30) yearlyStats[year].fireProneDays++;
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

  return result;
}

function deriveEnergyPotential(lat, terrain, water, annualRainfall) {
  function levelFromScore(score) {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
  }

  // Solar: higher at lower latitudes, less cloud cover
  const solarScore = Math.min(100, Math.round(Math.max(0, 100 - Math.abs(lat - 35) * 3)));

  // Wind: higher at higher elevations, coastal areas
  const elevBonus = terrain.elevation ? Math.min(20, terrain.elevation / 50) : 0;
  const windScore = Math.min(100, Math.round(30 + elevBonus));

  // Micro-hydro: depends on water features and rainfall
  const waterFeatures = water.springs + water.waterways;
  const slopeBonus = terrain.slope ? Math.min(20, terrain.slope * 2) : 0;
  const rainBonus = annualRainfall ? Math.min(20, annualRainfall / 50) : 0;
  const hydroScore = Math.min(100, Math.round(waterFeatures * 15 + slopeBonus + rainBonus));

  // Biomass: moderate in Mediterranean, depends on rainfall and vegetation
  const biomassScore = Math.min(100, Math.round(30 + (annualRainfall ? annualRainfall / 30 : 0)));

  // Independence score: weighted average
  const independenceScore = Math.round((solarScore * 0.4 + windScore * 0.2 + hydroScore * 0.2 + biomassScore * 0.2));

  return {
    solar: { level: levelFromScore(solarScore), detail: `${solarScore}/100 potential`, score: solarScore },
    wind: { level: levelFromScore(windScore), detail: `${windScore}/100 potential`, score: windScore },
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

function buildComplianceSection(property) {
  // Static Portuguese/EU regulations relevant to rural land
  const items = [
    {
      name: 'PDM (Plano Director Municipal)',
      description: 'Municipal master plan — zoning, building, land-use rules',
      authority: 'Câmara Municipal',
      status: 'Check required',
    },
    {
      name: 'RAN (Reserva Agrícola Nacional)',
      description: 'National agricultural reserve — restricts non-agricultural use of quality farmland',
      authority: 'DGADR',
      status: 'Check required',
    },
    {
      name: 'REN (Reserva Ecológica Nacional)',
      description: 'National ecological reserve — protects sensitive ecological areas',
      authority: 'CCDR',
      status: 'Check required',
    },
    {
      name: 'Natura 2000',
      description: 'EU habitat and bird protection network',
      authority: 'ICNF',
      status: 'Check required',
    },
    {
      name: 'RJUE (Regime Jurídico da Urbanização e Edificação)',
      description: 'Building and urbanization legal framework',
      authority: 'Câmara Municipal',
      status: 'Check required',
    },
    {
      name: 'Water Resources Law (Lei da Água)',
      description: 'Riparian buffer zones, water abstraction permits',
      authority: 'APA',
      status: 'Check required',
    },
    {
      name: 'Forest Fire Prevention (DFCI)',
      description: 'Fuel management, firebreak maintenance requirements',
      authority: 'ICNF / Câmara Municipal',
      status: 'Check required',
    },
    {
      name: 'EU CAP (Common Agricultural Policy)',
      description: 'Subsidy eligibility, cross-compliance, eco-schemes',
      authority: 'IFAP',
      status: 'Check required',
    },
  ];

  const timeline = [
    { action: 'Verify PDM zoning classification', deadline: 'Before any development', priority: 'High' },
    { action: 'Check RAN/REN status at CCDR', deadline: 'Before land use changes', priority: 'High' },
    { action: 'Register with IFAP for CAP subsidies', deadline: 'Annual application cycle', priority: 'Medium' },
    { action: 'Submit DFCI fuel management plan', deadline: 'Before fire season (May)', priority: 'High' },
    { action: 'Apply for water abstraction license if needed', deadline: 'Before installation', priority: 'Medium' },
  ];

  return { items, timeline };
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
