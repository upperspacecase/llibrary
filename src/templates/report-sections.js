/**
 * LandBook Report — Section Renderers
 * 18 named exports (one per A4 page) + default renderAllSections.
 */

import { TOKENS, escHtml, fmt } from './report-design-system.js';
import {
  horizontalBarChart,
  stackedBarChart,
  radarChart,
  monthlyClimateChart,
  riskBarChart,
  speciesBarChart,
  percentileChart,
  energyBarChart,
} from '../lib/report-charts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskBadge(level) {
  if (!level) return '';
  const l = String(level).toLowerCase();
  if (l === 'low' || l === 'very low') return `<span class="badge badge-success">${escHtml(level)}</span>`;
  if (l === 'moderate') return `<span class="badge badge-warning">${escHtml(level)}</span>`;
  return `<span class="badge badge-danger">${escHtml(level)}</span>`;
}

function safeArr(v) { return Array.isArray(v) ? v : []; }
function safeObj(v) { return v && typeof v === 'object' ? v : {}; }

// ---------------------------------------------------------------------------
// 0 — Cover
// ---------------------------------------------------------------------------

export function renderCover(d) {
  const p = safeObj(d.property);
  const coords = safeObj(p.coords);
  const eco = safeObj(d.economics);
  const scores = safeObj(d.scores);
  const maps = safeObj(d.maps);
  const meta = safeObj(d.meta);

  return `
<div class="cover">
  ${maps.satellite ? `<img class="cover-bg" src="${escHtml(maps.satellite)}" alt="Satellite view" />` : ''}
  <div class="cover-overlay"></div>

  <div class="cover-wordmark">
    <h1>LandBook</h1>
    <p>Natural Capital Assessment</p>
  </div>

  <div class="cover-coordinates">
    ${fmt(coords.lat, v => v.toFixed(4))}${coords.lat != null && coords.lng != null ? ', ' : ''}${fmt(coords.lng, v => v.toFixed(4))}
  </div>

  <div class="cover-content">
    <div class="cover-property-name">${escHtml(p.name)}</div>
    <div class="cover-location">${escHtml(p.address)}</div>
    <div class="cover-meta">
      <span>${fmt(p.area, v => v.toLocaleString() + ' ha', 'Property', 'area')}</span>
      <span>${fmt(eco.valuePerHa, v => '\u20ac' + v.toLocaleString() + '/ha', 'Economics')}</span>
      <span>NCS ${fmt(scores.naturalCapital, v => v + '/100', 'Scores')}</span>
    </div>
  </div>

  <div class="cover-date">
    ${fmt(meta.generatedAt, v => v)} &middot; ${fmt(meta.version)}
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// 1 — Property at a Glance
// ---------------------------------------------------------------------------

export function renderGlance(d) {
  const p = safeObj(d.property);
  const scores = safeObj(d.scores);
  const eco = safeObj(d.economics);
  const reg = safeObj(scores.regional);
  const narr = safeObj(safeObj(d.narratives).executiveSummary);

  const chartItems = [
    { label: 'Carbon', value: scores.carbon || 0, avg: reg.carbon || 0 },
    { label: 'Biodiversity', value: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
    { label: 'Water', value: scores.water || 0, avg: reg.water || 0 },
    { label: 'Soil', value: scores.soil || 0, avg: reg.soil || 0 },
    { label: 'Pollination', value: scores.pollination || 0, avg: reg.pollination || 0 },
  ];

  return `
<div class="a4">
  <h1 class="section-title">Property at a Glance</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.intro)}</p>
  </div>

  <div class="metrics-row">
    <div class="metric">
      <span class="metric-value">${fmt(p.area, v => v.toLocaleString())}</span>
      <span class="metric-label">Hectares</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(eco.valuePerHa, v => '\u20ac' + v.toLocaleString())}</span>
      <span class="metric-label">Value / ha</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(scores.biodiversity, v => v)}</span>
      <span class="metric-label">Biodiversity Score</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(safeObj(d.water).securityIndex, v => v)}</span>
      <span class="metric-label">Water Security</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(eco.carbonStock, v => v.toLocaleString())}</span>
      <span class="metric-label">Carbon Stock (tC)</span>
    </div>
  </div>

  <div class="chart-container">
    ${horizontalBarChart(chartItems)}
    <div class="chart-caption">Natural capital dimensions compared with regional averages</div>
  </div>

  ${narr.pullQuote ? `<blockquote class="pull-quote">${escHtml(narr.pullQuote)}</blockquote>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// 2 — What This Land Provides
// ---------------------------------------------------------------------------

export function renderEcosystemServices(d) {
  const eco = safeObj(d.economics);
  const es = safeObj(eco.ecosystemServices);
  const narr = safeObj(safeObj(d.narratives).ecosystemServices);

  const segments = [
    { label: 'Water', value: es.water || 0 },
    { label: 'Food', value: es.food || 0 },
    { label: 'Carbon', value: es.carbon || 0 },
    { label: 'Regulation', value: es.regulation || 0 },
    { label: 'Soil', value: es.soil || 0 },
    { label: 'Cultural', value: es.cultural || 0 },
  ];

  return `
<div class="a4">
  <h1 class="section-title">What This Land Provides</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.intro)}</p>
  </div>

  <div class="big-number">
    <span class="big-number-label">30-Year Net Present Value</span>
    <span class="big-number-value">${fmt(safeObj(eco.npv).thirtyYear, v => '\u20ac' + v.toLocaleString(), 'Economics')}</span>
    <span class="big-number-note">Discounted ecosystem service value over three decades</span>
  </div>

  <div class="chart-container">
    ${stackedBarChart(segments, es.total || 0)}
    <div class="chart-caption">Annual ecosystem services value breakdown</div>
  </div>

  <table>
    <thead><tr><th>Service</th><th>Annual Value</th><th>Share</th></tr></thead>
    <tbody>
      ${segments.map(s => {
        const share = es.total ? ((s.value / es.total) * 100).toFixed(1) : 0;
        return `<tr><td>${escHtml(s.label)}</td><td>${fmt(s.value, v => '\u20ac' + v.toLocaleString())}</td><td>${share}%</td></tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 3 — How This Land Performs
// ---------------------------------------------------------------------------

export function renderScorecard(d) {
  const scores = safeObj(d.scores);
  const reg = safeObj(scores.regional);
  const narr = safeObj(safeObj(d.narratives).scorecard);

  const dims = [
    { label: 'Carbon', score: scores.carbon || 0, avg: reg.carbon || 0 },
    { label: 'Biodiversity', score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
    { label: 'Water', score: scores.water || 0, avg: reg.water || 0 },
    { label: 'Soil', score: scores.soil || 0, avg: reg.soil || 0 },
    { label: 'Pollination', score: scores.pollination || 0, avg: reg.pollination || 0 },
  ];

  return `
<div class="a4">
  <h1 class="section-title">How This Land Performs</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.text)}</p>
  </div>

  <div class="chart-container">
    ${radarChart(dims)}
    <div class="chart-caption">Natural capital scorecard vs regional average</div>
  </div>

  <table>
    <thead><tr><th>Dimension</th><th>Score</th><th>Regional Avg</th><th>Difference</th></tr></thead>
    <tbody>
      ${dims.map(dim => {
        const diff = dim.score - dim.avg;
        const sign = diff > 0 ? '+' : '';
        return `<tr>
          <td>${escHtml(dim.label)}</td>
          <td>${fmt(dim.score, v => v + '/100')}</td>
          <td>${fmt(dim.avg, v => v + '/100')}</td>
          <td style="color:${diff >= 0 ? TOKENS.sage : TOKENS.terracotta}">${sign}${diff}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 4 — The Lay of the Land
// ---------------------------------------------------------------------------

export function renderTerrain(d) {
  const soil = safeObj(d.soil);
  const geo = safeObj(d.geology);
  const terrain = safeObj(d.terrain);
  const narr = safeObj(safeObj(d.narratives).terrain);

  return `
<div class="a4">
  <h1 class="section-title">The Lay of the Land</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.description)}</p>
  </div>

  <h2 class="subsection-title">Soil Properties</h2>
  <table>
    <thead><tr><th>Property</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Classification</td><td>${fmt(soil.classification)}</td></tr>
      <tr><td>pH</td><td>${fmt(soil.ph, v => v.toFixed(1))}</td></tr>
      <tr><td>Organic Carbon</td><td>${fmt(soil.organicCarbon, v => v + ' g/kg')}</td></tr>
      <tr><td>Clay / Sand / Silt</td><td>${fmt(soil.clay, v => v + '%')} / ${fmt(soil.sand, v => v + '%')} / ${fmt(soil.silt, v => v + '%')}</td></tr>
      <tr><td>Nitrogen</td><td>${fmt(soil.nitrogen, v => v + ' g/kg')}</td></tr>
      <tr><td>CEC</td><td>${fmt(soil.cec, v => v + ' cmol/kg')}</td></tr>
      <tr><td>Bulk Density</td><td>${fmt(soil.bulkDensity, v => v + ' g/cm\u00b3')}</td></tr>
    </tbody>
  </table>

  <h2 class="subsection-title">Geology</h2>
  <table>
    <thead><tr><th>Attribute</th><th>Detail</th></tr></thead>
    <tbody>
      <tr><td>Lithology</td><td>${fmt(geo.lithology)}</td></tr>
      <tr><td>Environment</td><td>${fmt(geo.environment)}</td></tr>
      <tr><td>Period</td><td>${fmt(geo.period)}</td></tr>
      <tr><td>Age</td><td>${fmt(geo.age)}</td></tr>
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 5 — Water
// ---------------------------------------------------------------------------

export function renderWater(d) {
  const w = safeObj(d.water);
  const fr = safeObj(w.floodRisk);
  const narr = safeObj(safeObj(d.narratives).water);

  return `
<div class="a4">
  <h1 class="section-title-large">Water</h1>

  ${narr.pullQuote ? `<blockquote class="pull-quote">${escHtml(narr.pullQuote)}</blockquote>` : ''}

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.narrative)}</p>
  </div>

  <h2 class="subsection-title">Water Features</h2>
  <table>
    <thead><tr><th>Feature</th><th>Value</th></tr></thead>
    <tbody>
      <tr><td>Springs</td><td>${fmt(w.springs)}</td></tr>
      <tr><td>Wells</td><td>${fmt(w.wells)}</td></tr>
      <tr><td>Waterways</td><td>${fmt(w.waterways)}</td></tr>
      <tr><td>Water Bodies</td><td>${fmt(w.waterBodies)}</td></tr>
      <tr><td>Security Index</td><td>${fmt(w.securityIndex, v => v + '/100')}</td></tr>
      <tr><td>Flood Discharge</td><td>${fmt(w.floodDischarge)}</td></tr>
      <tr><td>Flood Risk</td><td>${riskBadge(fr.level)} ${fmt(fr.score, v => v + '/10')}</td></tr>
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 6 — Climate
// ---------------------------------------------------------------------------

export function renderClimate(d) {
  const c = safeObj(d.climate);
  const narr = safeObj(safeObj(d.narratives).climate);

  const temps = safeArr(c.monthlyAvgHigh).length === 12 && safeArr(c.monthlyAvgLow).length === 12
    ? c.monthlyAvgHigh.map((h, i) => (h + c.monthlyAvgLow[i]) / 2)
    : safeArr(c.monthlyAvgHigh).length === 12
      ? c.monthlyAvgHigh
      : new Array(12).fill(0);

  const rain = safeArr(c.monthlyPrecip).length === 12 ? c.monthlyPrecip : new Array(12).fill(0);

  return `
<div class="a4">
  <h1 class="section-title-large">Climate</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.profile)}</p>
  </div>

  <div class="metrics-row">
    <div class="metric">
      <span class="metric-value">${fmt(c.annualMeanTemp, v => v.toFixed(1) + '\u00b0C')}</span>
      <span class="metric-label">Mean Temp</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(c.summerMean, v => v.toFixed(1) + '\u00b0C')}</span>
      <span class="metric-label">Summer</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(c.winterMean, v => v.toFixed(1) + '\u00b0C')}</span>
      <span class="metric-label">Winter</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(c.annualRainfall, v => Math.round(v) + ' mm')}</span>
      <span class="metric-label">Annual Rainfall</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(c.growingSeason, v => v + ' days')}</span>
      <span class="metric-label">Growing Season</span>
    </div>
  </div>

  <div class="chart-container">
    ${monthlyClimateChart(temps, rain)}
    <div class="chart-caption">Monthly average temperature and precipitation</div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// 7 — Biodiversity & Habitat Index
