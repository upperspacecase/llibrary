/**
 * Fact Store
 *
 * CRUD for the `facts` collection.
 * One document per landbook — every leaf field wrapped as { value, unit, confidence, sourceRef }.
 */

import { createHash } from 'crypto';
import { getCollection } from '../../api/_db.js';

const COLLECTION = 'facts';

let indexEnsured = false;

async function col() {
  const c = await getCollection(COLLECTION);
  if (!indexEnsured) {
    await c.createIndex({ landbookId: 1 }, { unique: true }).catch(() => {});
    indexEnsured = true;
  }
  return c;
}

// ── Helpers ───────────────────────────────────────────────

function wrap(value, unit = null, source = null) {
  return {
    value: value ?? null,
    unit,
    confidence: value != null ? 'high' : 'missing',
    sourceRef: source,
  };
}

function unwrap(field) {
  if (field && typeof field === 'object' && 'value' in field) return field.value;
  return field ?? null;
}

// ── CRUD ──────────────────────────────────────────────────

/**
 * Stringify with recursively sorted keys so equal objects always hash the same.
 * Plain JSON.stringify(obj, replacerArray) only filters keys, doesn't sort —
 * and as a replacer array it filters at every level which is rarely what you want.
 */
function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableJson).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableJson(value[k])).join(',') + '}';
}

/**
 * Build the canonical hash input. Strips fields that change every run
 * even when the underlying data is identical (timestamps, run-scoped metadata).
 */
function buildHashInput(source, schemaVersion) {
  if (!source || typeof source !== 'object') return { schemaVersion, source: null };
  const cloned = JSON.parse(JSON.stringify(source));
  if (cloned.meta) {
    delete cloned.meta.generatedAt;
    // meta.validation reflects the parse outcome of THIS hash input itself —
    // including it would create a feedback loop where adding/removing schema
    // issues changes the hash, which is correct, but firstIssues contains the
    // human messages that may shift wording without semantic change. Keep
    // ok+issueCount; drop the message text.
    if (cloned.meta.validation) {
      cloned.meta.validation = {
        ok: cloned.meta.validation.ok,
        issueCount: cloned.meta.validation.issueCount,
      };
    }
  }
  return { schemaVersion, source: cloned };
}

/**
 * @param {string} landbookId
 * @param {Object} facts - the wrapped fact ontology (output of reportDataToFacts)
 * @param {{
 *   runId?: string,
 *   schemaVersion?: number,
 *   hashSource?: object,  // unwrapped reportData to hash. Falls back to facts when omitted.
 * }} [ctx]
 */
export async function saveFacts(landbookId, facts, ctx = {}) {
  const c = await col();

  const schemaVersion = ctx.schemaVersion || 1;
  // Prefer hashing the unwrapped canonical content, not the wrap envelope.
  // If the caller didn't supply hashSource, fall back to the wrapped facts —
  // suboptimal but stable (and matches the pre-Phase-5 surface).
  const hashInput = buildHashInput(ctx.hashSource || facts, schemaVersion);
  const contentHash = createHash('sha256')
    .update(stableJson(hashInput))
    .digest('hex')
    .slice(0, 16);

  await c.updateOne(
    { landbookId },
    {
      $set: {
        ...facts,
        landbookId,
        contentHash,
        runId: ctx.runId || null,
        schemaVersion,
        updatedAt: new Date().toISOString(),
      },
      $inc: { version: 1 },
    },
    { upsert: true }
  );

  return { contentHash };
}

export async function getFacts(landbookId) {
  const c = await col();
  return c.findOne({ landbookId });
}

export async function deleteFacts(landbookId) {
  const c = await col();
  await c.deleteOne({ landbookId });
}

// ── Converters ────────────────────────────────────────────

/**
 * Convert existing ReportData into the fact ontology shape.
 * Used during dual-write (Phase 1) to populate facts from existing pipeline output.
 */
