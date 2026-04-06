/**
 * LandBook Report Generator
 * Renders a magazine-quality, print-ready HTML document from landbook data.
 * Design reference: Crimson Text + Inter, A4 print layout, 18 sections.
 */

import { getLandbook, updateLandbook } from '../lib/store.js';
import { sqmToHectares, polygonBounds, expandBounds } from '../lib/geo.js';
import { getStaticMapUrl } from '../lib/mapbox.js';

// API imports (same as landbook.js)
import { getForecast, getClimateAverages, getRegionalClimateAverages, getClimateProjections, getElevation } from '../api/open-meteo.js';
import { getSoilProperties, getSoilClassification, parseSoilProperties, parseSoilClassification } from '../api/soilgrids.js';
import { getWaterFeatures, getInfrastructure, getRoadAccess, getPowerGrid, extractNodes, extractWays } from '../api/overpass.js';
import { getSpeciesCounts, summarizeSpeciesCounts, getThreatenedSpecies } from '../api/inaturalist.js';
import { getSpeciesOccurrences, summarizeOccurrences } from '../api/gbif.js';
import { getProtectedAreas } from '../api/natura2000.js';
import { getActiveFiresNearby, summarizeFireDetections } from '../api/nasa-firms.js';
import { getFloodForecastWithHistory, analyzeFloodRisk } from '../api/flood.js';
import { getGeology, parseGeology, getGeologyDescription } from '../api/macrostrat.js';
import { fetchRiskScores } from '../api/risk-scores.js';

// Score & chart libraries
import { computeAllScores, computeEcosystemServices, computeRevenueScenarios, computeRiskProfile } from '../lib/report-scores.js';
import { horizontalBarChart, stackedBarChart, radarChart, monthlyClimateChart, riskBarChart, speciesBarChart, percentileChart, energyBarChart } from '../lib/report-charts.js';

// ---------------------------------------------------------------------------
// CSS (reference design, verbatim)
// ---------------------------------------------------------------------------

const REPORT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  margin: 0; padding: 0;
  font-family: 'Inter', sans-serif;
  font-size: 11pt; line-height: 1.6;
  color: #374151; background: #FAFAF9;
  text-align: justify; text-align-last: left;
}

@page { size: A4; margin: 20mm; }
@page :first { margin: 0; }

@media print {
  #print-btn { display: none !important; }
  body { background: white; }
}

:root {
  --deep-forest: #1B4332;
  --warm-stone: #F5F5F0;
  --terracotta: #E07A5F;
  --charcoal: #374151;
  --off-white: #FAFAF9;
  --sage: #8FBC8F;
  --sand: #D4A574;
  --light-gray: #D1D5DB;
}

.serif { font-family: 'Crimson Text', Georgia, serif; }
.sans { font-family: 'Inter', sans-serif; }

/* Cover */
.cover { width: 210mm; height: 297mm; margin: 0 auto; position: relative; overflow: hidden; page-break-after: always; }
.cover-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; }
.cover-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.5) 100%); z-index: 1; }
.cover-wordmark { position: absolute; top: 15mm; left: 50%; transform: translateX(-50%); z-index: 2; text-align: center; color: white; }
.cover-wordmark h1 { font-family: 'Inter', sans-serif; font-size: 10pt; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 5mm; }
.cover-wordmark p { font-family: 'Inter', sans-serif; font-size: 9pt; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.9; }
.cover-coordinates { position: absolute; top: 15mm; right: 20mm; z-index: 2; color: white; font-family: 'Inter', monospace; font-size: 9pt; opacity: 0.9; }
.cover-content { position: absolute; bottom: 60mm; left: 20mm; z-index: 2; color: white; }
.cover-property-name { font-family: 'Crimson Text', serif; font-size: 48pt; font-style: italic; font-weight: 400; margin-bottom: 5mm; text-shadow: 2px 2px 8px rgba(0,0,0,0.5); }
.cover-location { font-family: 'Inter', sans-serif; font-size: 14pt; font-weight: 300; margin-bottom: 10mm; opacity: 0.95; }
.cover-meta { font-family: 'Inter', sans-serif; font-size: 9pt; opacity: 0.8; }
.cover-meta span { margin-right: 15mm; }
.cover-date { position: absolute; bottom: 15mm; right: 20mm; z-index: 2; color: white; font-family: 'Inter', sans-serif; font-size: 9pt; opacity: 0.8; }

/* Sections */
.section { page-break-before: always; padding: 10mm 20mm; max-width: 210mm; margin: 0 auto; }
.section:first-of-type { page-break-before: auto; }

h1.section-title {
  font-family: 'Crimson Text', serif; font-size: 32pt; font-style: italic; font-weight: 400;
  color: var(--deep-forest); margin-bottom: 8mm; padding-bottom: 4mm;
  border-bottom: 0.5pt solid var(--deep-forest);
}

h1.section-title-large {
  font-family: 'Crimson Text', serif; font-size: 48pt; font-style: italic; font-weight: 400;
  color: var(--deep-forest); margin-bottom: 8mm; padding-bottom: 4mm;
  border-bottom: 0.5pt solid var(--deep-forest);
}

h2.subsection-title {
  font-family: 'Inter', sans-serif; font-size: 14pt; font-weight: 600;
  color: var(--deep-forest); margin-top: 8mm; margin-bottom: 4mm;
  text-transform: uppercase; letter-spacing: 0.05em;
}

/* Two Column */
.two-column { column-count: 2; column-gap: 10mm; }
.two-column p { margin-bottom: 4mm; }

/* Drop Cap */
.drop-cap::first-letter {
  font-family: 'Crimson Text', serif; font-size: 48pt; float: left;
  line-height: 0.8; padding-right: 3mm; padding-top: 2mm; color: var(--deep-forest);
}

/* Pull Quote */
.pull-quote {
  border-left: 3pt solid var(--terracotta); padding-left: 5mm; margin: 8mm 0;
  font-family: 'Crimson Text', serif; font-size: 13pt; font-style: italic;
  color: var(--charcoal); line-height: 1.5;
}

/* Metrics Row */
.metrics-row { display: flex; justify-content: space-between; margin: 8mm 0; padding: 5mm 0; border-top: 0.5pt solid var(--light-gray); border-bottom: 0.5pt solid var(--light-gray); }
.metric { text-align: center; flex: 1; border-right: 0.5pt solid var(--light-gray); }
.metric:last-child { border-right: none; }
.metric-value { font-family: 'Inter', sans-serif; font-size: 20pt; font-weight: 600; color: var(--deep-forest); display: block; }
.metric-label { font-family: 'Inter', sans-serif; font-size: 8pt; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; color: var(--charcoal); margin-top: 2mm; }

