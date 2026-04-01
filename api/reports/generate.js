import { getCollection } from '../_db.js';

// ── Fetch helpers (server-side, no browser APIs) ─────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// ── API Calls ────────────────────────────────────────────

async function getElevation(lat, lng) {
  const data = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
  return data?.elevation?.[0] ?? null;
}

async function getForecast(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode,uv_index_max&forecast_days=7&timezone=auto`;
  return fetchJSON(url);
}

async function getClimateAverages(lat, lng) {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 29;
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const start = `${startYear}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(endYear, m, 0).getDate();
    const end = `${endYear}-${String(m).padStart(2,'0')}-${lastDay}`;
    months.push({ m, start, end });
  }
  // Fetch one year of historical data to approximate monthly averages
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${endYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const data = await fetchJSON(url);
  if (!data?.daily) return null;
  const result = [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let m = 0; m < 12; m++) {
    const indices = data.daily.time.map((t, i) => new Date(t).getMonth() === m ? i : -1).filter(i => i >= 0);
    if (indices.length === 0) { result.push({ month: monthNames[m], avgHigh: 0, avgLow: 0, totalPrecip: 0 }); continue; }
    const avgHigh = indices.reduce((s, i) => s + (data.daily.temperature_2m_max[i] || 0), 0) / indices.length;
    const avgLow = indices.reduce((s, i) => s + (data.daily.temperature_2m_min[i] || 0), 0) / indices.length;
    const totalPrecip = indices.reduce((s, i) => s + (data.daily.precipitation_sum[i] || 0), 0);
    result.push({ month: monthNames[m], avgHigh: Math.round(avgHigh * 10) / 10, avgLow: Math.round(avgLow * 10) / 10, totalPrecip: Math.round(totalPrecip) });
  }
  return result;
}

async function getSoilData(lat, lng) {
  const propsUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&property=clay&property=sand&property=silt&property=phh2o&property=ocd&property=nitrogen&property=cec&property=bdod&depth=0-5cm&depth=5-15cm&depth=15-30cm&depth=30-60cm&value=mean`;
  const classUrl = `https://rest.isric.org/soilgrids/v2.0/classification/query?lon=${lng}&lat=${lat}&number_classes=3`;
  const [props, classification] = await Promise.all([fetchJSON(propsUrl), fetchJSON(classUrl)]);
  return { properties: props, classification };
}

async function getGeology(lat, lng) {
  return fetchJSON(`https://macrostrat.org/api/v2/geologic_units/what?lat=${lat}&lng=${lng}&response=long`);
}

async function getSpeciesCounts(lat, lng) {
  return fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=15&per_page=200&locale=en`);
}

async function getThreatenedSpecies(lat, lng) {
  return fetchJSON(`https://api.inaturalist.org/v1/observations/species_counts?lat=${lat}&lng=${lng}&radius=25&threatened=true&per_page=50&locale=en`);
}

async function getGBIF(lat, lng) {
  return fetchJSON(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=${lat - 0.15},${lat + 0.15}&decimalLongitude=${lng - 0.15},${lng + 0.15}&limit=0&facet=kingdomKey&facetLimit=10`);
}

async function getFloodData(lat, lng) {
  return fetchJSON(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lng}&daily=river_discharge&forecast_days=30`);
}

async function getRiskScores(lat, lng) {
  // Simplified risk calculation using current weather
  const forecast = await getForecast(lat, lng);
  if (!forecast?.daily) return { fire: 30, drought: 30, flood: 20 };
  const tempMax = Math.max(...(forecast.daily.temperature_2m_max || [20]));
  const totalPrecip = (forecast.daily.precipitation_sum || []).reduce((a, b) => a + b, 0);
  const windMax = Math.max(...(forecast.daily.wind_speed_10m_max || [10]));
  const month = new Date().getMonth();

  let fire = 0;
  if (tempMax > 35) fire += 30; else if (tempMax > 30) fire += 20; else if (tempMax > 25) fire += 10;
  if (totalPrecip < 5) fire += 25; else if (totalPrecip < 15) fire += 15;
  if (windMax > 40) fire += 20; else if (windMax > 25) fire += 10;
  if (month >= 5 && month <= 8) fire += 15;
  fire = Math.min(fire, 100);

  let drought = 0;
  const expectedMonthly = [80,70,55,40,25,8,2,3,20,60,80,90];
  const weeklyExpected = expectedMonthly[month] / 4;
  if (totalPrecip < weeklyExpected * 0.2) drought = 70;
  else if (totalPrecip < weeklyExpected * 0.5) drought = 50;
  else if (totalPrecip < weeklyExpected) drought = 30;
  else drought = 15;

  let flood = 0;
  if (totalPrecip > 100) flood = 70;
  else if (totalPrecip > 50) flood = 40;
  else if (totalPrecip > 25) flood = 20;
  else flood = 10;

  return { fire, drought, flood };
}

