/**
 * LandBook Report — Template Data Preparation
 * Transforms raw reportData into a flat, template-ready object.
 * All computation, formatting, and chart pre-rendering happens here.
 * The Handlebars template only reads and iterates — never computes.
 */

import {
  horizontalBarChart,
  stackedBarChart,
  radarChart,
  monthlyClimateChart,
  riskBarChart,
  speciesBarChart,
  percentileChart,
  energyBarChart,
} from './report-charts.js';

function safe(v) { return v && typeof v === 'object' ? v : {}; }
function safeArr(v) { return Array.isArray(v) ? v : []; }

/** SVG semicircle gauge — pre-rendered to HTML string */
function gaugeArcSvg(value, max, color, label) {
  const halfCirc = 141.37;
  const total = halfCirc * 2;
  const raw = (value != null && max > 0) ? value / max : 0;
  const pct = Math.max(0, Math.min(raw, 1));
  const filled = pct === 0 ? 3 : halfCirc * pct;
  const display = value != null ? String(value) : '\u2014';
  return `
  <div class="text-center">
    <div class="relative w-32 h-16 mx-auto overflow-hidden">
      <svg class="gauge-svg w-32 h-32 absolute top-0 left-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E7EEFE" stroke-width="10" stroke-dasharray="${halfCirc} ${total}"/>
        <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${filled.toFixed(1)} ${total}"/>
      </svg>
      <div class="absolute bottom-0 w-full text-center">
        <span class="text-lg font-bold text-brand-forest">${display}</span>
      </div>
    </div>
    <p class="text-[10px] font-bold tracking-widest text-brand-forest uppercase mt-2">${label}</p>
  </div>`;
}

/**
 * Prepare template data from raw reportData.
 * @param {object} reportData - Canonical shape from report-data-pipeline.js
 * @returns {object} Flat, template-ready data
 */
