/**
 * Report Score Computation Engine
 * Pure functions that derive scores and valuations from raw API data.
 */

import { summarizeSpeciesCounts } from '../api/inaturalist.js';
import { extractNodes, extractWays } from '../api/overpass.js';
import { parseSoilProperties } from '../api/soilgrids.js';

// ---------------------------------------------------------------------------
// Natural Capital Dimension Scores (0-100 scale)
// ---------------------------------------------------------------------------

export function computeBioScore(speciesData) {
  if (!speciesData) return { score: 0, label: 'No data' };
  const summary = summarizeSpeciesCounts(speciesData);
  const total = summary.total;
  const score = total > 0 ? Math.min(100, Math.round(20 * Math.log10(total + 1))) : 0;
  return { score, total, groups: summary };
}

export function computeWaterScore(waterData, riskScores) {
  let score = 5;
  let features = 0;
  if (waterData) {
    const nodes = extractNodes(waterData);
    const ways = extractWays(waterData);
    features = ways.filter(w => w.tags && (w.tags.waterway || w.tags.natural === 'water')).length
      + nodes.filter(n => n.tags && (n.tags.natural === 'spring' || n.tags.man_made === 'water_well')).length;
    score = Math.min(10, 3 + features * 0.5);
  }
  if (riskScores) {
    const droughtPenalty = (riskScores.drought || 0) / 100 * 3;
    score = Math.max(1, score - droughtPenalty);
  }
  return { score: Math.round(score * 10) / 10, features };
}

export function computeSoilScore(soilData) {
  if (!soilData) return { score: 60, label: 'No data' };
  const props = parseSoilProperties(soilData);
  let score = 60;
  if (props) {
    const ph = parseFloat(props.ph);
    if (ph >= 5.5 && ph <= 7.5) score += 15;
    const oc = parseFloat(props.organicCarbon);
    if (oc > 20) score += 15;
    else if (oc > 10) score += 10;
  }
  return { score: Math.min(100, score), props };
}

export function computeCarbonScore(soilData) {
  if (!soilData) return { score: 50, stock: 0 };
  const props = parseSoilProperties(soilData);
  let score = 50;
  let stock = 0;
  if (props) {
    const oc = parseFloat(props.organicCarbon);
    if (oc > 30) score = 90;
    else if (oc > 20) score = 75;
    else if (oc > 10) score = 60;
    // Rough stock estimate: oc (g/kg) * bulk_density (kg/dm3) * depth (0.3m) * 3.67 / 1000
    const bd = parseFloat(props.bulkDensity) || 1.3;
    stock = Math.round(oc * bd * 0.3 * 3.67 / 1000 * 100) / 100; // tCO2e per m2
  }
  return { score, stock, props };
}

export function computeResilienceScore(riskScores) {
  if (!riskScores) return { score: 70 };
  const avgRisk = ((riskScores.fire || 0) + (riskScores.drought || 0) + (riskScores.flood || 0)) / 3;
  return { score: Math.round(100 - avgRisk) };
}

/**
 * Compute all 5 natural capital dimensions
 */