// ---------------------------------------------------------------------------

export function renderBiodiversity(d) {
  const sp = safeObj(d.species);
  const narr = safeObj(safeObj(d.narratives).biodiversity);
  const groups = safeArr(sp.groups);
  const top10 = safeArr(sp.top10);

  return `
<div class="a4">
  <h1 class="section-title">Biodiversity &amp; Habitat Index</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.intro)}</p>
  </div>

  <div class="chart-container">
    ${speciesBarChart(groups.map(g => ({ group: g.group || g.name || g.label || '', count: g.count || g.value || 0 })))}
    <div class="chart-caption">Species recorded by taxonomic group</div>
  </div>

  <table>
    <thead><tr><th>Species</th><th>Group</th><th>Status</th></tr></thead>
    <tbody>
      ${top10.map(s => `<tr>
        <td>${fmt(s.name || s.species)}</td>
        <td>${fmt(s.group || s.kingdom)}</td>
        <td>${s.threatened ? riskBadge('Critical') : riskBadge('Low')}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="metrics-row">
    <div class="metric">
      <span class="metric-value">${fmt(sp.total)}</span>
      <span class="metric-label">Total Species</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(sp.threatened)}</span>
      <span class="metric-label">Threatened</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(sp.gbifTotal)}</span>
      <span class="metric-label">GBIF Records</span>
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// 8 — Agriculture
// ---------------------------------------------------------------------------