async function getProtectedAreas(lat, lng) {
  const query = `[out:json][timeout:15];(node["boundary"="protected_area"](around:25000,${lat},${lng});way["boundary"="protected_area"](around:25000,${lat},${lng});relation["boundary"="protected_area"](around:25000,${lat},${lng});node["leisure"="nature_reserve"](around:25000,${lat},${lng});way["leisure"="nature_reserve"](around:25000,${lat},${lng}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getWaterFeatures(lat, lng) {
  const d = 0.02;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const query = `[out:json][timeout:15];(node["natural"="spring"](${bbox});node["natural"="water"](${bbox});way["natural"="water"](${bbox});node["man_made"="water_well"](${bbox});way["waterway"](${bbox}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getInfrastructure(lat, lng) {
  const d = 0.05;
  const bbox = `${lat - d},${lng - d},${lat + d},${lng + d}`;
  const query = `[out:json][timeout:15];(node["amenity"~"school|hospital|pharmacy|post_office|bank"](${bbox});node["shop"](${bbox});node["tourism"](${bbox}););out tags;`;
  const data = await fetchJSON(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  return data?.elements || [];
}

async function getAdminUnit(lat, lng) {
  try {
    const d = 0.001;
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const url = `https://ogcapi.dgterritorio.gov.pt/collections/Freguesias/items?bbox=${bbox}&limit=1&f=json`;
    const data = await fetchJSON(url);
    if (data?.features?.[0]) {
      const p = data.features[0].properties;
      return { parish: p.Freguesia || null, municipality: p.Municipio || null, district: p.Distrito || null };
    }
  } catch {}
  return null;
}

async function getNearestForecastLocation(lat, lng) {
  try {
    const data = await fetchJSON('https://api.ipma.pt/open-data/distrits-islands.json');
    if (!data?.data) return null;
    let nearest = null, minDist = Infinity;
    for (const loc of data.data) {
      const d = Math.sqrt(Math.pow(loc.latitude - lat, 2) + Math.pow(loc.longitude - lng, 2));
      if (d < minDist) { minDist = d; nearest = loc; }
    }
    return nearest;
  } catch { return null; }
}

async function getIPMAForecast(globalIdLocal) {
  if (!globalIdLocal) return null;
  return fetchJSON(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${globalIdLocal}.json`);
}

// ── Score helpers ────────────────────────────────────────
function scoreLabel(score) {
  if (score >= 80) return 'Extreme';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}
function riskLevel(score) {
  if (score >= 60) return { level: 'High', cls: 'high', out5: Math.round(score / 20) };
  if (score >= 30) return { level: 'Moderate', cls: 'moderate', out5: Math.round(score / 20) };
  return { level: 'Low', cls: 'low', out5: Math.round(score / 20) };
}

// ── Summarize iNaturalist species ────────────────────────
function summarizeSpecies(data) {
  if (!data?.results) return { total: 0, groups: {}, topSpecies: [] };
  const groups = {};
  const ICONIC_MAP = {
    Plantae: 'Flora', Aves: 'Birds', Mammalia: 'Mammals',
    Insecta: 'Insects', Reptilia: 'Reptiles', Amphibia: 'Amphibians',
    Fungi: 'Fungi', Actinopterygii: 'Fish', Arachnida: 'Arachnids', Mollusca: 'Molluscs',
  };
  for (const r of data.results) {
    const taxon = r.taxon || {};
    const iconic = taxon.iconic_taxon_name || 'Other';
    const group = ICONIC_MAP[iconic] || iconic;
    groups[group] = (groups[group] || 0) + 1;
  }
  const topSpecies = data.results.slice(0, 10).map(r => ({
    name: r.taxon?.preferred_common_name || r.taxon?.name || 'Unknown',
    scientificName: r.taxon?.name || '',
    group: ICONIC_MAP[r.taxon?.iconic_taxon_name] || r.taxon?.iconic_taxon_name || 'Other',
    count: r.count || 0,
    threatened: !!r.taxon?.conservation_status,
    photoUrl: r.taxon?.default_photo?.square_url || null,
  }));
  return { total: data.total_results || 0, groups, topSpecies };
}

// ── Parse soil ───────────────────────────────────────────
function parseSoil(data) {
  if (!data?.properties?.properties?.layers) return null;
  const result = {};
  for (const layer of data.properties.properties.layers) {
    const val = layer.depths?.[0]?.values?.mean;
    if (val == null) continue;
    const name = layer.name;
    const unit = layer.unit_measure?.mapped_units || '';
    if (name === 'clay') result.clay = (val / 10).toFixed(1);
    if (name === 'sand') result.sand = (val / 10).toFixed(1);
    if (name === 'silt') result.silt = (val / 10).toFixed(1);
    if (name === 'phh2o') result.ph = (val / 10).toFixed(1);
    if (name === 'ocd') result.organicCarbon = (val / 10).toFixed(1);
    if (name === 'nitrogen') result.nitrogen = (val / 100).toFixed(2);
    if (name === 'cec') result.cec = (val / 10).toFixed(1);
    if (name === 'bdod') result.bulkDensity = (val / 100).toFixed(2);
  }
  const cls = data.classification;
  result.classification = cls?.wrb_class_name || null;
  result.classificationProb = cls?.wrb_class_probability || null;
  return result;
}

// ── Parse geology ────────────────────────────────────────
function parseGeology(data) {
  if (!data?.success?.data?.length) return null;
  return data.success.data.map(u => ({
    name: u.strat_name_long || u.unit_name || 'Unknown',
    lithology: (u.lith || []).map(l => l.name || l.lith).join(', ') || 'Unknown',
    environment: (u.environ || []).map(e => e.name || e.environ).join(', ') || 'Unknown',
    period: u.t_int_name || 'Unknown',
    ageMa: u.b_int_age ? `${u.t_int_age}–${u.b_int_age} Ma` : null,
  }));
}

// ── Main handler ─────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const submissionId = body.submission_id;

    // Get submission
    const submissions = await getCollection('submissions');
    const sub = submissionId
      ? await submissions.findOne({ id: submissionId })
      : await submissions.find({}).sort({ created: -1 }).limit(1).toArray().then(a => a[0]);

    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    const lat = sub.center?.[0] || sub.center?.lat;
    const lng = sub.center?.[1] || sub.center?.lng;
    if (!lat || !lng) return res.status(400).json({ error: 'No coordinates in submission' });

    const areaHa = sub.area ? (sub.area / 10000) : 0;

    // ── Fetch all data in parallel ───────────────────────
    const [
      elevation,
      forecast,
      climate,
      soilRaw,
      geology,
      speciesCounts,
      threatened,
      gbif,
      floodData,
      risks,
      protectedAreas,
      waterFeatures,
      infrastructure,
      adminUnit,
      ipmaLocation,
    ] = await Promise.all([
      getElevation(lat, lng).catch(() => null),
      getForecast(lat, lng).catch(() => null),
      getClimateAverages(lat, lng).catch(() => null),
      getSoilData(lat, lng).catch(() => ({ properties: null, classification: null })),
      getGeology(lat, lng).catch(() => null),
      getSpeciesCounts(lat, lng).catch(() => null),
      getThreatenedSpecies(lat, lng).catch(() => null),
      getGBIF(lat, lng).catch(() => null),
      getFloodData(lat, lng).catch(() => null),
      getRiskScores(lat, lng).catch(() => ({ fire: 0, drought: 0, flood: 0 })),
      getProtectedAreas(lat, lng).catch(() => []),
      getWaterFeatures(lat, lng).catch(() => []),
      getInfrastructure(lat, lng).catch(() => []),
      getAdminUnit(lat, lng).catch(() => null),
      getNearestForecastLocation(lat, lng).catch(() => null),
    ]);

    // IPMA forecast (needs location ID from previous call)
    const ipmaForecast = ipmaLocation?.globalIdLocal
      ? await getIPMAForecast(ipmaLocation.globalIdLocal).catch(() => null)
      : null;

    // ── Process data ─────────────────────────────────────
    const soil = parseSoil(soilRaw);
    const geo = parseGeology(geology);
    const species = summarizeSpecies(speciesCounts);
    const threatenedSummary = summarizeSpecies(threatened);

    // Flood analysis
    let floodAnalysis = { level: 'Unknown', current: null, max: null };
    if (floodData?.daily?.river_discharge) {
      const discharge = floodData.daily.river_discharge.filter(v => v != null);
      if (discharge.length > 0) {
        const avg = discharge.reduce((a, b) => a + b, 0) / discharge.length;
        const max = Math.max(...discharge);
        const current = discharge[discharge.length - 1];
        floodAnalysis = {
          level: max > avg * 3 ? 'High' : max > avg * 1.5 ? 'Moderate' : 'Low',
          current: current?.toFixed(1),
          average: avg.toFixed(1),
          max: max.toFixed(1),
        };
      }
    }

    // Climate summary
    const annualRainfall = climate ? climate.reduce((s, m) => s + m.totalPrecip, 0) : null;
    const annualMeanTemp = climate ? (climate.reduce((s, m) => s + (m.avgHigh + m.avgLow) / 2, 0) / 12).toFixed(1) : null;
    const summerMean = climate ? ((climate[5].avgHigh + climate[5].avgLow + climate[6].avgHigh + climate[6].avgLow + climate[7].avgHigh + climate[7].avgLow) / 6).toFixed(1) : null;
    const winterMean = climate ? ((climate[11].avgHigh + climate[11].avgLow + climate[0].avgHigh + climate[0].avgLow + climate[1].avgHigh + climate[1].avgLow) / 6).toFixed(1) : null;

    // Frost estimate
    let frostDays = null;
    if (climate) {
      const coldMonths = climate.filter(m => m.avgLow < 2);
      frostDays = coldMonths.length > 0 ? `${coldMonths.length * 3}–${coldMonths.length * 8}` : '0–2';
    }

    // Growing season estimate
    let growingSeason = null;
    if (climate) {
      const growingMonths = climate.filter(m => (m.avgHigh + m.avgLow) / 2 >= 10);
      growingSeason = growingMonths.length * 30;
    }

    // Water features count
    const springs = waterFeatures.filter(e => e.tags?.natural === 'spring').length;
    const wells = waterFeatures.filter(e => e.tags?.man_made === 'water_well').length;
    const waterways = waterFeatures.filter(e => e.tags?.waterway).length;
    const waterBodies = waterFeatures.filter(e => e.tags?.natural === 'water').length;
    const waterTotal = springs + wells + waterways + waterBodies;

    // Water security score
    let waterScore = 5;
    waterScore += Math.min(springs * 1.5, 3);
    waterScore += Math.min(wells * 1, 2);
    waterScore += waterways > 0 ? 1 : 0;
    waterScore += waterBodies > 0 ? 1 : 0;
    if (annualRainfall && annualRainfall > 600) waterScore += 0.5;
    waterScore = Math.min(Math.round(waterScore * 10) / 10, 10);

    // Bio score
    let bioScore = 5;
    if (species.total > 100) bioScore += 2; else if (species.total > 50) bioScore += 1;
    if (threatenedSummary.total > 0) bioScore += 1;
    if (protectedAreas.length > 0) bioScore += 1.5;
    bioScore = Math.min(Math.round(bioScore * 10) / 10, 10);

    // Protected area names
    const protectedAreaNames = protectedAreas
      .filter(e => e.tags?.name)
      .map(e => ({ name: e.tags.name, type: e.tags.protect_class || e.tags.designation || 'Protected Area' }))
      .slice(0, 5);

    // Infrastructure summary
    const infraGroups = {};
    for (const el of infrastructure) {
      const type = el.tags?.amenity || el.tags?.shop || el.tags?.tourism || 'other';
      infraGroups[type] = (infraGroups[type] || 0) + 1;
    }

    // GBIF kingdoms
    const gbifKingdoms = {};
    let gbifTotal = gbif?.count || 0;
    if (gbif?.facets?.[0]?.counts) {
      for (const c of gbif.facets[0].counts) {
        gbifKingdoms[c.name] = c.count;
      }
    }

    // Risk levels
    const fireRisk = riskLevel(risks.fire);
    const droughtRisk = riskLevel(risks.drought);
    const floodRisk = riskLevel(risks.flood);

    // ── Build data snapshot ──────────────────────────────
    const dataSnapshot = {
      submission: {
        id: sub.id,
        boundary: sub.boundary,
        center: [lat, lng],
        area: sub.area,
        areaHa: Math.round(areaHa * 100) / 100,
        perimeter: sub.perimeter ? Math.round(sub.perimeter) : null,
        address: sub.address,
        email: sub.email,
        notes: sub.notes,
        files: sub.files || [],
        created: sub.created,
      },
      dynamic: {
        elevation,
        forecast: forecast?.daily || null,
        climate,
        annualRainfall,
        annualMeanTemp,
        summerMean,
        winterMean,
        frostDays,
        growingSeason,
        soil,
        geology: geo,
        species: {
          total: species.total,
          groups: species.groups,
          topSpecies: species.topSpecies,
        },
        threatened: {
          total: threatenedSummary.total,
          topSpecies: threatenedSummary.topSpecies,
        },
        gbif: { total: gbifTotal, kingdoms: gbifKingdoms },
        flood: floodAnalysis,
        risks: {
          fire: { score: risks.fire, ...fireRisk },
          drought: { score: risks.drought, ...droughtRisk },
          flood: { score: risks.flood, ...floodRisk },
        },
        protectedAreas: protectedAreaNames,
        waterFeatures: { springs, wells, waterways, waterBodies, total: waterTotal },
        waterScore,
        bioScore,
        infrastructure: infraGroups,
        adminUnit,
        ipmaLocation: ipmaLocation ? { name: ipmaLocation.local, id: ipmaLocation.globalIdLocal } : null,
        ipmaForecast: ipmaForecast?.data?.slice(0, 5) || null,
      },
      hardcoded: {
        // These values have NO dynamic data source yet
        propertyName: 'Generated from submission — no user-defined name',
        marketValue: 'No real estate API integrated — placeholder €/ha estimates',
        naturalCapitalValue: 'No natural capital valuation model — placeholder calculations',
        ecosystemServicesValue: 'No SEEA EA valuation engine — placeholder figures',
        corkProduction: 'No agricultural yield model — generic cork production estimates',
        revenueScenarios: 'No financial model — placeholder revenue projections',
        carbonStock: 'No carbon measurement — estimated from general montado/forest data',
        carbonCredits: 'No carbon market integration — generic price range',
        slopeAnalysis: 'No DEM slope processing — would need raster analysis',
        landCoverBreakdown: 'No CORINE pixel analysis — WMS available but not parsed per-property',
        wildfireHistory: 'No historical fire database query — EFFIS WMS available but not parsed',
        valuationComparables: 'No property sales API — placeholder regional benchmarks',
        nextSteps: 'Generic recommendations — not yet tailored to actual property data',
        opportunityCards: 'Hardcoded set — should be derived from property characteristics',
      },
    };

    // ── Build HTML ───────────────────────────────────────
    const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const ds = dataSnapshot;
    const dd = ds.dynamic;
    const prop = ds.submission;

    // Parish/municipality from DGT or address parse
    const parish = dd.adminUnit?.parish || '';
    const municipality = dd.adminUnit?.municipality || prop.address.split(',').slice(-3, -2)[0]?.trim() || '';
    const district = dd.adminUnit?.district || '';
    const locationLine = [parish, municipality, 'Portugal'].filter(Boolean).join(', ');

    // Determine climate zone (simplified)
    const climateZone = annualMeanTemp && annualRainfall
      ? (parseFloat(annualMeanTemp) > 14 && annualRainfall < 800 ? 'Csa (Hot-summer Mediterranean)' : parseFloat(annualMeanTemp) > 14 ? 'Csb (Warm-summer Mediterranean)' : 'Cfb (Oceanic)')
      : 'Mediterranean (estimated)';

    // Monthly temps and rain for chart
    const monthlyTemp = climate ? climate.map(m => Math.round((m.avgHigh + m.avgLow) / 2)) : [10,11,13,15,18,22,26,26,23,18,13,10];
    const monthlyRain = climate ? climate.map(m => m.totalPrecip) : [];

    // Species groups for bar chart
    const speciesGroups = Object.entries(dd.species.groups || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxSpecies = speciesGroups.length > 0 ? Math.max(...speciesGroups.map(s => s[1])) : 1;

    // Soil composition bars
    const soilBars = soil ? [
      soil.classification ? { label: soil.classification, pct: soil.classificationProb || 100 } : null,
    ].filter(Boolean) : [];

    const html = `
<!-- SECTION 0: COVER -->
<div class="report-page cover-page">
  <div class="cover-badge">LANDBOOK MVP v3.0</div>
  <div class="cover-property">${prop.address.split(',')[0] || 'Land Report'}</div>
  <div class="cover-location">${locationLine} &middot; ${lat.toFixed(4)}&deg;N, ${Math.abs(lng).toFixed(4)}&deg;W</div>
  <div class="cover-kpi">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">${prop.areaHa}</div><div class="kpi-label">Hectares</div><div class="kpi-sub">${prop.area ? Math.round(prop.area).toLocaleString() + ' m&sup2;' : ''}</div></div>
      <div class="kpi-card"><div class="kpi-value">&euro;${Math.round(prop.areaHa * 25000 / 1000)}K</div><div class="kpi-label">Est. Value</div><div class="kpi-sub" style="font-size:9px;opacity:0.5;">HARDCODED</div></div>
      <div class="kpi-card"><div class="kpi-value">${dd.bioScore}/10</div><div class="kpi-label">Bio Score</div><div class="kpi-sub">${dd.species.total} species nearby</div></div>
      <div class="kpi-card"><div class="kpi-value">${dd.waterScore}/10</div><div class="kpi-label">Water Security</div><div class="kpi-sub">${dd.waterFeatures.total} features found</div></div>
    </div>
  </div>
  <div class="cover-date">Report generated ${now}</div>
</div>

<!-- SECTION 1: EXECUTIVE SUMMARY -->
<div class="report-page">
  <div class="section-number">Section 01</div>
  <div class="section-title">Executive Summary</div>
  <div class="section-subtitle">Property overview derived from submission and open data</div>

  <h3>1.1 Property Snapshot</h3>
  <table class="data-table">
    <thead><tr><th>Attribute</th><th>Value</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Coordinates</td><td class="value">${lat.toFixed(4)}&deg;N, ${Math.abs(lng).toFixed(4)}&deg;W</td><td>Submission (DYNAMIC)</td></tr>
      <tr><td class="label">Elevation</td><td class="value">${elevation != null ? elevation + 'm' : 'N/A'}</td><td>${elevation != null ? 'Open-Meteo DEM (DYNAMIC)' : 'FAILED'}</td></tr>
      <tr><td class="label">Area</td><td class="value">${prop.areaHa} ha (${Math.round(prop.area).toLocaleString()} m&sup2;)</td><td>Calculated from boundary (DYNAMIC)</td></tr>
      <tr><td class="label">Perimeter</td><td class="value">${prop.perimeter ? prop.perimeter + 'm' : 'N/A'}</td><td>Calculated from boundary (DYNAMIC)</td></tr>
      <tr><td class="label">Address</td><td class="value">${prop.address}</td><td>Mapbox geocoding (DYNAMIC)</td></tr>
      <tr><td class="label">Parish</td><td class="value">${parish || 'N/A'}</td><td>${parish ? 'DGT API (DYNAMIC)' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Municipality</td><td class="value">${municipality || 'N/A'}</td><td>${municipality ? 'DGT API (DYNAMIC)' : 'UNAVAILABLE'}</td></tr>
      <tr><td class="label">Climate Zone</td><td class="value">${climateZone}</td><td>${climate ? 'Derived from climate data (DYNAMIC)' : 'ESTIMATED'}</td></tr>
      <tr><td class="label">Zoning</td><td class="value">Not available</td><td>No zoning API (MISSING)</td></tr>
      <tr><td class="label">Aspect/Slope</td><td class="value">Not available</td><td>Needs DEM raster processing (MISSING)</td></tr>
    </tbody>
  </table>

  <h3>1.2 Value Composition</h3>
  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>HARDCODED</strong> — No real estate valuation API is integrated. The values below are placeholder estimates based on generic &euro;/ha rates.
  </div>

  <h3>1.3 Key Opportunities</h3>
  <div class="cards-grid">
    ${['💧 Water Security', '🌿 Carbon Credits', '🔥 Fire Management', '🌾 Agriculture', '🐝 Pollination', '🏕️ Eco-Tourism'].map(o => {
      const [icon, ...rest] = o.split(' ');
      return `<div class="card"><div class="card-icon">${icon}</div><div class="card-title">${rest.join(' ')}</div><div style="font-size:9px;color:var(--text-muted);margin-top:4px;">HARDCODED</div></div>`;
    }).join('')}
  </div>

  <h3>1.4 Risk Summary</h3>
  <div class="risk-row"><div class="risk-dot ${dd.risks.fire.cls}"></div><div class="risk-label">Fire Risk</div><div class="risk-value">${dd.risks.fire.out5}/5 (${dd.risks.fire.level}) — score: ${dd.risks.fire.score}</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.flood.cls}"></div><div class="risk-label">Flood Risk</div><div class="risk-value">${dd.risks.flood.out5}/5 (${dd.risks.flood.level}) — score: ${dd.risks.flood.score}</div></div>
  <div class="risk-row"><div class="risk-dot ${dd.risks.drought.cls}"></div><div class="risk-label">Drought Risk</div><div class="risk-value">${dd.risks.drought.out5}/5 (${dd.risks.drought.level}) — score: ${dd.risks.drought.score}</div></div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: Computed from Open-Meteo forecast data (DYNAMIC)</div>
</div>

<!-- SECTION 2: NATURAL CAPITAL SCORECARD -->
<div class="report-page">
  <div class="section-number">Section 02</div>
  <div class="section-title">Natural Capital Scorecard</div>
  <div class="section-subtitle">Computed scores based on available data</div>

  <table class="data-table">
    <thead><tr><th>Dimension</th><th>Score</th><th>Basis</th><th>Data Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Water Resources</td><td class="value">${dd.waterScore}/10</td><td>${dd.waterFeatures.springs} springs, ${dd.waterFeatures.wells} wells, ${dd.waterFeatures.waterways} waterways</td><td>Overpass API (DYNAMIC)</td></tr>
      <tr><td class="label">Biodiversity</td><td class="value">${dd.bioScore}/10</td><td>${dd.species.total} species, ${dd.threatened.total} threatened, ${dd.protectedAreas.length} protected areas</td><td>iNaturalist + Natura2000 (DYNAMIC)</td></tr>
      <tr><td class="label">Soil Quality</td><td class="value">${soil ? (soil.ph && parseFloat(soil.ph) > 5 && parseFloat(soil.ph) < 8 ? '7' : '5') + '/10' : 'N/A'}</td><td>${soil ? `pH ${soil.ph}, OC ${soil.organicCarbon}g/kg, ${soil.classification}` : 'No data'}</td><td>${soil ? 'SoilGrids (DYNAMIC)' : 'FAILED'}</td></tr>
      <tr><td class="label">Carbon & Biomass</td><td class="value">N/A</td><td>No carbon measurement available</td><td>MISSING — needs biomass model</td></tr>
      <tr><td class="label">Climate Resilience</td><td class="value">${10 - Math.round(Math.max(dd.risks.fire.score, dd.risks.drought.score) / 10)}/10</td><td>Inverse of max risk score</td><td>Derived from risk scores (DYNAMIC)</td></tr>
    </tbody>
  </table>
  <div style="background:var(--bg);padding:12px;border-radius:8px;font-size:11px;color:var(--text-muted);margin-top:12px;">
    Note: Regional averages for radar chart comparison are not yet available. Radar chart omitted until baseline data is collected.
  </div>
</div>

<!-- SECTION 3: ECOSYSTEM SERVICES VALUATION -->
<div class="report-page">
  <div class="section-number">Section 03</div>
  <div class="section-title">Ecosystem Services Valuation</div>
  <div class="section-subtitle">Annual value estimates</div>

  <div style="background:var(--bg);padding:20px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>ENTIRELY HARDCODED</strong> — No ecosystem services valuation model is integrated. Requires SEEA EA framework implementation, benefit transfer databases, and local market price calibration. This entire section uses placeholder values.
  </div>
</div>

<!-- SECTION 4: TERRAIN & LANDSCAPE -->
<div class="report-page">
  <div class="section-number">Section 04</div>
  <div class="section-title">Terrain & Landscape</div>
  <div class="section-subtitle">Elevation, soils, and water resources</div>

  <h3>4.1 Elevation</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
    <div class="kpi-card"><div class="kpi-value">${elevation != null ? elevation + 'm' : 'N/A'}</div><div class="kpi-label">Elevation at Center</div><div class="kpi-sub">${elevation != null ? 'DYNAMIC — Open-Meteo' : 'FAILED'}</div></div>
    <div class="kpi-card"><div class="kpi-value">N/A</div><div class="kpi-label">Slope Analysis</div><div class="kpi-sub">MISSING — needs DEM raster</div></div>
  </div>

  <h3>4.2 Soil Composition</h3>
  ${soil ? `
  <table class="data-table">
    <thead><tr><th>Property</th><th>Value</th><th>Depth</th></tr></thead>
    <tbody>
      <tr><td class="label">Classification</td><td class="value">${soil.classification || 'N/A'}</td><td>—</td></tr>
      <tr><td class="label">Clay</td><td class="value">${soil.clay || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">Sand</td><td class="value">${soil.sand || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">Silt</td><td class="value">${soil.silt || 'N/A'}%</td><td>0–5cm</td></tr>
      <tr><td class="label">pH</td><td class="value">${soil.ph || 'N/A'}</td><td>0–5cm</td></tr>
      <tr><td class="label">Organic Carbon</td><td class="value">${soil.organicCarbon || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Nitrogen</td><td class="value">${soil.nitrogen || 'N/A'} g/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">CEC</td><td class="value">${soil.cec || 'N/A'} cmol/kg</td><td>0–5cm</td></tr>
      <tr><td class="label">Bulk Density</td><td class="value">${soil.bulkDensity || 'N/A'} g/cm³</td><td>0–5cm</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: SoilGrids 2.0 (ISRIC) — 250m resolution (DYNAMIC)</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Soil data unavailable — SoilGrids API did not return data for this location.</div>'}

  <h3>4.3 Land Cover</h3>
  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>MISSING</strong> — CORINE/WorldCover WMS layers are available but per-property pixel classification is not implemented. Needs server-side WMS GetFeatureInfo or raster clipping.
  </div>

  <h3>4.4 Water Resources</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);">
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.springs}</div><div class="kpi-label">Springs</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.wells}</div><div class="kpi-label">Wells</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.waterways}</div><div class="kpi-label">Waterways</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.waterFeatures.waterBodies}</div><div class="kpi-label">Water Bodies</div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: OpenStreetMap via Overpass API (DYNAMIC) — depends on OSM contributor coverage</div>

  <div style="display:flex;align-items:center;gap:12px;margin-top:16px;">
    <div class="score-label" style="font-size:14px;font-weight:700;">Water Security Index</div>
    <div class="score-track" style="flex:1;height:14px;"><div class="score-fill" style="width:${dd.waterScore * 10}%;background:var(--sky-dark);"></div></div>
    <div class="score-value" style="color:var(--sky-dark);">${dd.waterScore}/10</div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Computed from water feature count + rainfall (DYNAMIC)</div>
</div>

<!-- SECTION 5: CLIMATE PROFILE -->
<div class="report-page">
  <div class="section-number">Section 05</div>
  <div class="section-title">Climate Profile</div>
  <div class="section-subtitle">${climate ? 'Based on historical weather data' : 'Climate data unavailable'}</div>

  <h3>5.1 Annual Climate Summary</h3>
  ${climate ? `
  <table class="data-table">
    <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Annual Mean Temp</td><td class="value">${annualMeanTemp}&deg;C</td><td>Open-Meteo Archive (DYNAMIC)</td></tr>
      <tr><td class="label">Summer Mean (Jun–Aug)</td><td class="value">${summerMean}&deg;C</td><td>Open-Meteo Archive (DYNAMIC)</td></tr>
      <tr><td class="label">Winter Mean (Dec–Feb)</td><td class="value">${winterMean}&deg;C</td><td>Open-Meteo Archive (DYNAMIC)</td></tr>
      <tr><td class="label">Annual Rainfall</td><td class="value">${annualRainfall}mm</td><td>Open-Meteo Archive (DYNAMIC)</td></tr>
      <tr><td class="label">Growing Season</td><td class="value">~${growingSeason} days</td><td>Derived (DYNAMIC)</td></tr>
      <tr><td class="label">Frost Days/Year</td><td class="value">${frostDays} days</td><td>Estimated from monthly lows (DYNAMIC)</td></tr>
    </tbody>
  </table>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Climate archive data unavailable.</div>'}

  <h3>5.2 Monthly Temperature & Rainfall</h3>
  ${climate ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Source: Open-Meteo historical archive (DYNAMIC)</div>` : '<div style="color:var(--text-muted);">No climate data to chart.</div>'}

  <h3>5.3 IPMA Forecast</h3>
  ${dd.ipmaForecast ? `
  <table class="data-table">
    <thead><tr><th>Date</th><th>Min</th><th>Max</th><th>Precip</th></tr></thead>
    <tbody>
      ${dd.ipmaForecast.map(f => `<tr><td class="label">${f.forecastDate || '—'}</td><td>${f.tMin || '—'}&deg;C</td><td class="value">${f.tMax || '—'}&deg;C</td><td>${f.precipitaProb || '—'}%</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: IPMA — ${dd.ipmaLocation?.name || 'nearest station'} (DYNAMIC)</div>
  ` : '<div style="background:var(--bg);padding:12px;border-radius:8px;color:var(--text-muted);font-size:13px;">IPMA forecast not available for this location.</div>'}

  <h3>5.4 Seasonal Risk Calendar</h3>
  <div style="background:var(--bg);padding:12px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>HARDCODED</strong> — Seasonal risk calendar uses generic Mediterranean patterns. Should be derived from actual climate data and historical event records.
  </div>
</div>

<!-- SECTION 6: BIODIVERSITY INVENTORY -->
<div class="report-page">
  <div class="section-number">Section 06</div>
  <div class="section-title">Biodiversity Inventory</div>
  <div class="section-subtitle">${dd.species.total} species observed within 15km radius</div>

  <h3>6.1 Species by Group</h3>
  ${speciesGroups.length > 0 ? speciesGroups.map(([group, count]) =>
    `<div class="bar-row"><div class="bar-label">${group}</div><div class="bar-track"><div class="bar-fill green" style="width:${(count / maxSpecies * 100).toFixed(0)}%">${count}</div></div></div>`
  ).join('') : '<div style="color:var(--text-muted);">No species data available.</div>'}
  <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">Source: iNaturalist community observations — 15km radius (DYNAMIC)</div>

  <h3>6.2 Notable Species</h3>
  ${dd.species.topSpecies.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Species</th><th>Group</th><th>Observations</th><th>Threatened</th></tr></thead>
    <tbody>
      ${dd.species.topSpecies.slice(0, 8).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td><td>${s.threatened ? '⚠️ Yes' : '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  ` : ''}

  ${dd.threatened.total > 0 ? `
  <h3>6.3 Threatened Species (${dd.threatened.total} found)</h3>
  <table class="data-table">
    <thead><tr><th>Species</th><th>Group</th><th>Observations</th></tr></thead>
    <tbody>
      ${dd.threatened.topSpecies.slice(0, 6).map(s => `<tr><td class="value">${s.name}</td><td>${s.group}</td><td>${s.count}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: iNaturalist threatened species — 25km radius (DYNAMIC)</div>
  ` : ''}

  <h3>6.4 GBIF Occurrence Data</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);">
    <div class="kpi-card"><div class="kpi-value">${gbifTotal.toLocaleString()}</div><div class="kpi-label">Total Occurrences</div><div class="kpi-sub">GBIF database (DYNAMIC)</div></div>
    <div class="kpi-card"><div class="kpi-value">${Object.keys(gbifKingdoms).length}</div><div class="kpi-label">Kingdoms</div><div class="kpi-sub">${Object.entries(gbifKingdoms).map(([k, v]) => k + ': ' + v).join(', ') || 'N/A'}</div></div>
  </div>

  <h3>6.5 Protected Areas Nearby</h3>
  ${protectedAreaNames.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Name</th><th>Type</th></tr></thead>
    <tbody>
      ${protectedAreaNames.map(p => `<tr><td class="value">${p.name}</td><td>${p.type}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: Overpass API / Natura 2000 (DYNAMIC)</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">No protected areas found within 25km radius.</div>'}
</div>

<!-- SECTION 7: GEOLOGY -->
<div class="report-page">
  <div class="section-number">Section 07</div>
  <div class="section-title">Geology</div>
  <div class="section-subtitle">Bedrock and geological history</div>

  ${geo && geo.length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Unit</th><th>Lithology</th><th>Environment</th><th>Period</th><th>Age</th></tr></thead>
    <tbody>
      ${geo.map(g => `<tr><td class="value">${g.name}</td><td>${g.lithology}</td><td>${g.environment}</td><td>${g.period}</td><td>${g.ageMa || '—'}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: Macrostrat (DYNAMIC)</div>
  ` : '<div style="background:var(--bg);padding:16px;border-radius:8px;color:var(--text-muted);">Geology data not available — Macrostrat may not cover this region.</div>'}
</div>

<!-- SECTION 8: RISK ASSESSMENT -->
<div class="report-page">
  <div class="section-number">Section 08</div>
  <div class="section-title">Risk Assessment</div>
  <div class="section-subtitle">Current risk levels based on weather and environmental data</div>

  <h3>8.1 Risk Scores</h3>
  <table class="data-table">
    <thead><tr><th>Risk</th><th>Score</th><th>Level</th><th>Basis</th></tr></thead>
    <tbody>
      <tr><td class="label">Fire</td><td class="value">${dd.risks.fire.score}/100</td><td><span class="risk-tag ${dd.risks.fire.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.fire.level.toUpperCase()}</span></td><td>Temp, precip, wind, season (DYNAMIC)</td></tr>
      <tr><td class="label">Drought</td><td class="value">${dd.risks.drought.score}/100</td><td><span class="risk-tag ${dd.risks.drought.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.drought.level.toUpperCase()}</span></td><td>Precip vs seasonal avg (DYNAMIC)</td></tr>
      <tr><td class="label">Flood</td><td class="value">${dd.risks.flood.score}/100</td><td><span class="risk-tag ${dd.risks.flood.cls}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${dd.risks.flood.level.toUpperCase()}</span></td><td>Recent precipitation (DYNAMIC)</td></tr>
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Scores computed from Open-Meteo 7-day forecast data (DYNAMIC)</div>

  <h3>8.2 Flood Discharge Data</h3>
  ${dd.flood.current ? `
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="kpi-card"><div class="kpi-value">${dd.flood.current}</div><div class="kpi-label">Current m&sup3;/s</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.flood.average}</div><div class="kpi-label">Average m&sup3;/s</div></div>
    <div class="kpi-card"><div class="kpi-value">${dd.flood.max}</div><div class="kpi-label">Max m&sup3;/s</div></div>
  </div>
  <div style="font-size:11px;color:var(--text-muted);">Source: GloFAS via Open-Meteo Flood API (DYNAMIC)</div>
  ` : '<div style="color:var(--text-muted);font-size:13px;">No river discharge data available for this grid cell.</div>'}

  <h3>8.3 Wildfire History</h3>
  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>MISSING</strong> — Historical fire scar data not queried. EFFIS WMS layers available but would need per-property raster intersection.
  </div>

  <h3>8.4 Mitigation Recommendations</h3>
  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>HARDCODED</strong> — Generic recommendations. Should be generated based on actual risk scores, land cover, and property characteristics.
  </div>
</div>

<!-- SECTION 9: NEARBY INFRASTRUCTURE -->
<div class="report-page">
  <div class="section-number">Section 09</div>
  <div class="section-title">Nearby Infrastructure</div>
  <div class="section-subtitle">Amenities and services within ~5km</div>

  ${Object.keys(dd.infrastructure).length > 0 ? `
  <table class="data-table">
    <thead><tr><th>Type</th><th>Count</th></tr></thead>
    <tbody>
      ${Object.entries(dd.infrastructure).sort((a, b) => b[1] - a[1]).map(([type, count]) => `<tr><td class="label">${type}</td><td class="value">${count}</td></tr>`).join('')}
    </tbody>
  </table>
  <div style="font-size:11px;color:var(--text-muted);">Source: OpenStreetMap via Overpass API (DYNAMIC)</div>
  ` : '<div style="color:var(--text-muted);">No infrastructure data found nearby.</div>'}
</div>

<!-- SECTION 10: MAP PORTFOLIO -->
<div class="report-page">
  <div class="section-number">Section 10</div>
  <div class="section-title">Map Portfolio</div>
  <div class="section-subtitle">Available geospatial layers</div>

  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);margin-bottom:16px;">
    <strong>MISSING</strong> — Static map rendering not implemented. Maps require Mapbox Static API or server-side map rendering. Available WMS layers: CORINE, WorldCover, Sentinel-2, EFFIS, Natura 2000, SoilGrids, COS.
  </div>

  <div class="map-grid">
    ${['Satellite + Boundary', 'Topography', 'Soil Types', 'Land Cover', 'Water Resources', 'Fire Risk Zones', 'Biodiversity', 'Administrative'].map(m => `<div class="map-item"><div class="map-placeholder">${m}</div><div class="map-label">${m}</div></div>`).join('')}
  </div>
</div>

<!-- SECTION 11: MARKET CONTEXT -->
<div class="report-page">
  <div class="section-number">Section 11</div>
  <div class="section-title">Market Context & Revenue</div>
  <div class="section-subtitle">Valuation and revenue potential</div>

  <div style="background:var(--bg);padding:20px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>ENTIRELY HARDCODED</strong> — The following sections have no dynamic data source:
    <ul style="margin-top:8px;padding-left:20px;line-height:2;">
      <li>Property valuation — no real estate API</li>
      <li>Cork/agricultural production models — no yield database</li>
      <li>Revenue scenarios — no financial model</li>
      <li>Carbon stock and credits — no biomass measurement</li>
      <li>Regional comparables — no sales data source</li>
    </ul>
  </div>
</div>

<!-- SECTION 12: NEXT STEPS -->
<div class="report-page">
  <div class="section-number">Section 12</div>
  <div class="section-title">Next Steps & Recommendations</div>

  <div style="background:var(--bg);padding:16px;border-radius:8px;border-left:3px solid var(--amber);font-size:13px;color:var(--text-muted);">
    <strong>HARDCODED</strong> — Recommendations should be generated based on actual property data, risk scores, and identified opportunities.
  </div>
</div>

<!-- SECTION 13: METHODOLOGY & SOURCES -->
<div class="report-page">
  <div class="section-number">Section 13</div>
  <div class="section-title">Methodology & Sources</div>

  <table class="data-table">
    <thead><tr><th>Category</th><th>Source</th><th>Resolution</th><th>Status</th></tr></thead>
    <tbody>
      <tr><td class="label">Elevation</td><td>Open-Meteo DEM</td><td>Point</td><td style="color:green;font-weight:600;">${elevation != null ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Weather Forecast</td><td>Open-Meteo</td><td>7-day</td><td style="color:green;font-weight:600;">${forecast ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Climate History</td><td>Open-Meteo Archive</td><td>1 year</td><td style="color:green;font-weight:600;">${climate ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Soil Properties</td><td>SoilGrids 2.0 (ISRIC)</td><td>250m</td><td style="color:green;font-weight:600;">${soil ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Geology</td><td>Macrostrat</td><td>Variable</td><td style="color:green;font-weight:600;">${geo ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Species</td><td>iNaturalist</td><td>15km radius</td><td style="color:green;font-weight:600;">${dd.species.total > 0 ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Threatened Species</td><td>iNaturalist</td><td>25km radius</td><td style="color:green;font-weight:600;">${dd.threatened.total > 0 ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
      <tr><td class="label">GBIF Occurrences</td><td>GBIF</td><td>Bounding box</td><td style="color:green;font-weight:600;">${gbifTotal > 0 ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">Flood Risk</td><td>GloFAS (Open-Meteo)</td><td>10km</td><td style="color:green;font-weight:600;">${dd.flood.current ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
      <tr><td class="label">Risk Scores</td><td>Computed (Open-Meteo)</td><td>Derived</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Protected Areas</td><td>Overpass / Natura 2000</td><td>25km</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Water Features</td><td>Overpass (OSM)</td><td>2km bbox</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Infrastructure</td><td>Overpass (OSM)</td><td>5km bbox</td><td style="color:green;font-weight:600;">DYNAMIC ✓</td></tr>
      <tr><td class="label">Admin Boundaries</td><td>DGT Portugal</td><td>1:25,000</td><td style="color:green;font-weight:600;">${dd.adminUnit ? 'DYNAMIC ✓' : 'FAILED ✗'}</td></tr>
      <tr><td class="label">IPMA Forecast</td><td>IPMA</td><td>Nearest station</td><td style="color:green;font-weight:600;">${dd.ipmaForecast ? 'DYNAMIC ✓' : 'NO DATA'}</td></tr>
    </tbody>
  </table>

  <h3 style="margin-top:32px;">Disclaimer</h3>
  <div class="disclaimer">
    This report is generated using publicly available data sources and computational models. Values presented are estimates intended for informational purposes only. Property boundaries, valuations, and environmental assessments should be verified by licensed professionals. Data accuracy is subject to the resolution and currency of underlying sources.
  </div>
</div>

<!-- SECTION 14: DATA AUDIT — HARDCODED vs DYNAMIC -->
<div class="report-page" style="border-top:4px solid var(--terra);">
  <div class="section-number" style="color:var(--terra);">Data Audit</div>
  <div class="section-title">What Is Dynamic vs Hardcoded</div>
  <div class="section-subtitle">Complete accounting of every data point in this report</div>

  <h3 style="color:green;">DYNAMIC — Fetched from APIs for this property</h3>
  <table class="data-table">
    <thead><tr><th>Data Point</th><th>API Source</th><th>Value Retrieved</th></tr></thead>
    <tbody>
      <tr><td>Coordinates</td><td>Submission</td><td>${lat.toFixed(4)}, ${lng.toFixed(4)}</td></tr>
      <tr><td>Boundary polygon</td><td>Submission</td><td>${prop.boundary.length} points</td></tr>
      <tr><td>Area</td><td>Computed from boundary</td><td>${prop.areaHa} ha</td></tr>
      <tr><td>Perimeter</td><td>Computed from boundary</td><td>${prop.perimeter}m</td></tr>
      <tr><td>Address</td><td>Submission (Mapbox geocoded)</td><td>${prop.address}</td></tr>
      <tr><td>Email</td><td>Submission</td><td>${prop.email}</td></tr>
      <tr><td>Elevation</td><td>Open-Meteo DEM</td><td>${elevation != null ? elevation + 'm' : 'FAILED'}</td></tr>
      <tr><td>7-day forecast</td><td>Open-Meteo Forecast</td><td>${forecast ? forecast.daily.time.length + ' days' : 'FAILED'}</td></tr>
      <tr><td>Climate averages</td><td>Open-Meteo Archive</td><td>${climate ? '12 months' : 'FAILED'}</td></tr>
      <tr><td>Annual mean temp</td><td>Derived from climate</td><td>${annualMeanTemp || 'N/A'}&deg;C</td></tr>
      <tr><td>Annual rainfall</td><td>Derived from climate</td><td>${annualRainfall || 'N/A'}mm</td></tr>
      <tr><td>Summer/winter means</td><td>Derived from climate</td><td>${summerMean || 'N/A'} / ${winterMean || 'N/A'}&deg;C</td></tr>
      <tr><td>Growing season</td><td>Derived from climate</td><td>~${growingSeason || 'N/A'} days</td></tr>
      <tr><td>Frost days estimate</td><td>Derived from climate</td><td>${frostDays || 'N/A'}</td></tr>
      <tr><td>Climate zone</td><td>Derived from temp + rainfall</td><td>${climateZone}</td></tr>
      <tr><td>Soil clay/sand/silt/pH/OC/N/CEC/BD</td><td>SoilGrids 2.0</td><td>${soil ? '8 properties' : 'FAILED'}</td></tr>
      <tr><td>Soil classification</td><td>SoilGrids 2.0</td><td>${soil?.classification || 'N/A'}</td></tr>
      <tr><td>Geology units</td><td>Macrostrat</td><td>${geo ? geo.length + ' units' : 'FAILED'}</td></tr>
      <tr><td>Species counts by group</td><td>iNaturalist</td><td>${dd.species.total} species</td></tr>
      <tr><td>Top species list</td><td>iNaturalist</td><td>${dd.species.topSpecies.length} top species</td></tr>
      <tr><td>Threatened species</td><td>iNaturalist</td><td>${dd.threatened.total} found</td></tr>
      <tr><td>GBIF occurrences</td><td>GBIF</td><td>${gbifTotal.toLocaleString()} records</td></tr>
      <tr><td>Fire risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.fire.score}/100</td></tr>
      <tr><td>Drought risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.drought.score}/100</td></tr>
      <tr><td>Flood risk score</td><td>Computed (Open-Meteo)</td><td>${dd.risks.flood.score}/100</td></tr>
      <tr><td>River discharge</td><td>GloFAS (Open-Meteo)</td><td>${dd.flood.current ? dd.flood.current + ' m³/s' : 'NO DATA'}</td></tr>
      <tr><td>Protected areas</td><td>Overpass / Natura 2000</td><td>${protectedAreaNames.length} found</td></tr>
      <tr><td>Water features</td><td>Overpass (OSM)</td><td>${dd.waterFeatures.total} features</td></tr>
      <tr><td>Water security score</td><td>Computed</td><td>${dd.waterScore}/10</td></tr>
      <tr><td>Bio score</td><td>Computed</td><td>${dd.bioScore}/10</td></tr>
      <tr><td>Infrastructure</td><td>Overpass (OSM)</td><td>${Object.values(dd.infrastructure).reduce((a,b)=>a+b,0)} amenities</td></tr>
      <tr><td>Parish/Municipality</td><td>DGT Portugal</td><td>${parish || 'N/A'} / ${municipality || 'N/A'}</td></tr>
      <tr><td>IPMA forecast</td><td>IPMA</td><td>${dd.ipmaForecast ? dd.ipmaForecast.length + ' days' : 'N/A'}</td></tr>
    </tbody>
  </table>

  <h3 style="color:var(--red);margin-top:32px;">HARDCODED — No dynamic data source</h3>
  <table class="data-table">
    <thead><tr><th>Data Point</th><th>Why It's Hardcoded</th><th>What's Needed to Make It Dynamic</th></tr></thead>
    <tbody>
      <tr><td>Property name</td><td>Submission doesn't collect a name</td><td>Add name field to intake form</td></tr>
      <tr><td>Market value (€/ha)</td><td>No real estate valuation API</td><td>Property sales API, or manual comparable entry</td></tr>
      <tr><td>Natural capital premium</td><td>No valuation model</td><td>SEEA EA framework + benefit transfer DB</td></tr>
      <tr><td>Ecosystem services values</td><td>No valuation engine</td><td>SEEA EA implementation, local market calibration</td></tr>
      <tr><td>Opportunity cards</td><td>Generic list</td><td>Derive from actual property characteristics</td></tr>
      <tr><td>Slope analysis</td><td>Single-point elevation only</td><td>Multi-point DEM sampling or raster processing</td></tr>
      <tr><td>Land cover breakdown</td><td>WMS available but not parsed</td><td>WMS GetFeatureInfo or CORINE vector query</td></tr>
      <tr><td>Cork/agriculture models</td><td>No yield database</td><td>Agricultural production model per land cover type</td></tr>
      <tr><td>Revenue scenarios</td><td>No financial model</td><td>Revenue model based on land use + market prices</td></tr>
      <tr><td>Carbon stock/credits</td><td>No biomass measurement</td><td>Biomass estimation from NDVI + land cover</td></tr>
      <tr><td>Wildfire history</td><td>EFFIS WMS not queried per-property</td><td>EFFIS burned area intersection or ICNF data</td></tr>
      <tr><td>Regional comparables</td><td>No property sales data</td><td>Real estate API or manual input</td></tr>
      <tr><td>Mitigation recommendations</td><td>Generic text</td><td>Rule engine based on risk scores + land cover</td></tr>
      <tr><td>Next steps checklist</td><td>Generic template</td><td>Generate from identified gaps and opportunities</td></tr>
      <tr><td>Seasonal risk calendar</td><td>Generic Mediterranean</td><td>Build from actual monthly climate + fire history</td></tr>
      <tr><td>Map images</td><td>Need static map rendering</td><td>Mapbox Static API or server-side rendering</td></tr>
      <tr><td>Zoning/land use designation</td><td>No zoning API</td><td>Municipal PDM data or DGT COS classification</td></tr>
      <tr><td>Natural capital radar chart</td><td>No regional baselines</td><td>Collect baseline data across properties</td></tr>
      <tr><td>Aspect/slope direction</td><td>Single elevation point</td><td>Multi-point DEM + slope calculation</td></tr>
    </tbody>
  </table>
</div>
    `;

    // ── Save to DB ───────────────────────────────────────
    const reports = await getCollection('report_versions');
    const count = await reports.countDocuments();

    const doc = {
      id: crypto.randomUUID(),
      version: `v${count + 1}`,
      name: `${prop.address.split(',')[0]} — Real API Data`,
      created: new Date().toISOString(),
      locked_sections: [],
      html_content: html,
      data_snapshot: dataSnapshot,
      submission_id: sub.id,
    };

    await reports.insertOne(doc);

    return res.status(201).json({
      id: doc.id,
      version: doc.version,
      name: doc.name,
      created: doc.created,
      apis_called: 15,
      dynamic_data_points: Object.entries(dd).filter(([, v]) => v != null && v !== false).length,
    });
  } catch (err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ error: 'Generation failed', detail: err.message, stack: err.stack });
  }
}