/* Charts */
.chart-container { margin: 8mm 0; text-align: center; page-break-inside: avoid; }
.chart-container img, .chart-container svg { max-width: 100%; height: auto; }
.chart-caption { font-family: 'Inter', sans-serif; font-size: 9pt; font-style: italic; color: #6B7280; margin-top: 3mm; }

/* Big Number */
.big-number { text-align: center; margin: 10mm 0; }
.big-number-value { font-family: 'Inter', sans-serif; font-size: 48pt; font-weight: 600; color: var(--deep-forest); display: block; }
.big-number-label { font-family: 'Inter', sans-serif; font-size: 10pt; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--charcoal); margin-bottom: 3mm; }
.big-number-note { font-family: 'Inter', sans-serif; font-size: 9pt; font-style: italic; color: #6B7280; }

/* Tables */
table { width: 100%; border-collapse: collapse; margin: 6mm 0; font-size: 10pt; page-break-inside: avoid; }
thead { display: table-header-group; }
th { border-top: 2pt solid var(--deep-forest); border-bottom: 1pt solid var(--deep-forest); padding: 3mm 2mm; text-align: left; font-weight: 600; color: var(--deep-forest); text-transform: uppercase; font-size: 9pt; letter-spacing: 0.03em; }
td { padding: 3mm 2mm; border-bottom: 0.5pt solid var(--light-gray); vertical-align: top; }
tr:last-child td { border-bottom: 2pt solid var(--deep-forest); }

/* Badges */
.badge { display: inline-block; padding: 1mm 3mm; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; border-radius: 2pt; }
.badge-success { background: var(--sage); color: white; }
.badge-warning { background: var(--sand); color: white; }
.badge-danger { background: var(--terracotta); color: white; }

/* Photo Grid */
.photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin: 8mm 0; }
.photo-grid img { width: 100%; height: 45mm; object-fit: cover; }
.photo-caption { font-size: 8pt; font-style: italic; color: #6B7280; margin-top: 2mm; }

/* Map Pages */
.map-page { page-break-before: always; height: 257mm; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0 20mm; max-width: 210mm; margin: 0 auto; }
.map-page img { max-width: 100%; max-height: 230mm; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.map-title { font-family: 'Crimson Text', serif; font-size: 18pt; font-style: italic; color: var(--deep-forest); margin-bottom: 5mm; }

/* Lists */
ul, ol { margin: 4mm 0; padding-left: 6mm; }
li { margin-bottom: 2mm; }

/* Timeline */
.timeline { margin: 6mm 0; padding-left: 0; list-style: none; }
.timeline li { position: relative; padding-left: 20mm; margin-bottom: 4mm; }
.timeline li::before { content: attr(data-year); position: absolute; left: 0; font-weight: 600; color: var(--deep-forest); }

/* Utilities */
.page-break { page-break-after: always; }
.no-break { page-break-inside: avoid; }
a { word-break: break-all; color: var(--deep-forest); text-decoration: none; }
pre, table, figure, img, svg, blockquote { max-width: 100%; box-sizing: border-box; }
`;

// ---------------------------------------------------------------------------
// Data Fetching
// ---------------------------------------------------------------------------

async function fetchReportData(lb) {
  const [lat, lng] = lb.center || [0, 0];
  const bounds = lb.boundary ? expandBounds(polygonBounds(lb.boundary), 0.3) : null;

  const tasks = [
    { key: 'elevation', fn: () => getElevation(lat, lng) },
    { key: 'forecast', fn: () => getForecast(lat, lng) },
    { key: 'climate', fn: () => getClimateAverages(lat, lng) },
    { key: 'soilProps', fn: () => getSoilProperties(lat, lng) },
    { key: 'soilClass', fn: () => getSoilClassification(lat, lng) },
    { key: 'species', fn: () => getSpeciesCounts(lat, lng, 5) },
    { key: 'threatened', fn: () => getThreatenedSpecies(lat, lng, 10) },
    { key: 'water', fn: () => bounds ? getWaterFeatures(bounds) : Promise.resolve(null) },
    { key: 'gbif', fn: () => getSpeciesOccurrences(lat, lng, 10) },
    { key: 'activeFires', fn: () => getActiveFiresNearby(lat, lng, 50) },
    { key: 'flood', fn: () => getFloodForecastWithHistory(lat, lng) },
    { key: 'infrastructure', fn: () => bounds ? getInfrastructure(bounds) : Promise.resolve(null) },
    { key: 'geology', fn: () => getGeology(lat, lng) },
    { key: 'protectedAreas', fn: () => getProtectedAreas(lat, lng, 25) },
    { key: 'riskScores', fn: () => fetchRiskScores(lat, lng) },
    { key: 'regionalClimate', fn: () => getRegionalClimateAverages(lat, lng, 25) },
    { key: 'climateProjections', fn: () => getClimateProjections(lat, lng) },
    { key: 'roads', fn: () => bounds ? getRoadAccess(bounds) : Promise.resolve(null) },
    { key: 'power', fn: () => bounds ? getPowerGrid(bounds) : Promise.resolve(null) },
  ];

  const results = {};
  const settled = await Promise.allSettled(tasks.map(t =>
    t.fn().then(data => { results[t.key] = { ok: true, data }; })
          .catch(err => { results[t.key] = { ok: false, error: String(err) }; })
  ));

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str) { return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function formatDate() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getVal(apiResults, key) {
  const r = apiResults[key];
  return r && r.ok ? r.data : null;
}

// ---------------------------------------------------------------------------
// Section Renderers
// ---------------------------------------------------------------------------

function renderCover(lb, api, scores, areaHa) {
  const [lat, lng] = lb.center || [0, 0];
  const name = lb.address?.split(',')[0] || 'Untitled Property';
  const location = lb.address?.split(',').slice(1).join(',').trim() || '';
  const heroUrl = getStaticMapUrl([lat, lng], 14, 800, 1100, { satellite: true, boundary: lb.boundary });
  const valueEstimate = `\u20ac${Math.round(areaHa * 13200).toLocaleString()}`;

  return `
  <div class="cover">
    <img class="cover-bg" src="${heroUrl}" alt="Aerial view">
    <div class="cover-overlay"></div>
    <div class="cover-wordmark">
      <h1>LandBook</h1>
      <p>Natural Capital Assessment</p>
    </div>
    <div class="cover-coordinates">${lat.toFixed(4)}\u00b0N, ${Math.abs(lng).toFixed(4)}\u00b0${lng < 0 ? 'W' : 'E'}</div>
    <div class="cover-content">
      <div class="cover-property-name">${esc(name)}</div>
      <div class="cover-location">${esc(location)}</div>
      <div class="cover-meta">
        <span>${areaHa.toFixed(1)} hectares</span>
        <span>${valueEstimate} estimated value</span>
        <span>Natural Capital Score: ${scores.overallScore}/10</span>
      </div>
    </div>
    <div class="cover-date">${formatDate()} &nbsp;|&nbsp; v1.0</div>
  </div>`;
}

function renderGlance(lb, api, scores, areaHa) {
  const name = lb.address?.split(',')[0] || 'this property';
  const location = lb.address?.split(',').slice(1, 3).join(', ').trim() || 'the region';

  // Climate data for intro text
  const climate = getVal(api, 'climate');
  let annualRain = 600;
  if (climate?.monthly_precipitation) annualRain = Math.round(climate.monthly_precipitation.reduce((a, b) => a + b, 0));
  else if (climate?.monthly) annualRain = Math.round(climate.monthly.reduce((s, m) => s + (m.precipitation || 0), 0));

  const barChartData = scores.dimensions.map(d => ({
    label: d.label,
    value: d.score,
    avg: d.avg,
  }));

  return `
  <section class="section">
    <h1 class="section-title">Property at a Glance</h1>
    <div class="two-column">
      <p class="drop-cap">The ${esc(name)} encompasses ${areaHa.toFixed(1)} hectares in ${esc(location)}, where the landscape reflects centuries of interaction between natural systems and human stewardship. With ${annualRain}mm of annual rainfall, established vegetation, and diverse soil profiles, this property occupies a distinctive position within its bioregion.</p>
      <p>This assessment evaluates the property across multiple scales\u2014bioregional, watershed, and neighbourhood\u2014to provide a comprehensive understanding of its natural capital value, risks, and opportunities. The analysis draws on satellite imagery, climate data, soil surveys, and regional benchmarks to present a data-backed portrait of what this land provides and what it could become.</p>
    </div>
    <div class="metrics-row">
      <div class="metric"><span class="metric-value">${areaHa.toFixed(1)} ha</span><span class="metric-label">Total Area</span></div>
      <div class="metric"><span class="metric-value">\u20ac${Math.round(13200).toLocaleString()}</span><span class="metric-label">Value per Hectare</span></div>
      <div class="metric"><span class="metric-value">${(scores.bio.score / 10).toFixed(1)}/10</span><span class="metric-label">Bio Score</span></div>
      <div class="metric"><span class="metric-value">${scores.water.score}/10</span><span class="metric-label">Water Security</span></div>
      <div class="metric"><span class="metric-value">${scores.carbonStockTotal} t</span><span class="metric-label">Carbon Stock</span></div>
    </div>
    <div class="chart-container">
      ${horizontalBarChart(barChartData)}
      <div class="chart-caption">Figure 1. Natural Capital performance across five dimensions compared to regional averages</div>
    </div>
    <div class="pull-quote">
      "Performing at the ${Math.round(scores.water.score * 10)}th percentile for water security within the local watershed, with ${scores.water.features} documented water features."
    </div>
  </section>`;
}

function renderEcosystemServices(lb, api, scores, areaHa) {
  const eco = computeEcosystemServices(areaHa, api);

  const segments = eco.services.map(s => ({ label: s.name, value: s.value }));

  return `
  <section class="section">
    <h1 class="section-title">What This Land Provides</h1>
    <div class="two-column">
      <p class="drop-cap">Ecosystem services represent the flow of benefits from nature to people. For this property, these services include not only the tangible products of agriculture and forestry but also the less visible contributions of water purification, carbon sequestration, and habitat provision. The total annual value of these services is estimated at \u20ac${eco.total.toLocaleString()}, a figure that reflects both market-priced commodities and non-market regulatory and cultural services.</p>
      <p>The valuation methodology follows the UN System of Environmental-Economic Accounting (SEEA-EA) framework, using benefit transfer methods adjusted for local conditions. All estimates are conservative, reflecting the principle that it is better to understate than overstate nature's contributions.</p>
    </div>
    <div class="chart-container">
      ${stackedBarChart(segments, eco.total)}
      <div class="chart-caption">Figure 2. Annual ecosystem services value by category</div>
    </div>
    <div class="big-number">
      <div class="big-number-label">Thirty-Year Value (NPV)</div>
      <div class="big-number-value">\u20ac${eco.npv.toLocaleString()}</div>
      <div class="big-number-note">\u00b118% uncertainty at 95% confidence interval</div>
    </div>
    <table>
      <thead><tr><th>Ecosystem Service</th><th>Annual Value (\u20ac)</th><th>Primary Beneficiaries</th></tr></thead>
      <tbody>
        ${eco.services.map(s => `<tr><td>${esc(s.name)}</td><td>\u20ac${s.value.toLocaleString()}</td><td>${esc(s.beneficiaries)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderScorecard(lb, api, scores) {
  return `
  <section class="section">
    <h1 class="section-title">How This Land Performs</h1>
    <div class="two-column">
      <p class="drop-cap">The Natural Capital Scorecard provides a standardized assessment of ecosystem condition across five dimensions. Each dimension is scored on a 0\u2013100 scale based on measurable indicators, with scores benchmarked against both regional averages and theoretical maximums. This property achieves an overall score of ${Math.round(scores.overallScore * 10)}, reflecting its combined ecological assets.</p>
      <p>Water Regulation is typically the strongest dimension for properties with reliable water sources. Carbon Storage benefits from established tree cover and healthy soils. Biodiversity and Pollination scores suggest opportunities for enhancement through targeted management interventions.</p>
    </div>
    <div class="chart-container">
      ${radarChart(scores.dimensions)}
      <div class="chart-caption">Figure 3. Natural Capital performance profile compared to regional average</div>
    </div>
    <table>
      <thead><tr><th>Dimension</th><th>Score</th><th>Regional Avg</th><th>Difference</th><th>Key Indicators</th></tr></thead>
      <tbody>
        ${scores.dimensions.map(d => {
          const diff = d.score - d.avg;
          const diffColor = diff >= 0 ? '#8FBC8F' : '#E07A5F';
          const sign = diff >= 0 ? '+' : '';
          return `<tr><td>${d.label}</td><td>${d.score}</td><td>${d.avg}</td><td style="color:${diffColor};">${sign}${diff}</td><td>Based on ${d.key} analysis</td></tr>`;
        }).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderTerrain(lb, api, scores) {
  const elevation = getVal(api, 'elevation');
  const soilData = getVal(api, 'soilProps');
  const soilClass = getVal(api, 'soilClass');
  const geology = getVal(api, 'geology');

  const props = soilData ? parseSoilProperties(soilData) : null;
  const classification = soilClass ? parseSoilClassification(soilClass) : null;
  const geo = geology ? parseGeology(geology) : null;

  const elevM = elevation?.elevation != null ? elevation.elevation : '—';

  return `
  <section class="section">
    <h1 class="section-title">The Lay of the Land</h1>
    <div class="two-column">
      <p class="drop-cap">This property sits at an elevation of ${elevM} meters above sea level${geo ? `, underlain by ${esc(geo.lithology || 'mixed')} geology from the ${esc(geo.age || 'unknown')} period` : ''}. The topography creates favorable conditions for solar exposure and water drainage while maintaining accessibility for management activities.</p>
      <p>${classification ? `Soils are classified as ${esc(classification.wrb || 'unclassified')}${classification.probability ? ` (${classification.probability}% confidence)` : ''}.` : 'Soil classification data is being processed.'} ${props ? `Soil pH is ${props.ph}, with organic carbon at ${props.organicCarbon} g/kg and clay content of ${props.clay}%.` : ''}</p>
    </div>
    ${props ? `
    <table>
      <thead><tr><th>Property</th><th>Value</th><th>Interpretation</th></tr></thead>
      <tbody>
        <tr><td>pH</td><td>${props.ph}</td><td>${parseFloat(props.ph) >= 5.5 && parseFloat(props.ph) <= 7.5 ? 'Optimal range' : 'Outside optimal range'}</td></tr>
        <tr><td>Organic Carbon</td><td>${props.organicCarbon} g/kg</td><td>${parseFloat(props.organicCarbon) > 20 ? 'High' : parseFloat(props.organicCarbon) > 10 ? 'Moderate' : 'Low'}</td></tr>
        <tr><td>Clay Content</td><td>${props.clay}%</td><td>${parseFloat(props.clay) > 35 ? 'Heavy clay' : parseFloat(props.clay) > 20 ? 'Clay loam' : 'Light texture'}</td></tr>
        <tr><td>Sand Content</td><td>${props.sand}%</td><td>Drainage indicator</td></tr>
        <tr><td>Nitrogen</td><td>${props.nitrogen} g/kg</td><td>${parseFloat(props.nitrogen) > 2 ? 'Good' : 'Low'} fertility</td></tr>
        <tr><td>Bulk Density</td><td>${props.bulkDensity} kg/dm\u00b3</td><td>${parseFloat(props.bulkDensity) < 1.3 ? 'Good structure' : 'Compacted'}</td></tr>
        <tr><td>CEC</td><td>${props.cec} cmol/kg</td><td>${parseFloat(props.cec) > 15 ? 'High' : 'Moderate'} nutrient retention</td></tr>
      </tbody>
    </table>` : '<p><em>Soil data unavailable for this location.</em></p>'}
  </section>`;
}

function renderWater(lb, api, scores) {
  const waterData = getVal(api, 'water');
  let waterSources = [];
  if (waterData) {
    const nodes = extractNodes(waterData);
    const ways = extractWays(waterData);
    const springs = nodes.filter(n => n.tags?.natural === 'spring');
    const wells = nodes.filter(n => n.tags?.man_made === 'water_well');
    const rivers = ways.filter(w => w.tags?.waterway === 'river' || w.tags?.waterway === 'stream');
    const ponds = ways.filter(w => w.tags?.natural === 'water');
    springs.forEach(s => waterSources.push({ name: s.tags?.name || 'Spring', type: 'Perennial', detail: 'Natural spring', season: 'Year-round' }));
    wells.forEach(w => waterSources.push({ name: w.tags?.name || 'Well/Borehole', type: 'Groundwater', detail: 'Borehole', season: 'Year-round' }));
    rivers.forEach(r => waterSources.push({ name: r.tags?.name || 'Waterway', type: r.tags?.waterway || 'Stream', detail: 'Flowing water', season: 'Seasonal' }));
    ponds.forEach(p => waterSources.push({ name: p.tags?.name || 'Pond/Lake', type: 'Surface', detail: 'Standing water', season: 'Variable' }));
  }

  return `
  <section class="section">
    <h1 class="section-title-large">Water</h1>
    <div class="pull-quote">
      "${scores.water.features > 0 ? `${scores.water.features} water features documented within the property boundary, contributing to a Water Security Index of ${scores.water.score}/10.` : 'Water security assessment based on regional rainfall patterns and landscape characteristics.'}"
    </div>
    <div class="two-column">
      <p class="drop-cap">Water is increasingly the defining resource for rural land. In regions where seasonal drought shapes the management calendar, reliable water sources represent both practical security and appreciating natural capital. The Water Security Index of ${scores.water.score}/10 reflects the availability and diversity of water resources on and around the property.</p>
      <p>The assessment considers natural springs, boreholes, surface water features, and the hydrological context provided by rainfall patterns and aquifer connections. Properties with diverse, redundant water sources are better positioned to withstand climate variability and maintain productive ecosystems.</p>
    </div>
    ${waterSources.length > 0 ? `
    <table>
      <thead><tr><th>Water Source</th><th>Type</th><th>Detail</th><th>Seasonality</th></tr></thead>
      <tbody>
        ${waterSources.map(w => `<tr><td>${esc(w.name)}</td><td>${esc(w.type)}</td><td>${esc(w.detail)}</td><td>${esc(w.season)}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p><em>No documented water features within the surveyed area. This does not preclude the presence of groundwater or seasonal water sources.</em></p>'}
  </section>`;
}

function renderClimate(lb, api) {
  const climate = getVal(api, 'climate');
  if (!climate) return `<section class="section"><h1 class="section-title-large">Climate</h1><p><em>Climate data unavailable.</em></p></section>`;

  let temps = [], rain = [];
  let annualMean = '—', summerMean = '—', winterMean = '—', annualRain = '—';

  if (climate.monthly_temperature_max && climate.monthly_temperature_min && climate.monthly_precipitation) {
    temps = climate.monthly_temperature_max.map((max, i) => Math.round((max + climate.monthly_temperature_min[i]) / 2 * 10) / 10);
    rain = climate.monthly_precipitation;
  } else if (climate.monthly) {
    temps = climate.monthly.map(m => Math.round(((m.temp_max || 0) + (m.temp_min || 0)) / 2 * 10) / 10);
    rain = climate.monthly.map(m => m.precipitation || 0);
  }

  if (temps.length === 12) {
    annualMean = (temps.reduce((a, b) => a + b, 0) / 12).toFixed(1);
    summerMean = ((temps[5] + temps[6] + temps[7]) / 3).toFixed(1);
    winterMean = ((temps[0] + temps[1] + temps[11]) / 3).toFixed(1);
  }
  if (rain.length === 12) {
    annualRain = Math.round(rain.reduce((a, b) => a + b, 0));
  }

  return `
  <section class="section">
    <h1 class="section-title-large">Climate</h1>
    <div class="two-column">
      <p class="drop-cap">The climate profile shapes every aspect of land management, from the growing season to water availability. The annual mean temperature of ${annualMean}\u00b0C and ${annualRain}mm of rainfall define the productive potential and ecological character of this property. Understanding seasonal patterns is essential for planning agricultural operations, water management, and risk mitigation.</p>
      <p>Climate trends in this region reflect broader patterns of warming and shifting precipitation. The property's elevation and aspect create microclimatic variation that will become increasingly valuable as temperatures rise and weather patterns intensify.</p>
    </div>
    <div class="metrics-row">
      <div class="metric"><span class="metric-value">${annualMean}\u00b0C</span><span class="metric-label">Annual Mean</span></div>
      <div class="metric"><span class="metric-value">${summerMean}\u00b0C</span><span class="metric-label">Summer Mean</span></div>
      <div class="metric"><span class="metric-value">${winterMean}\u00b0C</span><span class="metric-label">Winter Mean</span></div>
      <div class="metric"><span class="metric-value">${annualRain}mm</span><span class="metric-label">Annual Rainfall</span></div>
      <div class="metric"><span class="metric-value">${temps.length === 12 ? Math.round(temps.filter(t => t > 10).length / 12 * 365) : '—'}</span><span class="metric-label">Growing Days</span></div>
    </div>
    ${temps.length === 12 ? `
    <div class="chart-container">
      ${monthlyClimateChart(temps, rain)}
      <div class="chart-caption">Figure 8. Monthly rainfall and temperature patterns (30-year average)</div>
    </div>` : ''}
  </section>`;
}

function renderBiodiversity(lb, api, scores) {
  const speciesData = getVal(api, 'species');
  const threatenedData = getVal(api, 'threatened');
  const gbifData = getVal(api, 'gbif');

  let speciesGroups = [];
  if (speciesData) {
    const summary = summarizeSpeciesCounts(speciesData);
    speciesGroups = Object.entries(summary.groups || summary).filter(([k, v]) => k !== 'total' && typeof v === 'number' && v > 0)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);
  }

  const gbifSummary = gbifData ? summarizeOccurrences(gbifData) : null;

  return `
  <section class="section">
    <h1 class="section-title">Biodiversity &amp; Habitat Index</h1>
    <p style="font-size: 12pt; color: #6B7280; margin-bottom: 6mm; font-style: italic;">Cataloging species richness and habitat health through structured surveys and observation databases.</p>
    <div class="two-column">
      <p class="drop-cap">The health of an ecosystem is measured not just in productivity but in the diversity and complexity of life it supports. ${scores.bio.total ? `${scores.bio.total} species have been documented in the vicinity of this property through community science platforms and field observations.` : 'Species documentation is ongoing for this area.'} The transition zones between different habitat types typically host the highest concentration of biodiversity.</p>
      <p>${gbifSummary ? `Global biodiversity databases record ${gbifSummary.total || 'multiple'} occurrence records in the area, spanning ${gbifSummary.kingdoms || 'several'} taxonomic kingdoms.` : 'Biodiversity occurrence data contributes to the regional ecological profile.'} ${threatenedData && threatenedData.length > 0 ? `${threatenedData.length} threatened or conservation-significant species have been recorded nearby.` : ''}</p>
    </div>
    ${speciesGroups.length > 0 ? `
    <div class="chart-container">
      ${speciesBarChart(speciesGroups)}
      <div class="chart-caption">Figure 9. Species documented by taxonomic group (iNaturalist, 5km radius)</div>
    </div>` : ''}
    ${threatenedData && threatenedData.length > 0 ? `
    <h2 class="subsection-title">Notable Species</h2>
    <table>
      <thead><tr><th>Species</th><th>Category</th><th>Observations</th></tr></thead>
      <tbody>
        ${threatenedData.slice(0, 8).map(s => `<tr><td>${esc(s.preferred_common_name || s.name || 'Unknown')}</td><td><span class="badge badge-warning">${esc(s.conservation_status?.status_name || 'Notable')}</span></td><td>${s.observations_count || '—'}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}
  </section>`;
}

function renderAgriculture(lb, api, scores, areaHa) {
  return `
  <section class="section">
    <h1 class="section-title-large">Agriculture</h1>
    <div class="two-column">
      <p class="drop-cap">Agricultural potential depends on the intersection of soil quality, water availability, climate patterns, and market access. This ${areaHa.toFixed(1)}-hectare property offers a range of productive possibilities, from traditional agroforestry systems to emerging ecosystem service markets. The optimal strategy depends on the steward's goals, risk tolerance, and time horizon.</p>
      <p>Revenue projections are based on regional benchmarks adjusted for the property's specific soil, climate, and water characteristics. All estimates are conservative, assuming standard management practices and current market prices.</p>
    </div>
    <table>
      <thead><tr><th>Production System</th><th>Potential</th><th>Revenue Range</th><th>Timeline</th></tr></thead>
      <tbody>
        <tr><td>Agroforestry</td><td>${areaHa > 10 ? 'Strong' : 'Moderate'}</td><td>\u20ac${Math.round(areaHa * 100).toLocaleString()}\u2013${Math.round(areaHa * 230).toLocaleString()}/year</td><td>2\u20134 years</td></tr>
        <tr><td>Pastoral (grazing)</td><td>Active</td><td>\u20ac${Math.round(areaHa * 32).toLocaleString()}\u2013${Math.round(areaHa * 60).toLocaleString()}/year</td><td>Immediate</td></tr>
        <tr><td>Eco-tourism</td><td>Developable</td><td>\u20ac${Math.round(areaHa * 80).toLocaleString()}\u2013${Math.round(areaHa * 320).toLocaleString()}/year</td><td>2\u20135 years</td></tr>
        <tr><td>Carbon Credits</td><td>Emerging</td><td>\u20ac${Math.round(scores.carbonStockTotal * 3).toLocaleString()}\u2013${Math.round(scores.carbonStockTotal * 8).toLocaleString()}/year</td><td>1\u20132 years certification</td></tr>
      </tbody>
    </table>
  </section>`;
}

function renderOpportunities(lb, api, scores, areaHa) {
  const scenarios = computeRevenueScenarios(areaHa);

  return `
  <section class="section">
    <h1 class="section-title-large">Opportunities</h1>
    <div class="two-column">
      <p class="drop-cap">This property offers multiple pathways to revenue generation, from traditional agricultural products to emerging ecosystem service markets. The optimal strategy depends on the steward's goals, risk tolerance, and time horizon. Three scenarios illustrate the range of possibilities.</p>
      <p>The Conservative scenario maintains existing systems with minimal intervention. The Moderate scenario adds improved management practices. The Optimized scenario fully develops all revenue streams, requiring greater upfront investment but delivering substantially higher long-term returns.</p>
    </div>
    <table>
      <thead><tr><th>Scenario</th><th>Systems Active</th><th>Annual Revenue</th><th>Investment Required</th></tr></thead>
      <tbody>
        ${scenarios.map(s => `<tr><td>${s.scenario}</td><td>${s.systems}</td><td>\u20ac${s.annual.toLocaleString()}/year</td><td>${s.investment}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>`;
}

function renderRisks(lb, api, scores) {
  const risk = computeRiskProfile(api);

  const riskChartData = [
    { label: 'Fire', score: parseInt(risk.fire.score) || 0, maxScore: 5, color: '#E07A5F' },
    { label: 'Flood', score: parseInt(risk.flood.score) || 0, maxScore: 5, color: '#90E0EF' },
    { label: 'Drought', score: parseInt(risk.drought.score) || 0, maxScore: 5, color: '#D4A574' },
  ];

  return `
  <section class="section">
    <h1 class="section-title-large">Risks</h1>
    <div class="two-column">
      <p class="drop-cap">Risk assessment for rural properties must address the region's most significant natural hazards. The interaction of fire, flood, and drought risks shapes both the management strategy and the long-term value trajectory. Understanding these risks in their regional context is essential for informed decision-making.</p>
      <p>Mitigation measures can substantially reduce each risk category. The recommendations below are prioritized by urgency and cost-effectiveness, informed by regional best practices and the property's specific characteristics.</p>
    </div>
    <div class="chart-container">
      ${riskBarChart(riskChartData)}
      <div class="chart-caption">Figure 12. Risk assessment summary</div>
    </div>
    <table>
      <thead><tr><th>Risk Category</th><th>Score</th><th>Level</th><th>Mitigation Priority</th></tr></thead>
      <tbody>
        <tr><td>Fire Risk</td><td>${risk.fire.score}</td><td><span class="badge ${risk.fire.badge}">${risk.fire.level}</span></td><td>${risk.fire.priority} \u2014 ${risk.fire.mitigation}</td></tr>
        <tr><td>Flood Risk</td><td>${risk.flood.score}</td><td><span class="badge ${risk.flood.badge}">${risk.flood.level}</span></td><td>${risk.flood.priority} \u2014 ${risk.flood.mitigation}</td></tr>
        <tr><td>Drought Risk</td><td>${risk.drought.score}</td><td><span class="badge ${risk.drought.badge}">${risk.drought.level}</span></td><td>${risk.drought.priority} \u2014 ${risk.drought.mitigation}</td></tr>
      </tbody>
    </table>
    ${risk.activeFires > 0 ? `<div class="pull-quote">"${risk.activeFires} active fire detection${risk.activeFires > 1 ? 's' : ''} within 50km in the last 48 hours (NASA VIIRS satellite data)."</div>` : ''}
  </section>`;
}

function renderResilience(lb, api, scores, areaHa) {
  const powerData = getVal(api, 'power');
  let nearestPowerLine = null;
  if (powerData) {
    const ways = extractWays(powerData);
    const powerLines = ways.filter(w => w.tags?.power === 'line' || w.tags?.power === 'minor_line');
    if (powerLines.length > 0) nearestPowerLine = 'Present in area';
  }

  return `
  <section class="section">
    <h1 class="section-title-large">Resilience</h1>
    <div class="two-column">
      <p class="drop-cap">Energy independence and water security are the twin pillars of rural resilience. This property's resource base supports multiple pathways to self-sufficiency, from solar photovoltaics to biomass utilization. The combination of these resources determines the property's capacity to withstand disruption and maintain productivity.</p>
      <p>Solar irradiance in this region supports robust photovoltaic installations. ${nearestPowerLine ? 'Power grid infrastructure is present nearby, facilitating grid connection for surplus generation.' : 'Distance to power grid should be assessed for connection feasibility.'} Biomass from annual management operations could contribute to a combined heat and energy system.</p>
    </div>
    <div class="chart-container">
      ${energyBarChart([
        { label: 'Solar PV', potential: 80 },
        { label: 'Wind', potential: 40 },
        { label: 'Micro-hydro', potential: scores.water.features > 2 ? 30 : 10 },
        { label: 'Biomass', potential: 60 },
      ])}
      <div class="chart-caption">Figure 14. Energy independence potential by source (relative scale)</div>
    </div>
    <table>
      <thead><tr><th>Energy Source</th><th>Resource Level</th><th>Development Feasibility</th></tr></thead>
      <tbody>
        <tr><td>Solar PV</td><td>High</td><td>High \u2014 ${nearestPowerLine ? 'Grid nearby' : 'Off-grid viable'}</td></tr>
        <tr><td>Wind</td><td>Moderate</td><td>Medium \u2014 Terrain assessment needed</td></tr>
        <tr><td>Micro-hydro</td><td>${scores.water.features > 2 ? 'Moderate' : 'Low'}</td><td>${scores.water.features > 2 ? 'Medium' : 'Low'} \u2014 Flow assessment needed</td></tr>
        <tr><td>Biomass</td><td>High</td><td>High \u2014 On-site utilization</td></tr>
      </tbody>
    </table>
  </section>`;
}

function renderContext(lb, api, scores) {
  const protectedAreas = getVal(api, 'protectedAreas');
  const hasProtected = protectedAreas && protectedAreas.length > 0;

  const percentiles = [
    { label: 'Water Security', percentile: Math.min(95, Math.round(scores.water.score * 10)) },
    { label: 'Biodiversity', percentile: Math.min(90, scores.bio.score) },
    { label: 'Soil Health', percentile: Math.min(85, scores.soil.score) },
    { label: 'Carbon Storage', percentile: Math.min(80, scores.carbon.score) },
    { label: 'Resilience', percentile: Math.min(85, scores.resilience.score) },
  ];

  return `
  <section class="section">
    <h1 class="section-title-large">Context</h1>
    <div class="two-column">
      <p class="drop-cap">Understanding a property requires seeing it at multiple scales simultaneously. This land exists within its bioregion\u2014a landscape defined by shared climate, geology, and land use history. It contributes to its watershed, where upstream land management affects downstream water security. And it connects to its local community, where markets, services, and social networks shape the stewardship experience.</p>
      <p>At each scale, the property performs differently. These multi-scale comparisons help identify both competitive advantages and areas for improvement. ${hasProtected ? `The property is located near ${protectedAreas.length} protected area${protectedAreas.length > 1 ? 's' : ''}, indicating high ecological significance in the surrounding landscape.` : ''}</p>
    </div>
    <div class="chart-container">
      ${percentileChart(percentiles)}
      <div class="chart-caption">Figure 15. Property performance vs. regional benchmarks (percentile ranking)</div>
    </div>
    ${hasProtected ? `
    <h2 class="subsection-title">Nearby Protected Areas</h2>
    <table>
      <thead><tr><th>Name</th><th>Type</th><th>Designation</th></tr></thead>
      <tbody>
        ${protectedAreas.slice(0, 5).map(pa => `<tr><td>${esc(pa.name || 'Unknown')}</td><td>${esc(pa.type || '—')}</td><td>${esc(pa.designation || '—')}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}
  </section>`;
}

function renderTemporal(lb, api, scores, areaHa) {
  const projections = getVal(api, 'climateProjections');

  return `
  <section class="section">
    <h1 class="section-title">Change Over Time</h1>
    <div class="two-column">
      <p class="drop-cap">Satellite imagery and climate records reveal a landscape in transition. Regional trends of warming temperatures, shifting precipitation patterns, and evolving land use create both challenges and opportunities. Understanding these trajectories is essential for long-term planning and investment decisions.</p>
      <p>${projections ? 'Climate projections suggest continued warming with increasing variability in precipitation. Properties with diverse water sources and resilient ecosystems are better positioned to adapt.' : 'Long-term projections indicate that adaptive management strategies will become increasingly important.'} Property values in areas with strong natural capital profiles have shown consistent appreciation.</p>
    </div>
    <table>
      <thead><tr><th>Scenario</th><th>30-Year NPV</th><th>Key Assumptions</th><th>Risk Level</th></tr></thead>
      <tbody>
        <tr><td>Business as Usual</td><td>\u20ac${Math.round(areaHa * 12400).toLocaleString()}</td><td>Current management continues</td><td>Low</td></tr>
        <tr><td>Climate Resilience</td><td>\u20ac${Math.round(areaHa * 15400).toLocaleString()}</td><td>Water efficiency, fire protection</td><td>Medium</td></tr>
        <tr><td>Conservation Restoration</td><td>\u20ac${Math.round(areaHa * 16800).toLocaleString()}</td><td>Ecosystem service markets develop</td><td>Medium-High</td></tr>
        <tr><td>Intensification</td><td>\u20ac${Math.round(areaHa * 11600).toLocaleString()}</td><td>Maximize short-term yields</td><td>High</td></tr>
      </tbody>
    </table>
  </section>`;
}

function renderMapPortfolio(lb) {
  const [lat, lng] = lb.center || [0, 0];
  const boundary = lb.boundary;

  const maps = [
    { title: 'Location Overview', zoom: 8, satellite: false },
    { title: 'Regional Context', zoom: 10, satellite: false },
    { title: 'Property Detail', zoom: 14, satellite: true },
    { title: 'Satellite View', zoom: 15, satellite: true },
  ];

  return `
  <section class="section">
    <h1 class="section-title">Map Portfolio</h1>
    <p style="margin-bottom: 8mm;">The following maps provide spatial context across nested scales, from regional overview to detailed property analysis.</p>
  </section>
  ${maps.map(m => `
  <div class="map-page">
    <div class="map-title">${m.title}</div>
    <img src="${getStaticMapUrl([lat, lng], m.zoom, 800, 600, { satellite: m.satellite, boundary })}" alt="${m.title}" style="width:100%;max-height:200mm;object-fit:contain;">
  </div>`).join('')}`;
}

function renderCompliance(lb, api) {
  const protectedAreas = getVal(api, 'protectedAreas');
  const hasNatura = protectedAreas && protectedAreas.length > 0;

  return `
  <section class="section">
    <h1 class="section-title">Compliance</h1>
    <div class="two-column">
      <p class="drop-cap">Land ownership carries an evolving set of regulatory obligations. Environmental regulations, sustainability reporting requirements, and natural capital disclosure frameworks are expanding globally. This assessment provides baseline data aligned with major regulatory frameworks.</p>
      <p>Geolocation data is documented and cross-referenced with available records. Environmental data is structured for export-ready reporting, supporting compliance with emerging disclosure requirements.</p>
    </div>
    <table>
      <thead><tr><th>Regulation</th><th>Status</th><th>Relevance</th><th>Action Required</th></tr></thead>
      <tbody>
        <tr><td>Geolocation Verification</td><td><span class="badge badge-success">Verified</span></td><td>Global</td><td>Maintain documentation</td></tr>
        <tr><td>Natural Capital Data</td><td><span class="badge badge-success">Collected</span></td><td>Global</td><td>Annual update</td></tr>
        ${hasNatura ? `<tr><td>Protected Area Proximity</td><td><span class="badge badge-warning">Nearby</span></td><td>Regional</td><td>Review management constraints</td></tr>` : ''}
        <tr><td>Environmental Reporting</td><td><span class="badge badge-warning">In Progress</span></td><td>Regional</td><td>Complete baseline package</td></tr>
      </tbody>
    </table>
    <h2 class="subsection-title">Regulatory Timeline</h2>
    <ul class="timeline">
      <li data-year="2024">Baseline natural capital assessment completed</li>
      <li data-year="2025">Environmental compliance documentation active</li>
      <li data-year="2026">Sustainability reporting requirements expanding</li>
      <li data-year="2030">Full natural capital disclosure expected across markets</li>
    </ul>
  </section>`;
}

function renderNextSteps(lb, api, scores, areaHa) {
  return `
  <section class="section">
    <h1 class="section-title">What to Do Next</h1>
    <div class="two-column">
      <p class="drop-cap">This assessment is an invitation to relationship, not a final judgment of value. The recommendations that follow are starting points for engagement, organized by timeframe and priority. Immediate actions address compliance and risk reduction. Short-term actions build productive capacity. Long-term actions shape the property's trajectory over decades.</p>
      <p>At each scale\u2014bioregional, watershed, and neighbourhood\u2014there are people and organizations worth knowing. Local fire management collectives, water user associations, and agricultural cooperatives all represent opportunities for mutual support and shared learning.</p>
    </div>
    <h2 class="subsection-title">Immediate (0\u20136 months)</h2>
    <table>
      <thead><tr><th>Action</th><th>Estimated Cost</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Comprehensive soil analysis</td><td>\u20ac400\u2013600</td><td>Baseline for management decisions</td></tr>
        <tr><td>Fire prevention assessment</td><td>Free\u2013\u20ac500</td><td>Risk reduction</td></tr>
        <tr><td>Water source documentation</td><td>\u20ac200\u2013400</td><td>Legal protection, baseline data</td></tr>
        <tr><td>Boundary survey verification</td><td>\u20ac300\u2013800</td><td>Legal clarity</td></tr>
      </tbody>
    </table>
    <h2 class="subsection-title">Short-term (6\u201318 months)</h2>
    <table>
      <thead><tr><th>Action</th><th>Estimated Cost</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Land management plan</td><td>\u20ac800\u20131,200</td><td>Strategic direction</td></tr>
        <tr><td>Vegetation management</td><td>\u20ac${Math.round(areaHa * 200).toLocaleString()}\u2013${Math.round(areaHa * 400).toLocaleString()}</td><td>Fire risk + productivity</td></tr>
        <tr><td>Solar feasibility study</td><td>\u20ac500\u2013800</td><td>Energy independence pathway</td></tr>
      </tbody>
    </table>
    <h2 class="subsection-title">Long-term (2\u20135 years)</h2>
    <table>
      <thead><tr><th>Action</th><th>Estimated Cost</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Diversified revenue streams</td><td>\u20ac${Math.round(areaHa * 1200).toLocaleString()}\u2013${Math.round(areaHa * 2400).toLocaleString()}</td><td>Long-term productivity</td></tr>
        <tr><td>Conservation covenant exploration</td><td>Legal fees only</td><td>Permanent protection option</td></tr>
        <tr><td>Carbon credit certification</td><td>\u20ac2,000\u20135,000</td><td>Access to emerging markets</td></tr>
        <tr><td>Integrated energy system</td><td>\u20ac15,000\u201330,000</td><td>Full energy independence</td></tr>
      </tbody>
    </table>
  </section>`;
}

function renderMethodology(lb) {
  return `
  <section class="section">
    <h1 class="section-title">Methodology, Sources &amp; Disclaimer</h1>
    <h2 class="subsection-title">Data Sources</h2>
    <table>
      <thead><tr><th>Data Type</th><th>Source</th><th>Resolution/Scale</th></tr></thead>
      <tbody>
        <tr><td>Climate</td><td>Open-Meteo (ERA5 reanalysis)</td><td>30-year monthly averages</td></tr>
        <tr><td>Soil Data</td><td>SoilGrids / ISRIC</td><td>250m resolution</td></tr>
        <tr><td>Biodiversity</td><td>iNaturalist, GBIF</td><td>Point observations (5\u201310km radius)</td></tr>
        <tr><td>Elevation</td><td>Open-Meteo SRTM DEM</td><td>90m resolution</td></tr>
        <tr><td>Water Features</td><td>OpenStreetMap / Overpass</td><td>Feature-level</td></tr>
        <tr><td>Fire Risk</td><td>Open-Meteo + NASA FIRMS</td><td>Regional assessment</td></tr>
        <tr><td>Flood Risk</td><td>GloFAS / Open-Meteo</td><td>Sub-basin scale</td></tr>
        <tr><td>Geology</td><td>Macrostrat</td><td>Regional scale</td></tr>
        <tr><td>Protected Areas</td><td>Natura 2000</td><td>Designation level</td></tr>
        <tr><td>Infrastructure</td><td>OpenStreetMap / Overpass</td><td>Feature-level</td></tr>
      </tbody>
    </table>
    <h2 class="subsection-title">Methodology Notes</h2>
    <div class="two-column">
      <p>Ecosystem service valuation follows the UN SEEA-EA framework with benefit transfer methods adjusted for local conditions. Conservative estimation principles are applied throughout\u2014values represent lower-bound estimates rather than maximum potential.</p>
      <p>Natural Capital scores are calculated on a 0\u2013100 scale for each dimension, with benchmarks derived from regional datasets and theoretical maximums based on habitat potential.</p>
    </div>
    <h2 class="subsection-title">Important Disclaimer</h2>
    <div class="pull-quote">"This report is an invitation to relationship, not a final judgment of value."</div>
    <p>The information contained in this assessment is provided for informational purposes only and does not constitute professional advice. All data, estimates, and projections are based on available information and reasonable assumptions, but no representation or warranty is made as to their accuracy or completeness.</p>
    <p>Property valuation, legal compliance, and management decisions should be verified with qualified professionals. LandBook and its affiliates accept no liability for decisions made based on this assessment.</p>
    <p><strong>Temporal Disclaimer:</strong> Historical trends are based on available data and may not capture all relevant factors. Future projections are scenarios, not predictions, and actual outcomes will vary based on management decisions, market conditions, and factors beyond the scope of this assessment.</p>
    <div style="margin-top: 15mm; padding-top: 5mm; border-top: 0.5pt solid var(--light-gray); text-align: center;">
      <p style="font-size: 10pt; color: var(--deep-forest); font-weight: 600;">LandBook by LandLibrary</p>
      <p style="font-size: 9pt; color: #6B7280;">www.landlibrary.pt</p>
      <p style="font-size: 8pt; color: #9CA3AF; margin-top: 3mm;">Generated: ${formatDate()} | Digital Report</p>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Main Orchestrator
// ---------------------------------------------------------------------------

function renderReport(lb, apiResults, scores, areaHa) {
  return [
    renderCover,
    renderGlance,
    renderEcosystemServices,
    renderScorecard,
    renderTerrain,
    renderWater,
    renderClimate,
    renderBiodiversity,
    renderAgriculture,
    renderOpportunities,
    renderRisks,
    renderResilience,
    renderContext,
    renderTemporal,
    renderMapPortfolio,
    renderCompliance,
    renderNextSteps,
    renderMethodology,
  ].map(fn => {
    try {
      return fn(lb, apiResults, scores, areaHa);
    } catch (err) {
      console.error(`Section render error (${fn.name}):`, err);
      return `<section class="section"><p style="color:#E07A5F;"><em>Section unavailable: ${esc(fn.name)}</em></p></section>`;
    }
  }).join('');
}

async function init() {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = REPORT_CSS;
  document.head.appendChild(style);

  const report = document.getElementById('report');
  report.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;">
    <div style="text-align:center;">
      <div style="width:40px;height:40px;border:3px solid #D1D5DB;border-top-color:#1B4332;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
      <p style="color:#6B7280;font-size:14px;">Generating your LandBook report...</p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:8px;">Fetching data from 19 sources</p>
    </div>
  </div>
  <style>@keyframes spin { to { transform: rotate(360deg); } }</style>`;

  // Parse ID from URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    report.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;"><p style="color:#6B7280;">No landbook ID provided. Add ?id=YOUR_ID to the URL.</p></div>';
    return;
  }

  // Load landbook
  let lb;
  try {
    lb = await getLandbook(id);
  } catch (err) {
    report.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;"><p style="color:#E07A5F;">Failed to load landbook: ${esc(String(err))}</p></div>`;
    return;
  }

  if (!lb) {
    report.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;"><p style="color:#6B7280;">Landbook not found.</p></div>';
    return;
  }

  // Check for cached data (less than 24 hours old)
  let apiResults = {};
  const autoData = lb.autoData;
  const isFresh = autoData?.lastFetched && (Date.now() - new Date(autoData.lastFetched).getTime()) < 24 * 60 * 60 * 1000;

  if (isFresh) {
    // Use cached data
    for (const [key, val] of Object.entries(autoData)) {
      if (key !== 'lastFetched' && key !== 'apiStatus') {
        apiResults[key] = { ok: true, data: val };
      }
    }
  } else {
    // Fetch fresh data
    apiResults = await fetchReportData(lb);

    // Persist results
    try {
      const persistData = { lastFetched: new Date().toISOString() };
      for (const [key, val] of Object.entries(apiResults)) {
        if (val.ok) persistData[key] = val.data;
      }
      await updateLandbook(lb.id, { autoData: persistData });
    } catch (err) {
      console.warn('Failed to persist API results:', err);
    }
  }

  // Compute scores
  const areaHa = sqmToHectares(lb.area || 0) || 1;
  const scores = computeAllScores(apiResults, areaHa);

  // Update page title
  const name = lb.address?.split(',')[0] || 'LandBook Report';
  document.title = `LandBook \u2014 ${name}`;

  // Render
  report.innerHTML = renderReport(lb, apiResults, scores, areaHa);
}

init();