export function renderAgriculture(d) {
  const ag = safeObj(d.agriculture);
  const narr = safeObj(safeObj(d.narratives).agriculture);
  const systems = safeArr(ag.systems);

  return `
<div class="a4">
  <h1 class="section-title-large">Agriculture</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.potential)}</p>
  </div>

  <h2 class="subsection-title">Land Cover</h2>
  <p>${fmt(ag.landCover)}</p>

  <h2 class="subsection-title">Agricultural Systems</h2>
  <table>
    <thead><tr><th>System</th><th>Description</th><th>Suitability</th></tr></thead>
    <tbody>
      ${systems.map(s => `<tr>
        <td>${fmt(s.name || s.system)}</td>
        <td>${fmt(s.description || s.detail)}</td>
        <td>${fmt(s.suitability || s.rating)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 9 — Opportunities
// ---------------------------------------------------------------------------

export function renderOpportunities(d) {
  const eco = safeObj(d.economics);
  const rev = safeObj(eco.revenueScenarios);
  const narr = safeObj(safeObj(d.narratives).opportunities);

  return `
<div class="a4">
  <h1 class="section-title-large">Opportunities</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.comparison)}</p>
  </div>

  <h2 class="subsection-title">Revenue Scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>Annual Revenue</th></tr></thead>
    <tbody>
      <tr><td>Conservative</td><td>${fmt(rev.conservative, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr><td>Moderate</td><td>${fmt(rev.moderate, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr><td>Optimized</td><td>${fmt(rev.optimized, v => '\u20ac' + v.toLocaleString())}</td></tr>
    </tbody>
  </table>

  <div class="metrics-row">
    <div class="metric">
      <span class="metric-value">${fmt(eco.totalValue, v => '\u20ac' + v.toLocaleString())}</span>
      <span class="metric-label">Total Property Value</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(eco.carbonStock, v => v.toLocaleString() + ' tC')}</span>
      <span class="metric-label">Carbon Stock</span>
    </div>
    <div class="metric">
      <span class="metric-value">${fmt(eco.carbonAnnualSeq, v => v.toLocaleString() + ' tC/yr')}</span>
      <span class="metric-label">Annual Sequestration</span>
    </div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// 10 — Risks
// ---------------------------------------------------------------------------

export function renderRisks(d) {
  const fire = safeObj(d.fire);
  const flood = safeObj(d.flood);
  const drought = safeObj(d.drought);
  const narr = safeObj(safeObj(d.narratives).risks);

  const risks = [
    { label: 'Fire', score: fire.riskScore || 0, maxScore: 10, color: TOKENS.terracotta },
    { label: 'Flood', score: flood.riskScore || 0, maxScore: 10, color: TOKENS.sage },
    { label: 'Drought', score: drought.riskScore || 0, maxScore: 10, color: TOKENS.sand },
  ];

  return `
<div class="a4">
  <h1 class="section-title-large">Risks</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.narrative)}</p>
  </div>

  <div class="chart-container">
    ${riskBarChart(risks)}
    <div class="chart-caption">Composite risk assessment</div>
  </div>

  <table>
    <thead><tr><th>Risk</th><th>Score</th><th>Level</th></tr></thead>
    <tbody>
      <tr><td>Fire</td><td>${fmt(fire.riskScore, v => v + '/10')}</td><td>${riskBadge(fire.riskLevel)}</td></tr>
      <tr><td>Flood</td><td>${fmt(flood.riskScore, v => v + '/10')}</td><td>${riskBadge(flood.riskLevel)}</td></tr>
      <tr><td>Drought</td><td>${fmt(drought.riskScore, v => v + '/10')}</td><td>${riskBadge(drought.riskLevel)}</td></tr>
    </tbody>
  </table>

  ${safeObj(fire.activeFires).count != null ? `<p class="mt-4 text-muted">Active fires within monitoring radius: <strong>${fmt(fire.activeFires.count)}</strong></p>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// 11 — Resilience
// ---------------------------------------------------------------------------

export function renderResilience(d) {
  const energy = safeObj(d.energy);
  const narr = safeObj(safeObj(d.narratives).resilience);

  const sources = [
    { label: 'Solar', potential: safeObj(energy.solar).score || 0 },
    { label: 'Wind', potential: safeObj(energy.wind).score || 0 },
    { label: 'Micro-Hydro', potential: safeObj(energy.microHydro).score || 0 },
    { label: 'Biomass', potential: safeObj(energy.biomass).score || 0 },
  ];

  return `
<div class="a4">
  <h1 class="section-title-large">Resilience</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.narrative)}</p>
  </div>

  <div class="chart-container">
    ${energyBarChart(sources)}
    <div class="chart-caption">Energy independence potential by source</div>
  </div>

  <h2 class="subsection-title">Energy Sources</h2>
  <table>
    <thead><tr><th>Source</th><th>Potential</th><th>Detail</th></tr></thead>
    <tbody>
      <tr><td>Solar</td><td>${fmt(safeObj(energy.solar).level)}</td><td>${fmt(safeObj(energy.solar).detail)}</td></tr>
      <tr><td>Wind</td><td>${fmt(energy.wind)}</td><td></td></tr>
      <tr><td>Micro-Hydro</td><td>${fmt(energy.microHydro)}</td><td></td></tr>
      <tr><td>Biomass</td><td>${fmt(energy.biomass)}</td><td></td></tr>
    </tbody>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// 12 — Context
