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
// ---------------------------------------------------------------------------

export function computeEcosystemServices(areaHa, apiResults) {
  const climate = apiResults.climate?.ok ? apiResults.climate.data : null;
  const soilData = apiResults.soilProps?.ok ? apiResults.soilProps.data : null;
  const waterData = apiResults.water?.ok ? apiResults.water.data : null;
  const speciesData = apiResults.species?.ok ? apiResults.species.data : null;

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

  // Calculate 6 ecosystem service categories
  const services = [
    {
      name: 'Water Provisioning',
      value: Math.round(annualRainfall * areaHa * 0.3 * 0.7), // rainfall * area * runoff coeff * value/m3
      beneficiaries: 'Property, downstream users',
    },
    {
      name: 'Food & Fiber',
      value: Math.round(areaHa * 196), // average Mediterranean agroforestry
      beneficiaries: 'Markets, processors',
    },
    {
      name: 'Carbon/Climate Regulation',
      value: Math.round(organicCarbon * areaHa * 0.3 * 3.67 / 1000 * 65), // SOC * area * depth * conversion * EU ETS €65/tCO2 (Q1 2026)
      beneficiaries: 'Global climate',
    },
    {
      name: 'Water Regulation',
      value: Math.round(areaHa * 48 * (1 + waterFeatures * 0.15)),
      beneficiaries: 'Watershed, aquifer',
    },
    {
      name: 'Soil Protection',
      value: Math.round(areaHa * 44),
      beneficiaries: 'Future productivity',
    },
    {
      name: 'Recreation/Cultural',
      value: Math.round(areaHa * 92 * (1 + Math.min(speciesCount, 500) / 500 * 0.5)),
      beneficiaries: 'Visitors, future stewards',
    },
  ];

  const total = services.reduce((sum, s) => sum + s.value, 0);

  // 30-year NPV at 3% discount rate
  const discountRate = 0.03;
  let npv = 0;
  for (let y = 1; y <= 30; y++) {
    npv += total / Math.pow(1 + discountRate, y);
  }
  npv = Math.round(npv / 1000) * 1000;

  return { services, total, npv };
}

// ---------------------------------------------------------------------------
// Revenue Scenarios
// ---------------------------------------------------------------------------

export function computeRevenueScenarios(areaHa) {
  return [
    {
      scenario: 'Conservative',
      systems: 'Basic land management',
      annual: Math.round(areaHa * 144),
      investment: 'Minimal',
    },
    {
      scenario: 'Moderate',
      systems: '+ Improved management',
      annual: Math.round(areaHa * 268),
      investment: `€${Math.round(areaHa * 600).toLocaleString()}-${Math.round(areaHa * 1000).toLocaleString()}`,
    },
    {
      scenario: 'Optimized',
      systems: 'All systems active',
      annual: Math.round(areaHa * 440),
      investment: `€${Math.round(areaHa * 2000).toLocaleString()}-${Math.round(areaHa * 3200).toLocaleString()}`,
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