export function reportDataToFacts(data) {
  return {
    property: {
      name: wrap(data.property?.name),
      address: wrap(data.property?.address),
      area: wrap(data.property?.area, 'ha'),
      coords: wrap(data.property?.coords),
      municipality: wrap(data.property?.municipality),
      parish: wrap(data.property?.parish),
    },
    terrain: {
      elevation: wrap(data.terrain?.elevation, 'm', 'elevation'),
      slope: wrap(data.terrain?.slope, '%', 'terrainProfile'),
      aspect: wrap(data.terrain?.aspect, null, 'terrainProfile'),
      range: wrap(data.terrain?.range, 'm', 'terrainProfile'),
    },
    soil: {
      classification: wrap(data.soil?.classification, null, 'soilClass'),
      ph: wrap(data.soil?.ph, null, 'soilProps'),
      organicCarbon: wrap(data.soil?.organicCarbon, 'g/kg', 'soilProps'),
      clay: wrap(data.soil?.clay, '%', 'soilProps'),
      sand: wrap(data.soil?.sand, '%', 'soilProps'),
      silt: wrap(data.soil?.silt, '%', 'soilProps'),
      nitrogen: wrap(data.soil?.nitrogen, 'g/kg', 'soilProps'),
      cec: wrap(data.soil?.cec, 'cmol/kg', 'soilProps'),
      bulkDensity: wrap(data.soil?.bulkDensity, 'kg/dm³', 'soilProps'),
    },
    geology: {
      lithology: wrap(data.geology?.lithology, null, 'geology'),
      environment: wrap(data.geology?.environment, null, 'geology'),
      period: wrap(data.geology?.period, null, 'geology'),
      age: wrap(data.geology?.age, 'Ma', 'geology'),
    },
    water: {
      securityIndex: wrap(data.water?.securityIndex, '/10', 'water'),
      springs: wrap(data.water?.springs, 'count', 'water'),
      wells: wrap(data.water?.wells, 'count', 'water'),
      waterways: wrap(data.water?.waterways, 'count', 'water'),
      waterBodies: wrap(data.water?.waterBodies, 'count', 'water'),
      features: wrap(data.water?.features, null, 'water'),
      nearestDistanceM: wrap(data.water?.nearestDistanceM, 'm', 'water'),
      floodDischarge: wrap(data.water?.floodDischarge, 'm³/s', 'flood'),
    },
    climate: {
      annualMeanTemp: wrap(data.climate?.annualMeanTemp, '°C', 'climate'),
      summerMean: wrap(data.climate?.summerMean, '°C', 'climate'),
      winterMean: wrap(data.climate?.winterMean, '°C', 'climate'),
      annualRainfall: wrap(data.climate?.annualRainfall, 'mm', 'climate'),
      growingSeason: wrap(data.climate?.growingSeason, 'days', 'climate'),
      zone: wrap(data.climate?.zone, null, 'climate'),
      frostDays: wrap(data.climate?.frostDays, 'days', 'climate'),
      monthlyAvgHigh: wrap(data.climate?.monthlyAvgHigh, '°C[]', 'climate'),
      monthlyAvgLow: wrap(data.climate?.monthlyAvgLow, '°C[]', 'climate'),
      monthlyPrecip: wrap(data.climate?.monthlyPrecip, 'mm[]', 'climate'),
    },
    species: {
      total: wrap(data.species?.total, 'count', 'species'),
      threatened: wrap(data.species?.threatened, 'count', 'threatened'),
      gbifTotal: wrap(data.species?.gbifTotal, 'count', 'gbif'),
      groups: wrap(data.species?.groups, null, 'species'),
      top10: wrap(data.species?.top10, null, 'species'),
      trends: wrap(data.species?.trends, null, 'species'),
    },
    fire: {
      riskScore: wrap(data.fire?.riskScore, '/5', 'riskScores'),
      riskLevel: wrap(data.fire?.riskLevel, null, 'riskScores'),
      activeFires: wrap(data.fire?.activeFires, 'count', 'activeFires'),
      historical: wrap(data.fire?.historical, null, 'historicalFires'),
    },
    flood: {
      riskScore: wrap(data.flood?.riskScore, '/5', 'water'),
      riskLevel: wrap(data.flood?.riskLevel, null, 'water'),
      hand: wrap(data.flood?.hand, 'm', 'water'),
      distanceToDrainageM: wrap(data.flood?.distanceToDrainageM, 'm', 'water'),
      drainageName: wrap(data.flood?.drainageName, null, 'water'),
      drainageKind: wrap(data.flood?.drainageKind, null, 'water'),
    },
    drought: {
      riskScore: wrap(data.drought?.riskScore, '/5', 'riskScores'),
      riskLevel: wrap(data.drought?.riskLevel, null, 'riskScores'),
    },
    energy: {
      independenceScore: wrap(data.energy?.independenceScore, '/10', 'solarWind'),
      solar: wrap(data.energy?.solar, null, 'solarWind'),
      wind: wrap(data.energy?.wind, null, 'solarWind'),
      microHydro: wrap(data.energy?.microHydro, null, 'water'),
      biomass: wrap(data.energy?.biomass, null, 'landCover'),
    },
    economics: {
      valuePerHa: wrap(data.economics?.valuePerHa, '€/ha'),
      totalValue: wrap(data.economics?.totalValue, '€'),
      ecosystemServices: wrap(data.economics?.ecosystemServices, null),
      npv: wrap(data.economics?.npv, null),
      revenueScenarios: wrap(data.economics?.revenueScenarios, null),
      carbonStock: wrap(data.economics?.carbonStock, 'tCO2e'),
      carbonAnnualSeq: wrap(data.economics?.carbonAnnualSeq, 'tCO2e/yr'),
      carbonCreditValue: wrap(data.economics?.carbonCreditValue, '€/yr'),
    },
    scores: {
      naturalCapital: wrap(data.scores?.naturalCapital, '/100'),
      carbon: wrap(data.scores?.carbon, '/100'),
      biodiversity: wrap(data.scores?.biodiversity, '/100'),
      water: wrap(data.scores?.water, '/100'),
      soil: wrap(data.scores?.soil, '/100'),
      pollination: wrap(data.scores?.pollination, '/100'),
      regional: wrap(data.scores?.regional, null),
    },
    maps: {
      satellite: wrap(data.maps?.satellite),
      overview: wrap(data.maps?.overview),
      regional: wrap(data.maps?.regional),
      detail: wrap(data.maps?.detail),
    },
    regional: {
      protectedAreas: wrap(data.regional?.protectedAreas, null, 'protectedAreas'),
      percentiles: wrap(data.regional?.percentiles, null, 'regionalBaseline'),
    },
    trends: {
      tempPerDecade: wrap(data.trends?.tempPerDecade, '°C/decade', 'climateTrends'),
      precipPerDecade: wrap(data.trends?.precipPerDecade, 'mm/decade', 'climateTrends'),
      fireProneByDecade: wrap(data.trends?.fireProneByDecade, null, 'climateTrends'),
      yearly: wrap(data.trends?.yearly, null, 'climateTrends'),
    },
    compliance: {
      items: wrap(data.compliance?.items),
      timeline: wrap(data.compliance?.timeline),
    },
    actions: {
      immediate: wrap(data.actions?.immediate),
      shortTerm: wrap(data.actions?.shortTerm),
      longTerm: wrap(data.actions?.longTerm),
    },
    agriculture: {
      landCover: wrap(data.agriculture?.landCover, null, 'landCover'),
      systems: wrap(data.agriculture?.systems, null),
    },
    meta: {
      generatedAt: wrap(data.meta?.generatedAt),
      version: wrap(data.meta?.version),
      apiStatus: wrap(data.meta?.apiStatus),
      missingFields: wrap(data.meta?.missingFields),
    },
  };
}