// ---------------------------------------------------------------------------

export function renderContext(d) {
  const reg = safeObj(d.regional);
  const pctls = safeObj(reg.percentiles);
  const narr = safeObj(safeObj(d.narratives).context);

  const dimensions = [
    { label: 'Water', percentile: pctls.water || 0 },
    { label: 'Biodiversity', percentile: pctls.biodiversity || 0 },
    { label: 'Soil', percentile: pctls.soil || 0 },
    { label: 'Carbon', percentile: pctls.carbon || 0 },
    { label: 'Resilience', percentile: pctls.resilience || 0 },
  ];

  const protectedAreas = safeArr(reg.protectedAreas);

  return `
<div class="a4">
  <h1 class="section-title-large">Context</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.narrative)}</p>
  </div>

  <div class="chart-container">
    ${percentileChart(dimensions)}
    <div class="chart-caption">Performance vs regional benchmarks</div>
  </div>

  ${protectedAreas.length > 0 ? `
  <h2 class="subsection-title">Bioregion &amp; Protected Areas</h2>
  <table>
    <thead><tr><th>Name</th><th>Type</th><th>Distance</th></tr></thead>
    <tbody>
      ${protectedAreas.map(a => `<tr>
        <td>${fmt(a.name)}</td>
        <td>${fmt(a.type || a.designation)}</td>
        <td>${fmt(a.distance, v => v + ' km')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// 13 — Change Over Time
// ---------------------------------------------------------------------------

export function renderTrends(d) {
  const trends = safeObj(d.trends);
  const eco = safeObj(d.economics);
  const npvScenarios = safeArr(safeObj(eco.npv).scenarios);
  const narr = safeObj(safeObj(d.narratives).temporal);

  return `
<div class="a4">
  <h1 class="section-title">Change Over Time</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.dynamics)}</p>
  </div>

  <h2 class="subsection-title">Climate Trends</h2>
  <table>
    <thead><tr><th>Indicator</th><th>Trend</th></tr></thead>
    <tbody>
      <tr><td>Temperature</td><td>${fmt(trends.tempPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(2) + ' \u00b0C/decade')}</td></tr>
      <tr><td>Precipitation</td><td>${fmt(trends.precipPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(1) + ' mm/decade')}</td></tr>
    </tbody>
  </table>

  ${npvScenarios.length > 0 ? `
  <h2 class="subsection-title">NPV Scenarios</h2>
  <table>
    <thead><tr><th>Scenario</th><th>30-Year NPV</th></tr></thead>
    <tbody>
      ${npvScenarios.map(s => `<tr>
        <td>${fmt(s.name || s.label)}</td>
        <td>${fmt(s.value || s.npv, v => '\u20ac' + v.toLocaleString())}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${safeArr(trends.fireProneByDecade).length > 0 ? `
  <h2 class="subsection-title">Fire Risk Trend</h2>
  <table>
    <thead><tr><th>Decade</th><th>Fire-Prone Days</th></tr></thead>
    <tbody>
      ${trends.fireProneByDecade.map(t => `<tr>
        <td>${fmt(t.decade || t.label)}</td>
        <td>${fmt(t.days || t.value)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// 14 — Map Portfolio
// ---------------------------------------------------------------------------

export function renderMaps(d) {
  const maps = safeObj(d.maps);
  const mapEntries = [
    { key: 'satellite', title: 'Satellite View' },
    { key: 'overview', title: 'Overview' },
    { key: 'regional', title: 'Regional Context' },
    { key: 'detail', title: 'Property Detail' },
  ];

  let html = `
<div class="a4">
  <h1 class="section-title">Map Portfolio</h1>
  <p class="text-muted mb-8">The following pages present the property across multiple cartographic perspectives, from satellite imagery to regional context.</p>
</div>`;

  for (const entry of mapEntries) {
    const src = maps[entry.key];
    html += `
<div class="a4" style="padding:0;">
  <div class="map-page">
    <div class="map-title">${escHtml(entry.title)}</div>
    ${src ? `<img src="${escHtml(src)}" alt="${escHtml(entry.title)}" />` : `<p class="data-missing" title="Map not available">\u2014 Map not available \u2014</p>`}
  </div>
</div>`;
  }

  return html;
}

// ---------------------------------------------------------------------------
// 15 — Compliance
// ---------------------------------------------------------------------------

export function renderCompliance(d) {
  const comp = safeObj(d.compliance);
  const items = safeArr(comp.items);
  const timeline = safeArr(comp.timeline);
  const narr = safeObj(safeObj(d.narratives).compliance);

  return `
<div class="a4">
  <h1 class="section-title">Compliance</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.framework)}</p>
  </div>

  ${items.length > 0 ? `
  <h2 class="subsection-title">Regulatory Framework</h2>
  <table>
    <thead><tr><th>Regulation</th><th>Status</th><th>Notes</th></tr></thead>
    <tbody>
      ${items.map(i => `<tr>
        <td>${fmt(i.name || i.regulation)}</td>
        <td>${riskBadge(i.status || i.level)}</td>
        <td>${fmt(i.notes || i.detail)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${timeline.length > 0 ? `
  <h2 class="subsection-title">Timeline</h2>
  <ul class="timeline">
    ${timeline.map(t => `<li data-year="${escHtml(String(t.year || t.date))}">${escHtml(t.event || t.description)}</li>`).join('')}
  </ul>` : ''}
</div>`;
}

// ---------------------------------------------------------------------------
// 16 — What to Do Next
// ---------------------------------------------------------------------------

export function renderActions(d) {
  const actions = safeObj(d.actions);
  const narr = safeObj(safeObj(d.narratives).nextSteps);

  function actionTable(title, items) {
    const list = safeArr(items);
    if (!list.length) return '';
    return `
    <h2 class="subsection-title">${escHtml(title)}</h2>
    <table>
      <thead><tr><th>Action</th><th>Priority</th><th>Impact</th></tr></thead>
      <tbody>
        ${list.map(a => `<tr>
          <td>${fmt(a.action || a.name || a.description)}</td>
          <td>${fmt(a.priority)}</td>
          <td>${fmt(a.impact)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  return `
<div class="a4">
  <h1 class="section-title">What to Do Next</h1>

  <div class="two-column">
    <p class="drop-cap">${escHtml(narr.framing)}</p>
  </div>

  ${actionTable('Immediate Actions', actions.immediate)}
  ${actionTable('Short-Term Actions', actions.shortTerm)}
  ${actionTable('Long-Term Actions', actions.longTerm)}
</div>`;
}

// ---------------------------------------------------------------------------
// 17 — Methodology, Sources & Disclaimer
// ---------------------------------------------------------------------------

export function renderMethodology(d) {
  const narr = safeObj(safeObj(d.narratives).methodology);
  const meta = safeObj(d.meta);

  const sources = [
    { name: 'GBIF', description: 'Global Biodiversity Information Facility \u2014 species occurrence records' },
    { name: 'SoilGrids', description: 'ISRIC \u2014 global soil property predictions at 250m' },
    { name: 'ERA5', description: 'ECMWF \u2014 climate reanalysis data' },
    { name: 'Copernicus', description: 'EU Earth Observation \u2014 land cover, fire, flood monitoring' },
    { name: 'OpenStreetMap', description: 'Community-mapped water features and infrastructure' },
    { name: 'FIRMS', description: 'NASA Fire Information for Resource Management System' },
    { name: 'Macrostrat', description: 'Geological data integration platform' },
    { name: 'Protected Planet', description: 'IUCN/UNEP-WCMC \u2014 protected area boundaries' },
  ];

  return `
<div class="a4">
  <h1 class="section-title">Methodology, Sources &amp; Disclaimer</h1>

  <h2 class="subsection-title">Data Sources</h2>
  <table>
    <thead><tr><th>Source</th><th>Description</th></tr></thead>
    <tbody>
      ${sources.map(s => `<tr><td>${escHtml(s.name)}</td><td>${escHtml(s.description)}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="two-column mt-8">
    <p>${escHtml(narr.text)}</p>
  </div>

  <blockquote class="pull-quote">${escHtml(narr.disclaimer)}</blockquote>

  <div class="mt-8 text-center text-muted" style="border-top: 0.5pt solid ${TOKENS.outlineVariant}; padding-top: 5mm;">
    <p class="micro-label">LandBook Natural Capital Assessment</p>
    <p style="font-size:9pt; margin-top:2mm;">Generated ${fmt(meta.generatedAt)} &middot; ${fmt(meta.version)}</p>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Default — Render All Sections
// ---------------------------------------------------------------------------

export default function renderAllSections(reportData) {
  const d = reportData || {};
  return [
    renderCover(d),
    renderGlance(d),
    renderEcosystemServices(d),
    renderScorecard(d),
    renderTerrain(d),
    renderWater(d),
    renderClimate(d),
    renderBiodiversity(d),
    renderAgriculture(d),
    renderOpportunities(d),
    renderRisks(d),
    renderResilience(d),
    renderContext(d),
    renderTrends(d),
    renderMaps(d),
    renderCompliance(d),
    renderActions(d),
    renderMethodology(d),
  ].join('\n');
}