export function computeAllScores(apiResults, areaHa) {
  const bio = computeBioScore(apiResults.species?.ok ? apiResults.species.data : null);
  const water = computeWaterScore(
    apiResults.water?.ok ? apiResults.water.data : null,
    apiResults.riskScores?.ok ? apiResults.riskScores.data : null
  );
  const soil = computeSoilScore(apiResults.soilProps?.ok ? apiResults.soilProps.data : null);
  const carbon = computeCarbonScore(apiResults.soilProps?.ok ? apiResults.soilProps.data : null);
  const resilience = computeResilienceScore(apiResults.riskScores?.ok ? apiResults.riskScores.data : null);

  // Pollination: use Google Pollen API score if available, else derive from biodiversity
  const pollenData = apiResults.pollen?.ok ? apiResults.pollen.data : null;
  const pollinationScore = pollenData?.score != null
    ? pollenData.score
    : Math.max(0, Math.min(60, bio.score - 10)); // fallback: biodiversity proxy, capped at 60

  // Carbon stock for the whole property (tCO2e)
  const carbonStockTotal = Math.round(carbon.stock * areaHa * 10000); // stock is per m2

  // Overall natural capital score (weighted average, 0-10)
  const overallScore = Math.round(
    (bio.score * 0.2 + water.score * 10 * 0.2 + soil.score * 0.2 + carbon.score * 0.2 + resilience.score * 0.2)
  ) / 10;

  return {
    bio,
    water,
    soil,
    carbon,
    resilience,
    carbonStockTotal,
    overallScore: Math.round(overallScore * 10) / 10,
    dimensions: [
      { label: 'Carbon Storage', score: carbon.score, avg: 64, key: 'carbon' },
      { label: 'Biodiversity', score: bio.score, avg: 52, key: 'biodiversity' },
      { label: 'Water Regulation', score: Math.round(water.score * 10), avg: 68, key: 'water' },
      { label: 'Soil Health', score: soil.score, avg: 58, key: 'soil' },
      { label: 'Pollination', score: pollinationScore, avg: 45, key: 'pollination' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Ecosystem Services Valuation (UN SEEA-EA framework)
// Rates: de Groot et al. 2012, "Global estimates of the value of ecosystems
// and their services in monetary units", Ecosystem Services 1(1):50-61.
// Adjusted to 2024 EUR using Eurostat HICP.
// ---------------------------------------------------------------------------

// TEEB per-hectare annual rates (€/ha/yr) by CORINE land cover group
const TEEB_RATES = {
  // Forests (CORINE 311-313, 324)
  forest: { food: 120, waterProv: 50, carbon: 250, waterReg: 140, soil: 95, cultural: 280 },
  // Agroforestry / mixed (CORINE 244, 243)
  agroforestry: { food: 310, waterProv: 35, carbon: 180, waterReg: 90, soil: 70, cultural: 150 },
  // Grassland / shrub (CORINE 321-323, 231)
  grassland: { food: 85, waterProv: 25, carbon: 60, waterReg: 65, soil: 40, cultural: 120 },
  // Cropland (CORINE 211-213, 221-223, 241-242)
  cropland: { food: 420, waterProv: 15, carbon: 30, waterReg: 35, soil: 25, cultural: 60 },
  // Wetland / water (CORINE 411, 511, 512)
  wetland: { food: 40, waterProv: 120, carbon: 180, waterReg: 320, soil: 20, cultural: 350 },
  // Default Mediterranean fallback
  default: { food: 196, waterProv: 30, carbon: 120, waterReg: 48, soil: 44, cultural: 92 },
};

// Map CORINE codes to TEEB biome groups
function teebGroupFromCorine(code) {
  if (!code) return 'default';
  if ([311, 312, 313, 324].includes(code)) return 'forest';
  if ([244, 243].includes(code)) return 'agroforestry';
  if ([321, 322, 323, 231].includes(code)) return 'grassland';
  if ([211, 212, 213, 221, 222, 223, 241, 242].includes(code)) return 'cropland';
  if ([411, 511, 512].includes(code)) return 'wetland';
  return 'default';
}

export function computeEcosystemServices(areaHa, apiResults) {
  const climate = apiResults.climate?.ok ? apiResults.climate.data : null;
  const soilData = apiResults.soilProps?.ok ? apiResults.soilProps.data : null;
  const waterData = apiResults.water?.ok ? apiResults.water.data : null;
  const speciesData = apiResults.species?.ok ? apiResults.species.data : null;
  const landCover = apiResults.landCover?.ok ? apiResults.landCover.data : null;

  // Annual rainfall in mm (from 30yr climate averages)
  let annualRainfall = 600;
  if (climate?.monthly_precipitation) {
    annualRainfall = climate.monthly_precipitation.reduce((a, b) => a + b, 0);
  } else if (climate?.monthly) {
    annualRainfall = climate.monthly.reduce((sum, m) => sum + (m.precipitation || 0), 0);
  }

  // Water features count
  let waterFeatures = 0;
  if (waterData) {
    const nodes = extractNodes(waterData);
    const ways = extractWays(waterData);
    waterFeatures = ways.filter(w => w.tags && (w.tags.waterway || w.tags.natural === 'water')).length
      + nodes.filter(n => n.tags && (n.tags.natural === 'spring' || n.tags.man_made === 'water_well')).length;
  }

  // Soil organic carbon
  let organicCarbon = 15;
  if (soilData) {
    const props = parseSoilProperties(soilData);
    if (props) organicCarbon = parseFloat(props.organicCarbon) || 15;
  }

  // Species richness
  let speciesCount = 100;
  if (speciesData) {
    speciesCount = summarizeSpeciesCounts(speciesData).total;
  }

  // Look up TEEB rates by land cover type
  const lcCode = landCover?.code ?? null;
  const biomeGroup = teebGroupFromCorine(lcCode);
  const rates = TEEB_RATES[biomeGroup];

  // Calculate 6 ecosystem service categories using TEEB rates
  const services = [
    {
      name: 'Water Provisioning',
      value: Math.round(areaHa * rates.waterProv * (annualRainfall / 600)), // scale by rainfall vs Mediterranean baseline
      beneficiaries: 'Property, downstream users',
    },
    {
      name: 'Food & Fiber',
      value: Math.round(areaHa * rates.food),
      beneficiaries: 'Markets, processors',
    },
    {
      name: 'Carbon/Climate Regulation',
      value: Math.round(organicCarbon * areaHa * 0.3 * 3.67 / 1000 * 65), // SOC-based, EU ETS €65/tCO2 (Q1 2026)
      beneficiaries: 'Global climate',
    },
    {
      name: 'Water Regulation',
      value: Math.round(areaHa * rates.waterReg * (1 + waterFeatures * 0.15)),
      beneficiaries: 'Watershed, aquifer',
    },
    {
      name: 'Soil Protection',
      value: Math.round(areaHa * rates.soil),
      beneficiaries: 'Future productivity',
    },
    {
      name: 'Recreation/Cultural',
      value: Math.round(areaHa * rates.cultural * (1 + Math.min(speciesCount, 500) / 500 * 0.5)),
      beneficiaries: 'Visitors, future stewards',
    },
  ];

  const total = services.reduce((sum, s) => sum + s.value, 0);

  // 30-year NPV at 3.5% discount rate (HM Treasury Green Book social discount rate)
  const discountRate = 0.035;
  let npv = 0;
  for (let y = 1; y <= 30; y++) {
    npv += total / Math.pow(1 + discountRate, y);
  }
  npv = Math.round(npv / 1000) * 1000;

  return { services, total, npv, biomeGroup, waterFeatures, source: 'de Groot et al. 2012 (TEEB), adjusted 2024 EUR' };
}

// ---------------------------------------------------------------------------
// Natural Capital Premium Estimates (TEEB DE 2018 benefit transfer)
// Source: Naturkapital Deutschland — TEEB DE (2018), "The Value of Nature
// for Economy and Society", Helmholtz Centre for Environmental Research.
// Per-hectare values from German case studies, applied to property scale
// as benefit transfer under SEEA-EA.
// ---------------------------------------------------------------------------

const ANNUITY_FACTOR_30Y_3_5PCT = 18.392; // (1 - 1.035^-30) / 0.035

// Allocation of an intervention's per-hectare uplift across the 5 ES classes
// used in V&B + Future Scenarios (regulating, food, cultural, soil, water).
// Values per intervention sum to 1.0.
const TEEB_DE_INTERVENTIONS = [
  {
    id: 'grassland-conservation',
    name: 'Grassland Conservation',
    description: 'Avoid plough-up of HNV grassland; preserves soil carbon, water regulation, biodiversity.',
    sourcePage: 'TEEB DE 2018, p.42–43',
    annualPerHa: { low: 440, mid: 1720, high: 3000 },
    valueComposition: 'Climate action 700–2,240 + provisioning 370–600 + groundwater 40–120 + nature conservation 300–1,000 €/ha/yr',
    confidence: 'high',
    applicableBiomes: ['grassland'],
    analogueBiomes: {
      cropland: 'Applied to cropland as a converted-to-grassland uplift benchmark; underlying TEEB DE values are for avoided plough-up of existing High Nature Value grassland.',
    },
    affectsServices: { regulating: 0.50, food: 0.20, cultural: 0.10, soil: 0.15, water: 0.05 },
  },
  {
    id: 'multifunctional-forest',
    name: 'Multifunctional Forest Stewardship',
    description: 'Manage forest for non-timber public goods (biodiversity, recreation, carbon) alongside silviculture.',
    sourcePage: 'TEEB DE 2018, p.54 (forest case study, aggregate values)',
    annualPerHa: { low: 200, mid: 350, high: 500 },
    valueComposition: 'Aggregate German totals (carbon €267m + biodiversity ~€2.25bn + recreation €1.9bn) ÷ ~11.5m ha forest area',
    confidence: 'lower',
    applicableBiomes: ['forest', 'agroforestry'],
    analogueBiomes: {
      default: 'Land cover not directly classified by CORINE; multifunctional forest stewardship used as the most representative intervention for typical rural Portuguese property.',
      wetland: 'Wetland sites typically include riparian woodland; forest-stewardship values used as a non-flood-specific benchmark alongside any floodplain-restoration row.',
    },
    affectsServices: { regulating: 0.55, food: 0.05, cultural: 0.25, soil: 0.10, water: 0.05 },
  },
  {
    id: 'river-buffer-zones',
    name: 'River Bank Buffer Zones',
    description: 'Strict ban on farming and fertilisers along watercourses; nutrient retention, habitat, erosion control.',
    sourcePage: 'TEEB DE 2018, p.48 (Lower Saxony case study)',
    benefitCostRatio: 1.8,
    valueComposition: '20-yr NPV €767m benefit vs €894m agricultural cost; multifunctional BCR 1.8:1. Original study used 2% discount rate.',
    confidence: 'medium',
    requiresWaterFeatures: true,
    affectsServices: { regulating: 0.20, food: 0.05, cultural: 0.05, soil: 0.20, water: 0.50 },
  },
  {
    id: 'floodplain-restoration',
    name: 'Floodplain Restoration',
    description: 'Dike relocation and floodplain renaturation; flood defence + water quality + biodiversity.',
    sourcePage: 'TEEB DE 2018, p.37 (Elbe case study)',
    benefitCostRatio: 3.0,
    valueComposition: 'Multifunctional NPV ~€1.18bn vs ~€407m project costs; BCR 3:1.',
    confidence: 'medium',
    applicableBiomes: ['wetland'],
    affectsServices: { regulating: 0.25, food: 0.05, cultural: 0.15, soil: 0.05, water: 0.50 },
  },
];

const CONFIDENCE_DOWNGRADE = { high: 'medium', medium: 'lower', lower: 'lower' };

/**
 * Build TEEB-DE-aligned natural-capital premium estimates for the property.
 *
 * Each premium represents an annual €/ha uplift from a specific intervention,
 * sourced from TEEB DE 2018 case studies. Values are applied to property area
 * as benefit transfer (SEEA-EA convention) and converted to 30-year NPV using
 * the HM Treasury Green Book 3.5% social discount rate.
 *
 * Match types:
 *   - direct:   intervention's own applicableBiomes covers this property
 *   - analogue: intervention listed under analogueBiomes for this biome —
 *               confidence is downgraded one notch and the row carries an
 *               analogue note explaining the benchmark application.
 *
 * Every property gets at least one row: every biomeGroup the pipeline can
 * emit (forest, agroforestry, grassland, cropland, wetland, default) is
 * covered by either a direct or analogue match.
 */
export function computeNaturalCapitalPremiums(areaHa, biomeGroup, waterFeatures) {
  const matched = [];
  for (const it of TEEB_DE_INTERVENTIONS) {
    if (it.requiresWaterFeatures && !(waterFeatures > 0)) continue;

    let matchType = null;
    let analogueNote = null;

    if (it.applicableBiomes && it.applicableBiomes.includes(biomeGroup)) {
      matchType = 'direct';
    } else if (it.analogueBiomes && Object.prototype.hasOwnProperty.call(it.analogueBiomes, biomeGroup)) {
      matchType = 'analogue';
      analogueNote = it.analogueBiomes[biomeGroup];
    } else if (!it.applicableBiomes) {
      matchType = 'direct';
    } else {
      continue;
    }

    matched.push({ it, matchType, analogueNote });
  }

  return matched.map(({ it, matchType, analogueNote }) => {
    const confidence = matchType === 'analogue' ? CONFIDENCE_DOWNGRADE[it.confidence] : it.confidence;
    const valueComposition = matchType === 'analogue' && analogueNote
      ? `${it.valueComposition} — Analogue note: ${analogueNote}`
      : it.valueComposition;

    const row = {
      id: it.id,
      name: it.name,
      description: it.description,
      source: it.sourcePage,
      valueComposition,
      confidence,
      matchType,
      // Propagate the per-class allocation so downstream (implicit scenarios)
      // can distribute the uplift across the 5 ES classes.
      affectsServices: it.affectsServices || null,
    };

    if (it.annualPerHa) {
      row.basis = 'per-hectare';
      row.annualPerHa = it.annualPerHa;
      row.annualLow = Math.round(areaHa * it.annualPerHa.low);
      row.annualMid = Math.round(areaHa * it.annualPerHa.mid);
      row.annualHigh = Math.round(areaHa * it.annualPerHa.high);
      row.thirtyYearNpvLow = Math.round(row.annualLow * ANNUITY_FACTOR_30Y_3_5PCT);
      row.thirtyYearNpvMid = Math.round(row.annualMid * ANNUITY_FACTOR_30Y_3_5PCT);
      row.thirtyYearNpvHigh = Math.round(row.annualHigh * ANNUITY_FACTOR_30Y_3_5PCT);
    } else if (it.benefitCostRatio) {
      row.basis = 'benefit-cost-ratio';
      row.benefitCostRatio = it.benefitCostRatio;
      row.annualLow = null;
      row.annualMid = null;
      row.annualHigh = null;
      row.thirtyYearNpvLow = null;
      row.thirtyYearNpvMid = null;
      row.thirtyYearNpvHigh = null;
    }
    return row;
  });
}

export const PREMIUM_METHODOLOGY = {
  source: 'Naturkapital Deutschland — TEEB DE (2018): The Value of Nature for Economy and Society. Helmholtz Centre for Environmental Research — UFZ, Leipzig.',
  benefitTransferNote: 'Per-hectare values from German case studies are applied to Mediterranean Portugal as benefit transfer (SEEA-EA convention). Results are indicative; site-specific valuation would refine them.',
  discountRate: 0.035,
  discountSource: 'HM Treasury Green Book social discount rate',
  horizonYears: 30,
  annuityFactor: ANNUITY_FACTOR_30Y_3_5PCT,
  formula: '30-yr NPV uplift = annual €/ha × eligible ha × annuity factor; annuity factor = Σ (1.035)⁻ᵗ for t=1..30 ≈ 18.39',
};

// ---------------------------------------------------------------------------
// Intervention sensitivity per ES class — used to label which services are
// dynamic vs. static across stewardship scenarios. Water tier flips to "Low"
// when the property is already at its water-security ceiling.
// ---------------------------------------------------------------------------

const ES_SENSITIVITY_BASE = {
  regulating: { tier: 'High', note: 'Stewardship grows biomass and soil carbon' },
  food:       { tier: 'High', note: 'Improved systems lift productivity' },
  cultural:   { tier: 'Low',  note: 'Stable across scenarios' },
  soil:       { tier: 'Medium', note: 'Responds to land management' },
  water:      { tier: 'Medium', note: 'Responds to buffer planting and infiltration work' },
};

/**
 * Per-ES-class sensitivity label. Water flips to "Low — already at site
 * maximum (Water Security X/10)" when the security index is at the ceiling.
 *
 * @param {string} esClass - one of regulating/food/cultural/soil/water
 * @param {number|null} waterSecurity10 - water security index 0-10
 * @returns {{ tier: string, note: string }}
 */
export function computeServiceSensitivity(esClass, waterSecurity10) {
  const base = ES_SENSITIVITY_BASE[esClass];
  if (!base) return { tier: 'Unknown', note: '' };
  if (esClass === 'water' && waterSecurity10 != null && waterSecurity10 >= 9) {
    return {
      tier: 'Low',
      note: `Already at site maximum (Water Security ${waterSecurity10.toFixed(1)}/10)`,
    };
  }
  return { ...base };
}

// ---------------------------------------------------------------------------
// Implicit-layer scenarios — show how the €/yr ecosystem-services baseline
// shifts under stewardship. BAU = baseline; Conservative applies all matched
// per-hectare interventions at low tier, scaled down (passive stewardship);
// Moderate applies all matched interventions at mid tier; Optimized applies
// all matched interventions at high tier. Component values distribute each
// intervention's uplift across 5 ES classes via its affectsServices allocation.
//
// Confidence is reflected in scenario risk labels, not by excluding analogue
// or lower-confidence interventions — a property whose only viable
// intervention is an analogue match still has that stewardship lever
// available, and gating it out leaves Moderate/Optimized identical to BAU.
// ---------------------------------------------------------------------------

const SCENARIO_INTENSITY = {
  conservative: { tierKey: 'low',  fraction: 0.30 },
  moderate:     { tierKey: 'mid',  fraction: 1.00 },
  optimized:    { tierKey: 'high', fraction: 1.00 },
};

const ES_CLASSES = ['regulating', 'food', 'cultural', 'soil', 'water'];

// Default allocation used when an intervention's affectsServices is missing —
// keeps the pipeline producing meaningful uplifts even if a definition isn't
// yet tagged. Weighted toward regulating to match the typical SEEA-EA story.
const DEFAULT_ALLOCATION = { regulating: 0.55, food: 0.15, cultural: 0.10, soil: 0.15, water: 0.05 };

/**
 * Build the implicit-layer scenarios used by Value & Benefits' Long Term Value
 * table and by Future Scenarios' total-stack composition.
 *
 * @param {number} areaHa
 * @param {Object} svcKeyed - keyed ecosystem services with totals per class
 * @param {Array} interventions - TEEB DE interventions matched to this property (output of computeNaturalCapitalPremiums)
 * @returns {Array<{
 *   key: string,
 *   name: string,
 *   total: number,
 *   components: { regulating: number, food: number, cultural: number, soil: number, water: number },
 *   upliftVsBaseline: number,
 * }>}
 */
export function computeImplicitScenarios(areaHa, svcKeyed, interventions) {
  // Baseline 5-class breakdown (matches the V&B donut: regulating folds in carbon).
  const baseline = {
    regulating: (svcKeyed.regulation ?? 0) + (svcKeyed.carbon ?? 0),
    food: svcKeyed.food ?? 0,
    cultural: svcKeyed.cultural ?? 0,
    soil: svcKeyed.soil ?? 0,
    water: svcKeyed.water ?? 0,
  };
  const baselineTotal = ES_CLASSES.reduce((sum, k) => sum + baseline[k], 0);

  // Per-hectare interventions only contribute annual uplift; BCR-only ones
  // are excluded from scenario annuals.
  const quantitative = (interventions || []).filter(
    (it) => it.basis === 'per-hectare' && it.annualPerHa,
  );

  const buildScenario = (key, name) => {
    if (key === 'bau') {
      return {
        key,
        name,
        total: baselineTotal,
        components: { ...baseline },
        upliftVsBaseline: 0,
      };
    }
    const cfg = SCENARIO_INTENSITY[key];
    const components = { ...baseline };
    for (const it of quantitative) {
      const ratePerHa = it.annualPerHa[cfg.tierKey] ?? 0;
      const upliftTotal = ratePerHa * areaHa * cfg.fraction;
      const alloc = it.affectsServices || DEFAULT_ALLOCATION;
      for (const esClass of ES_CLASSES) {
        components[esClass] += upliftTotal * (alloc[esClass] ?? 0);
      }
    }
    // Round to whole € for display stability
    for (const esClass of ES_CLASSES) {
      components[esClass] = Math.round(components[esClass]);
    }
    const total = ES_CLASSES.reduce((sum, k) => sum + components[k], 0);
    return {
      key,
      name,
      total,
      components,
      upliftVsBaseline: total - baselineTotal,
    };
  };

  return [
    buildScenario('bau', 'Business as Usual'),
    buildScenario('conservative', 'Conservative'),
    buildScenario('moderate', 'Moderate'),
    buildScenario('optimized', 'Optimized'),
  ];
}

// ---------------------------------------------------------------------------
// Revenue layer split — divide each scenario's active annual revenue into
// realized (agricultural production) and monetizable (carbon credits + premium
// markets). Monetization share grows with scenario aggressiveness; BAU has
// no monetization, Optimized has the largest share.
// ---------------------------------------------------------------------------

const MONETIZATION_SHARE = {
  bau: 0.00,
  conservative: 0.18,
  moderate: 0.45,
  optimized: 0.55,
};

/**
 * Build the realized/monetizable split for each scenario.
 *
 * BAU annual is derived as half of Conservative (the same convention used
 * elsewhere in the report). Monetizable share is split between carbon and
 * premium-market components for transparency.
 *
 * @param {number|null} cons - Conservative annual €
 * @param {number|null} mod - Moderate annual €
 * @param {number|null} opt - Optimized annual €
 * @returns {Array<{
 *   key: string,
 *   name: string,
 *   active: number,
 *   realized: number,
 *   monetizable: number,
 *   monetizableShare: number,
 * }>}
 */
export function computeRevenueLayers(cons, mod, opt) {
  const safe = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  const bau = Math.round(safe(cons) * 0.5);

  const build = (key, name, active) => {
    const share = MONETIZATION_SHARE[key] ?? 0;
    const monetizable = Math.round(active * share);
    return {
      key,
      name,
      active,
      realized: active - monetizable,
      monetizable,
      monetizableShare: share,
    };
  };

  return [
    build('bau', 'Business as Usual', bau),
    build('conservative', 'Conservative', safe(cons)),
    build('moderate', 'Moderate', safe(mod)),
    build('optimized', 'Optimized', safe(opt)),
  ];
}

// ---------------------------------------------------------------------------
// Layered NPV — 30-year NPV for each of realized / monetizable / implicit
// per scenario, plus the total stack and uplift vs BAU.
// ---------------------------------------------------------------------------

/**
 * @param {Array} revenueLayers - output of computeRevenueLayers
 * @param {Array} implicitScenarios - output of computeImplicitScenarios
 * @returns {Array<{
 *   key: string,
 *   name: string,
 *   realizedNpv: number,
 *   monetizableNpv: number,
 *   implicitNpv: number,
 *   totalNpv: number,
 *   upliftVsBau: number,
 * }>}
 */
export function computeLayerNpv(revenueLayers, implicitScenarios) {
  const af = ANNUITY_FACTOR_30Y_3_5PCT;
  const byKey = (arr, key) => arr.find((s) => s.key === key);

  const rows = revenueLayers.map((rev) => {
    const imp = byKey(implicitScenarios, rev.key) || { total: 0 };
    const realizedNpv = Math.round(rev.realized * af);
    const monetizableNpv = Math.round(rev.monetizable * af);
    const implicitNpv = Math.round(imp.total * af);
    const totalNpv = realizedNpv + monetizableNpv + implicitNpv;
    return {
      key: rev.key,
      name: rev.name,
      realizedNpv,
      monetizableNpv,
      implicitNpv,
      totalNpv,
      upliftVsBau: 0, // filled below
    };
  });

  const bauNpv = rows.find((r) => r.key === 'bau')?.totalNpv ?? 0;
  for (const row of rows) {
    row.upliftVsBau = row.totalNpv - bauNpv;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Revenue Scenarios — keyed by agriculture system type
// Sources: Portuguese agricultural statistics (INE), CAP payment rates,
// cork market reports (APCOR), olive oil benchmarks (COI).
// ---------------------------------------------------------------------------

const REVENUE_BY_SYSTEM = {
  'Cork Oak':         { conservative: 180, moderate: 350, optimized: 580, investMod: [800, 1400], investOpt: [2500, 4000] },
  'Olive Groves':     { conservative: 220, moderate: 420, optimized: 650, investMod: [1000, 1800], investOpt: [3000, 5000] },
  'Vineyards':        { conservative: 300, moderate: 550, optimized: 900, investMod: [2000, 3500], investOpt: [5000, 8000] },
  'Pastures':         { conservative: 80,  moderate: 160, optimized: 280, investMod: [400, 700],   investOpt: [1200, 2000] },
  'Agroforestry':     { conservative: 160, moderate: 310, optimized: 520, investMod: [700, 1200],  investOpt: [2000, 3500] },
  'Mixed Cultivation':{ conservative: 140, moderate: 260, optimized: 420, investMod: [600, 1000],  investOpt: [1800, 3000] },
  'Fruit & Berry':    { conservative: 250, moderate: 480, optimized: 750, investMod: [1500, 2500], investOpt: [4000, 6000] },
  // Default fallback (Mediterranean average)
  '_default':         { conservative: 144, moderate: 268, optimized: 440, investMod: [600, 1000],  investOpt: [2000, 3200] },
};

export function computeRevenueScenarios(areaHa, systems) {
  // Weighted average across detected agriculture systems, or fallback
  const systemNames = (systems || []).map(s => s.name || s.system || '').filter(Boolean);
  const matched = systemNames.map(name => {
    // Find closest match in lookup table
    for (const key of Object.keys(REVENUE_BY_SYSTEM)) {
      if (key === '_default') continue;
      if (name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())) {
        return REVENUE_BY_SYSTEM[key];
      }
    }
    return null;
  }).filter(Boolean);

  // Average across matched systems, or use default
  const rates = matched.length > 0
    ? {
        conservative: Math.round(matched.reduce((s, r) => s + r.conservative, 0) / matched.length),
        moderate: Math.round(matched.reduce((s, r) => s + r.moderate, 0) / matched.length),
        optimized: Math.round(matched.reduce((s, r) => s + r.optimized, 0) / matched.length),
        investMod: matched[0].investMod,
        investOpt: matched[0].investOpt,
      }
    : REVENUE_BY_SYSTEM._default;

  const systemDesc = systemNames.length > 0 ? systemNames.join(', ') : 'General land management';

  return [
    {
      scenario: 'Conservative',
      systems: systemDesc,
      annual: Math.round(areaHa * rates.conservative),
      investment: 'Minimal',
    },
    {
      scenario: 'Moderate',
      systems: `${systemDesc} (improved)`,
      annual: Math.round(areaHa * rates.moderate),
      investment: `€${Math.round(areaHa * rates.investMod[0]).toLocaleString()}-${Math.round(areaHa * rates.investMod[1]).toLocaleString()}`,
    },
    {
      scenario: 'Optimized',
      systems: `${systemDesc} (all optimized)`,
      annual: Math.round(areaHa * rates.optimized),
      investment: `€${Math.round(areaHa * rates.investOpt[0]).toLocaleString()}-${Math.round(areaHa * rates.investOpt[1]).toLocaleString()}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Risk Profile
// ---------------------------------------------------------------------------

export function computeRiskProfile(apiResults) {
  const riskData = apiResults.riskScores?.ok ? apiResults.riskScores.data : null;
  const fireData = apiResults.activeFires?.ok ? apiResults.activeFires.data : [];

  const mapScore = (raw) => {
    if (raw == null) return { score: '-', level: 'Unknown', badge: 'badge-warning' };
    const s = Math.round(raw / 20); // 0-100 → 0-5
    if (s <= 1) return { score: `${s}/5`, level: 'Very Low', badge: 'badge-success' };
    if (s <= 2) return { score: `${s}/5`, level: 'Low', badge: 'badge-success' };
    if (s <= 3) return { score: `${s}/5`, level: 'Moderate', badge: 'badge-warning' };
    if (s <= 4) return { score: `${s}/5`, level: 'High', badge: 'badge-danger' };
    return { score: `${s}/5`, level: 'Critical', badge: 'badge-danger' };
  };

  return {
    fire: {
      ...mapScore(riskData?.fire),
      mitigation: 'Firebreaks, vegetation management',
      priority: riskData?.fire > 40 ? 'High' : 'Medium',
    },
    flood: {
      ...mapScore(riskData?.flood),
      mitigation: 'Maintain drainage',
      priority: riskData?.flood > 40 ? 'Medium' : 'Low',
    },
    drought: {
      ...mapScore(riskData?.drought),
      mitigation: 'Water efficiency, storage',
      priority: riskData?.drought > 40 ? 'Medium' : 'Low',
    },
    activeFires: fireData.length,
  };
}