export function prepareTemplateData(reportData) {
  const d = reportData || {};
  const p = safe(d.property);
  const coords = safe(p.coords);
  const scores = safe(d.scores);
  const eco = safe(d.economics);
  const maps = safe(d.maps);
  const meta = safe(d.meta);
  const narr = safe(d.narratives);
  const reg = safe(d.regional);
  const pctls = safe(reg.percentiles);
  const soil = safe(d.soil);
  const geo = safe(d.geology);
  const terrain = safe(d.terrain);
  const w = safe(d.water);
  const climate = safe(d.climate);
  const sp = safe(d.species);
  const fire = safe(d.fire);
  const flood = safe(d.flood);
  const drought = safe(d.drought);
  const energy = safe(d.energy);
  const ag = safe(d.agriculture);
  const trends = safe(d.trends);
  const comp = safe(d.compliance);

  // ── Cover ──
  const cover = {
    name: p.name || '',
    address: p.address || '',
    lat: coords.lat,
    lng: coords.lng,
    area: p.area,
    valuePerHa: eco.valuePerHa,
    naturalCapital: scores.naturalCapital,
    satellite: maps.satellite || null,
    generatedAt: meta.generatedAt,
    version: meta.version,
  };

  // ── Executive Summary (Glance) ──
  const ncs = scores.naturalCapital || 0;
  const ncsLabel = ncs >= 80 ? 'Exceptional' : ncs >= 60 ? 'Strong' : ncs >= 40 ? 'Moderate' : 'Developing';
  const glanceNarr = safe(narr.executiveSummary);
  const glanceIntro = (glanceNarr.intro || '').split(/\n\n+/).filter(Boolean);
  const waterScore = scores.water || 0;
  const fireScoreGlance = fire.riskScore || 0;
  const resilienceScore = scores.resilience || energy.independenceScore || 0;

  const glance = {
    name: p.name || '',
    coordsStr: (coords.lat != null && coords.lng != null) ? `${coords.lat.toFixed(4)}\u00b0N, ${coords.lng.toFixed(4)}\u00b0W` : '',
    address: p.address || '',
    municipality: p.municipality || '',
    parish: p.parish || p.municipality || '',
    percentileOverall: pctls.overall || pctls.carbon,
    percentileWater: pctls.water || pctls.overall,
    satellite: maps.satellite || null,
    pullQuote: glanceNarr.pullQuote || 'A landscape of extraordinary natural capital.',
    area: p.area,
    valuePerHa: eco.valuePerHa,
    totalValue: eco.totalValue,
    carbonStock: eco.carbonStock,
    paragraphs: glanceIntro,
    ncs,
    ncsLabel,
    gauges: {
      waterSecurity: gaugeArcSvg(waterScore, 10, '#3f6653', 'Water Security'),
      fireRisk: gaugeArcSvg(fireScoreGlance, 5, '#D4A574', 'Fire Risk'),
      resilience: gaugeArcSvg(resilienceScore, 10, '#C4705A', 'Resilience'),
    },
  };

  // ── Ecosystem Services ──
  const es = safe(eco.ecosystemServices);
  const services = [
    { name: 'Water Provisioning', value: es.water || 0, beneficiaries: 'Property, downstream users' },
    { name: 'Food & Fiber', value: es.food || 0, beneficiaries: 'Markets, processors' },
    { name: 'Carbon/Climate Regulation', value: es.carbon || 0, beneficiaries: 'Global climate' },
    { name: 'Water Regulation', value: es.regulation || 0, beneficiaries: 'Watershed, aquifer' },
    { name: 'Soil Protection', value: es.soil || 0, beneficiaries: 'Future productivity' },
    { name: 'Recreation/Cultural', value: es.cultural || 0, beneficiaries: 'Visitors, future stewards' },
  ];
  const esTotal = es.total || services.reduce((a, s) => a + s.value, 0);
  const sorted = [...services].sort((a, b) => b.value - a.value);
  const barColorMap = { 0: 'bg-brand-forest', 1: 'bg-brand-sage', 2: 'bg-brand-amber' };
  const colorAssignment = new Map();
  sorted.forEach((s, i) => { if (i < 3) colorAssignment.set(s.name, barColorMap[i]); });

  const servicesWithColor = services.map(s => ({
    ...s,
    pct: esTotal > 0 ? ((s.value / esTotal) * 100).toFixed(1) : '0',
    pctInt: esTotal > 0 ? ((s.value / esTotal) * 100).toFixed(0) : '0',
    bgClass: colorAssignment.get(s.name) || 'bg-brand-sage',
    hasValue: s.value > 0,
  }));

  const esNarr = safe(narr.ecosystemServices);
  const esIntroParts = (esNarr.intro || '').split(/\n\n+/).filter(Boolean);

  const ecosystemServices = {
    para1: esIntroParts[0] || '',
    para2: esIntroParts[1] || '',
    pullQuote: esNarr.pullQuote || '',
    regionalMap: maps.regional || null,
    propertyName: p.name || '',
    npvThirtyYear: safe(eco.npv).thirtyYear,
    uncertaintyLabel: safe(safe(meta.uncertainty)).label || '\u00b120% at 95% CI',
    completeness: safe(safe(meta.uncertainty)).completeness,
    total: esTotal,
    services: servicesWithColor,
  };

  // ── Scorecard ──
  const scNarr = safe(narr.scorecard);
  const dims = [
    { label: 'Carbon', icon: 'eco', score: scores.carbon || 0, avg: safe(scores.regional).carbon || 0 },
    { label: 'Biodiversity', icon: 'forest', score: scores.biodiversity || 0, avg: safe(scores.regional).biodiversity || 0 },
    { label: 'Water', icon: 'water_drop', score: scores.water || 0, avg: safe(scores.regional).water || 0 },
    { label: 'Soil', icon: 'landscape', score: scores.soil || 0, avg: safe(scores.regional).soil || 0 },
    { label: 'Pollination', icon: 'yard', score: scores.pollination || 0, avg: safe(scores.regional).pollination || 0 },
  ].map(dim => {
    const diff = dim.score - dim.avg;
    return {
      ...dim,
      diff,
      sign: diff > 0 ? '+' : '',
      diffLabel: diff > 0 ? 'Above regional average' : diff < 0 ? 'Below regional average' : 'At regional average',
      showWarning: Math.abs(diff) >= 20 && diff < 0,
    };
  });

  const scorecard = {
    text: scNarr.text || '',
    pullQuote: scNarr.pullQuote || '',
    dims,
    charts: {
      radar: radarChart(dims),
    },
  };

  // ── Terrain ──
  const tNarr = safe(narr.terrain);
  const terrainData = {
    description: tNarr.description || '',
    pullQuote: tNarr.pullQuote || '',
    elevation: terrain.elevation,
    slope: terrain.slope,
    aspect: terrain.aspect,
    soilRows: [
      { label: 'Classification', value: soil.classification },
      { label: 'pH', value: soil.ph != null ? soil.ph.toFixed(1) : null },
      { label: 'Organic Carbon', value: soil.organicCarbon != null ? soil.organicCarbon + ' g/kg' : null },
      { label: 'Clay / Sand / Silt', value: [soil.clay, soil.sand, soil.silt].every(v => v != null) ? `${soil.clay}% / ${soil.sand}% / ${soil.silt}%` : null },
      { label: 'Nitrogen', value: soil.nitrogen != null ? soil.nitrogen + ' g/kg' : null },
      { label: 'CEC', value: soil.cec != null ? soil.cec + ' cmol/kg' : null },
      { label: 'Bulk Density', value: soil.bulkDensity != null ? soil.bulkDensity + ' g/cm\u00b3' : null },
    ],
    geoRows: [
      { label: 'Lithology', value: geo.lithology },
      { label: 'Environment', value: geo.environment },
      { label: 'Period', value: geo.period },
      { label: 'Age', value: geo.age },
    ],
  };

  // ── Water ──
  const wNarr = safe(narr.water);
  const waterData = {
    narrative: wNarr.narrative || '',
    pullQuote: wNarr.pullQuote || '',
    springs: w.springs,
    wells: w.wells,
    waterways: w.waterways,
    waterBodies: w.waterBodies,
    securityIndex: w.securityIndex,
    floodDischarge: w.floodDischarge,
    floodRiskLevel: safe(w.floodRisk).level,
    floodRiskScore: safe(w.floodRisk).score,
    annualRainfall: climate.annualRainfall,
  };

  // ── Climate ──
  const cNarr = safe(narr.climate);
  const temps = safeArr(climate.monthlyAvgHigh).length === 12 && safeArr(climate.monthlyAvgLow).length === 12
    ? climate.monthlyAvgHigh.map((h, i) => (h + climate.monthlyAvgLow[i]) / 2)
    : safeArr(climate.monthlyAvgHigh).length === 12
      ? climate.monthlyAvgHigh
      : new Array(12).fill(0);
  const rain = safeArr(climate.monthlyPrecip).length === 12 ? climate.monthlyPrecip : new Array(12).fill(0);

  const climateData = {
    profile: cNarr.profile || '',
    zone: climate.zone || '',
    annualMeanTemp: climate.annualMeanTemp,
    summerMean: climate.summerMean,
    winterMean: climate.winterMean,
    annualRainfall: climate.annualRainfall,
    growingSeason: climate.growingSeason,
    charts: {
      climate: monthlyClimateChart(temps, rain),
    },
  };

  // ── Biodiversity ──
  const bNarr = safe(narr.biodiversity);
  const groups = safeArr(sp.groups).map(g => ({
    group: g.group || g.name || g.label || '',
    count: g.count || g.value || 0,
  }));
  const top10 = safeArr(sp.top10).map(s => ({
    name: s.name || s.species || '',
    group: s.group || s.kingdom || '',
    threatened: !!s.threatened,
  }));

  const biodiversity = {
    intro: bNarr.intro || '',
    total: sp.total,
    threatened: sp.threatened,
    gbifTotal: sp.gbifTotal,
    groups,
    top10,
    charts: {
      species: speciesBarChart(groups),
    },
  };

  // ── Agriculture ──
  const agNarr = safe(narr.agriculture);
  const systems = safeArr(ag.systems).map((s, i) => {
    const colors = ['bg-brand-forest', 'bg-brand-sage', 'bg-brand-amber'];
    return {
      name: s.name || s.system || '',
      description: s.description || s.detail || '',
      suitability: s.suitability || s.rating || '',
      bgClass: colors[i] || 'bg-brand-sage',
    };
  });

  const agriculture = {
    potential: agNarr.potential || '',
    landCover: ag.landCover || '',
    systems,
    topSystems: systems.slice(0, 3),
  };

  // ── Opportunities ──
  const oppNarr = safe(narr.opportunities);
  const rev = safe(eco.revenueScenarios);
  const opportunities = {
    comparison: oppNarr.comparison || '',
    carbonStock: eco.carbonStock,
    carbonCreditValue: eco.carbonCreditValue,
    conservative: rev.conservative,
    moderate: rev.moderate,
    optimized: rev.optimized,
    details: safeArr(rev.details).map(item => ({
      name: item.name || item.label || '',
      value: item.value || item.estimate,
    })),
  };

  // ── Risks ──
  const rNarr = safe(narr.risks);
  const risks = {
    narrative: rNarr.narrative || '',
    recommendation: rNarr.recommendation || '',
    activeFires: safe(fire.activeFires),
    hasActiveFires: safe(fire.activeFires).count != null,
    fire: { riskScore: fire.riskScore, riskLevel: fire.riskLevel },
    flood: { riskScore: flood.riskScore, riskLevel: flood.riskLevel },
    drought: { riskScore: drought.riskScore, riskLevel: drought.riskLevel },
    gauges: {
      fire: gaugeArcSvg(fire.riskScore, 5, '#C4705A', 'Fire Risk'),
      flood: gaugeArcSvg(flood.riskScore, 5, '#D4A574', 'Flood Risk'),
      drought: gaugeArcSvg(drought.riskScore, 5, '#3f6653', 'Drought Risk'),
    },
  };

  // ── Resilience ──
  const resNarr = safe(narr.resilience);
  const energySources = [
    { label: 'Solar', icon: 'solar_power', level: safe(energy.solar).level || safe(energy.solar).score || energy.solar, detail: safe(energy.solar).detail || '' },
    { label: 'Wind', icon: 'air', level: safe(energy.wind).level || safe(energy.wind).score || energy.wind, detail: safe(energy.wind).detail || '' },
    { label: 'Micro-Hydro', icon: 'water', level: safe(energy.microHydro).level || safe(energy.microHydro).score || energy.microHydro, detail: safe(energy.microHydro).detail || '' },
    { label: 'Biomass', icon: 'compost', level: safe(energy.biomass).level || safe(energy.biomass).score || energy.biomass, detail: safe(energy.biomass).detail || '' },
  ];

  const resilience = {
    narrative: resNarr.narrative || '',
    recommendation: resNarr.recommendation || '',
    independenceScore: energy.independenceScore,
    sources: energySources,
  };

  // ── Context ──
  const ctxNarr = safe(narr.context);
  const contextDimensions = [
    {
      label: 'Water Security', icon: 'water_drop',
      value: w.securityIndex, sublabel: '/ 10',
      headline: 'Hydrological resilience',
      description: ctxNarr.narrative ? '' : `Springs: ${w.springs ?? '\u2014'}, Wells: ${w.wells ?? '\u2014'}, Waterways: ${w.waterways ?? '\u2014'}`,
    },
    {
      label: 'Soil Health', icon: 'landscape',
      value: scores.soil, sublabel: 'soil health',
      headline: 'Edaphic foundation',
      description: `pH ${soil.ph != null ? soil.ph.toFixed(1) : '\u2014'}, Organic carbon ${soil.organicCarbon != null ? soil.organicCarbon + ' g/kg' : '\u2014'}, Clay ${soil.clay != null ? soil.clay + '%' : '\u2014'}`,
    },
    {
      label: 'Biodiversity', icon: 'forest',
      value: sp.total, sublabel: 'species',
      headline: 'Biological richness',
      description: safeArr(sp.groups).map(g => `${g.group || g.name || ''}: ${g.count || g.value || 0}`).join(', '),
    },
    {
      label: 'Climate', icon: 'thermostat',
      value: climate.annualMeanTemp != null ? climate.annualMeanTemp.toFixed(1) + '\u00b0' : null,
      sublabel: 'annual mean',
      headline: 'Climatic envelope',
      description: `Rainfall: ${climate.annualRainfall != null ? Math.round(climate.annualRainfall) + ' mm' : '\u2014'}, Growing season: ${climate.growingSeason != null ? climate.growingSeason + ' days' : '\u2014'}`,
    },
  ];

  const context = {
    narrative: ctxNarr.narrative || 'Raw numbers are hard to interpret. We compare your parcel to the bioregion\u2014so you see what\u2019s typical, what\u2019s exceptional, and what to do about it.',
    dimensions: contextDimensions,
  };

  // ── Trends ──
  const trNarr = safe(narr.temporal);
  const npvScenarios = safeArr(safe(eco.npv).scenarios).map(s => ({
    name: s.name || s.label || '',
    value: s.value || s.npv,
  }));
  const fireProneByDecade = safeArr(trends.fireProneByDecade).map(t => ({
    decade: t.decade || t.label || '',
    days: t.avgDays || t.days || t.value,
  }));

  const trendsData = {
    dynamics: trNarr.dynamics || '',
    tempPerDecade: trends.tempPerDecade,
    precipPerDecade: trends.precipPerDecade,
    npvScenarios,
    fireProneByDecade,
  };

  // ── Maps ──
  const mapEntries = [
    { key: 'satellite', title: 'Satellite View', icon: 'satellite_alt', src: maps.satellite || null },
    { key: 'overview', title: 'Overview', icon: 'map', src: maps.overview || null },
    { key: 'regional', title: 'Regional Context', icon: 'public', src: maps.regional || null },
    { key: 'detail', title: 'Property Detail', icon: 'zoom_in_map', src: maps.detail || null },
  ];

  // ── Compliance ──
  const compNarr = safe(narr.compliance);
  const complianceData = {
    status: compNarr.status || '',
    pullQuote: compNarr.pullQuote || '',
    items: safeArr(comp.items).map(item => ({
      name: item.name || item.regulation || '',
      status: item.status || '',
      detail: item.detail || item.description || '',
    })),
    timeline: safeArr(comp.timeline).map(t => ({
      date: t.date || '',
      event: t.event || t.description || '',
    })),
  };

  // ── Actions (Next Steps) ──
  const actNarr = safe(narr.actions);
  const actions = {
    recommendation: actNarr.recommendation || actNarr.narrative || '',
    immediate: safeArr(actNarr.immediate || safe(d.actions).immediate).map(a => ({
      title: a.title || a.action || '',
      detail: a.detail || a.description || '',
    })),
    shortTerm: safeArr(actNarr.shortTerm || safe(d.actions).shortTerm).map(a => ({
      title: a.title || a.action || '',
      detail: a.detail || a.description || '',
    })),
    longTerm: safeArr(actNarr.longTerm || safe(d.actions).longTerm).map(a => ({
      title: a.title || a.action || '',
      detail: a.detail || a.description || '',
    })),
  };

  // ── Methodology ──
  const methodologySources = [
    { name: 'Open-Meteo', description: 'Weather forecast, historical climate, elevation' },
    { name: 'SoilGrids / ISRIC', description: 'Soil properties and WRB classification' },
    { name: 'Macrostrat', description: 'Geological data' },
    { name: 'iNaturalist', description: 'Species observations and biodiversity data' },
    { name: 'GBIF', description: 'Global biodiversity occurrence data' },
    { name: 'OpenStreetMap (Overpass)', description: 'Water features, infrastructure, protected areas' },
    { name: 'Mapbox', description: 'Geocoding and static map imagery' },
    { name: 'Nominatim', description: 'Reverse geocoding' },
    { name: 'GloFAS', description: 'Global flood awareness system' },
  ];

  return {
    cover,
    glance,
    ecosystemServices,
    scorecard,
    terrain: terrainData,
    water: waterData,
    climate: climateData,
    biodiversity,
    agriculture,
    opportunities,
    risks,
    resilience,
    context,
    trends: trendsData,
    maps: { entries: mapEntries },
    compliance: complianceData,
    actions,
    methodology: { sources: methodologySources, generatedAt: meta.generatedAt, version: meta.version },
    meta,
  };
}