/**
 * Convert fact ontology back to plain ReportData shape.
 * Used as the compatibility bridge so existing components don't need to change.
 */
export function factsToReportData(facts) {
  return {
    property: {
      name: unwrap(facts.property?.name),
      address: unwrap(facts.property?.address),
      area: unwrap(facts.property?.area),
      coords: unwrap(facts.property?.coords),
      boundary: [], // boundary stored on landbook doc, not in facts
      municipality: unwrap(facts.property?.municipality),
      parish: unwrap(facts.property?.parish),
    },
    terrain: {
      elevation: unwrap(facts.terrain?.elevation),
      slope: unwrap(facts.terrain?.slope),
      aspect: unwrap(facts.terrain?.aspect),
      range: unwrap(facts.terrain?.range),
    },
    soil: {
      classification: unwrap(facts.soil?.classification),
      ph: unwrap(facts.soil?.ph),
      organicCarbon: unwrap(facts.soil?.organicCarbon),
      clay: unwrap(facts.soil?.clay),
      sand: unwrap(facts.soil?.sand),
      silt: unwrap(facts.soil?.silt),
      nitrogen: unwrap(facts.soil?.nitrogen),
      cec: unwrap(facts.soil?.cec),
      bulkDensity: unwrap(facts.soil?.bulkDensity),
    },
    geology: {
      lithology: unwrap(facts.geology?.lithology),
      environment: unwrap(facts.geology?.environment),
      period: unwrap(facts.geology?.period),
      age: unwrap(facts.geology?.age),
    },
    water: {
      securityIndex: unwrap(facts.water?.securityIndex),
      springs: unwrap(facts.water?.springs),
      wells: unwrap(facts.water?.wells),
      waterways: unwrap(facts.water?.waterways),
      waterBodies: unwrap(facts.water?.waterBodies),
      features: unwrap(facts.water?.features) || [],
      nearestDistanceM: unwrap(facts.water?.nearestDistanceM),
      floodDischarge: unwrap(facts.water?.floodDischarge),
    },
    climate: {
      annualMeanTemp: unwrap(facts.climate?.annualMeanTemp),
      summerMean: unwrap(facts.climate?.summerMean),
      winterMean: unwrap(facts.climate?.winterMean),
      annualRainfall: unwrap(facts.climate?.annualRainfall),
      growingSeason: unwrap(facts.climate?.growingSeason),
      zone: unwrap(facts.climate?.zone),
      frostDays: unwrap(facts.climate?.frostDays),
      monthlyAvgHigh: unwrap(facts.climate?.monthlyAvgHigh) || [],
      monthlyAvgLow: unwrap(facts.climate?.monthlyAvgLow) || [],
      monthlyPrecip: unwrap(facts.climate?.monthlyPrecip) || [],
    },
    species: {
      total: unwrap(facts.species?.total),
      threatened: unwrap(facts.species?.threatened),
      gbifTotal: unwrap(facts.species?.gbifTotal),
      groups: unwrap(facts.species?.groups) || [],
      top10: unwrap(facts.species?.top10) || [],
      trends: unwrap(facts.species?.trends) || {},
    },
    fire: {
      riskScore: unwrap(facts.fire?.riskScore),
      riskLevel: unwrap(facts.fire?.riskLevel),
      activeFires: unwrap(facts.fire?.activeFires),
      historical: unwrap(facts.fire?.historical) || [],
    },
    flood: {
      riskScore: unwrap(facts.flood?.riskScore),
      riskLevel: unwrap(facts.flood?.riskLevel),
      hand: unwrap(facts.flood?.hand),
      distanceToDrainageM: unwrap(facts.flood?.distanceToDrainageM),
      drainageName: unwrap(facts.flood?.drainageName),
      drainageKind: unwrap(facts.flood?.drainageKind),
    },
    drought: {
      riskScore: unwrap(facts.drought?.riskScore),
      riskLevel: unwrap(facts.drought?.riskLevel),
    },
    energy: {
      independenceScore: unwrap(facts.energy?.independenceScore),
      solar: unwrap(facts.energy?.solar) || {},
      wind: unwrap(facts.energy?.wind) || {},
      microHydro: unwrap(facts.energy?.microHydro) || {},
      biomass: unwrap(facts.energy?.biomass) || {},
    },
    economics: {
      valuePerHa: unwrap(facts.economics?.valuePerHa),
      totalValue: unwrap(facts.economics?.totalValue),
      ecosystemServices: unwrap(facts.economics?.ecosystemServices) || { water: 0, food: 0, carbon: 0, regulation: 0, soil: 0, cultural: 0 },
      npv: unwrap(facts.economics?.npv) || { thirtyYear: null, scenarios: [] },
      revenueScenarios: unwrap(facts.economics?.revenueScenarios) || { conservative: null, moderate: null, optimized: null },
      carbonStock: unwrap(facts.economics?.carbonStock),
      carbonAnnualSeq: unwrap(facts.economics?.carbonAnnualSeq),
      carbonCreditValue: unwrap(facts.economics?.carbonCreditValue),
    },
    scores: {
      naturalCapital: unwrap(facts.scores?.naturalCapital),
      carbon: unwrap(facts.scores?.carbon),
      biodiversity: unwrap(facts.scores?.biodiversity),
      water: unwrap(facts.scores?.water),
      soil: unwrap(facts.scores?.soil),
      pollination: unwrap(facts.scores?.pollination),
      regional: unwrap(facts.scores?.regional) || { carbon: 0, biodiversity: 0, water: 0, soil: 0, pollination: 0 },
    },
    maps: {
      satellite: unwrap(facts.maps?.satellite),
      overview: unwrap(facts.maps?.overview),
      regional: unwrap(facts.maps?.regional),
      detail: unwrap(facts.maps?.detail),
    },
    regional: {
      protectedAreas: unwrap(facts.regional?.protectedAreas) || [],
      percentiles: unwrap(facts.regional?.percentiles) || {},
    },
    trends: {
      tempPerDecade: unwrap(facts.trends?.tempPerDecade),
      precipPerDecade: unwrap(facts.trends?.precipPerDecade),
      fireProneByDecade: unwrap(facts.trends?.fireProneByDecade) || [],
      yearly: unwrap(facts.trends?.yearly) || [],
    },
    compliance: {
      items: unwrap(facts.compliance?.items) || [],
      timeline: unwrap(facts.compliance?.timeline) || [],
    },
    actions: {
      immediate: unwrap(facts.actions?.immediate) || [],
      shortTerm: unwrap(facts.actions?.shortTerm) || [],
      longTerm: unwrap(facts.actions?.longTerm) || [],
    },
    agriculture: {
      landCover: unwrap(facts.agriculture?.landCover),
      systems: unwrap(facts.agriculture?.systems) || [],
    },
    narratives: {}, // narratives come from the reports collection, not facts
    meta: {
      generatedAt: unwrap(facts.meta?.generatedAt),
      version: unwrap(facts.meta?.version),
      apiStatus: unwrap(facts.meta?.apiStatus) || {},
      missingFields: unwrap(facts.meta?.missingFields) || [],
    },
  };
}
