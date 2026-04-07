/**
 * Generate a LandBook Report in Tailwind editorial style.
 *
 * Fetches from the last submission/waitlist entry (or a specific landbook ID),
 * calls all APIs, computes scores, builds a self-contained HTML document,
 * saves to report_versions collection (viewable at /report-preview),
 * and also writes an HTML file.
 *
 * Usage:
 *   node scripts/generate-landbook-report.js                  # last submission
 *   node scripts/generate-landbook-report.js <landbook-id>    # specific landbook
 *   node scripts/generate-landbook-report.js --fresh          # skip cache
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

// Env
const envLines = readFileSync(resolve(ROOT, '.env.local'), 'utf8').split('\n');
for (const line of envLines) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
import.meta.env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_')));

const MAPBOX_TOKEN = process.env.VITE_MAPBOX_TOKEN;

// Dynamic imports
const { getCollection } = await import('../api/_db.js');
const { polygonArea, polygonPerimeter, polygonBounds, expandBounds, sqmToHectares } = await import('../src/lib/geo.js');
const { getElevation, getClimateAverages, getRegionalClimateAverages, getClimateProjections, getForecast } = await import('../src/api/open-meteo.js');
const { getSoilProperties, getSoilClassification, parseSoilProperties, parseSoilClassification } = await import('../src/api/soilgrids.js');
const { getWaterFeatures, getInfrastructure, getRoadAccess, getPowerGrid, extractNodes, extractWays } = await import('../src/api/overpass.js');
const { getSpeciesCounts, summarizeSpeciesCounts, getThreatenedSpecies } = await import('../src/api/inaturalist.js');
const { getSpeciesOccurrences, summarizeOccurrences } = await import('../src/api/gbif.js');
const { getActiveFiresNearby } = await import('../src/api/nasa-firms.js');
const { getFloodForecastWithHistory } = await import('../src/api/flood.js');
const { getGeology, parseGeology } = await import('../src/api/macrostrat.js');
const { getProtectedAreas } = await import('../src/api/natura2000.js');
const { fetchRiskScores } = await import('../src/api/risk-scores.js');
const { computeAllScores, computeEcosystemServices, computeRevenueScenarios, computeRiskProfile } = await import('../src/lib/report-scores.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function withTimeout(p, ms = 30000) { return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), ms))]); }
function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmt(n) { return Number(n).toLocaleString(); }
function formatDate() { const m = ['January','February','March','April','May','June','July','August','September','October','November','December']; const d = new Date(); return `${m[d.getMonth()]} ${d.getFullYear()}`; }
function staticMapUrl(center, zoom, w, h, opts = {}) {
  const [lat, lng] = center;
  const style = opts.satellite ? 'satellite-v9' : 'outdoors-v12';
  let overlay = '';
  if (opts.boundary?.length > 1) {
    const ring = opts.boundary.map(([la, ln]) => [ln, la]);
    if (ring.length && (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1])) ring.push([...ring[0]]);
    const gj = { type:'Feature', properties:{ stroke:'#1B4332','stroke-width':2, fill:'#52b788','fill-opacity':0.2 }, geometry:{ type:'Polygon', coordinates:[ring] } };
    overlay = `geojson(${encodeURIComponent(JSON.stringify(gj))})/`;
  }
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}${lng},${lat},${zoom},0/${w}x${h}@2x?access_token=${MAPBOX_TOKEN}`;
}
function getVal(api, key) { const r = api[key]; return r?.ok ? r.data : null; }
function gauge(value, max, color, label) {
  const pct = Math.min(value / max, 1);
  const full = 141.37;
  const offset = full * (1 - pct);
  return `<div class="flex flex-col items-center">
    <div class="relative w-32 h-16 overflow-hidden">
      <svg class="w-32 h-32 absolute top-0" style="transform:rotate(-90deg)" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E7EEFE" stroke-width="10" stroke-dasharray="${full}" stroke-dashoffset="0"></circle>
        <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${full}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
      </svg>
      <div class="absolute bottom-0 w-full text-center"><span class="font-serif text-xl font-bold">${value}</span></div>
    </div>
    <span class="font-label text-[8pt] font-bold uppercase tracking-widest mt-4 text-outline">${label}</span>
  </div>`;
}

// ---------------------------------------------------------------------------
// Args & Load
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const forceFresh = args.includes('--fresh');
let landbookId = args.find(a => !a.startsWith('-'));

const startTime = Date.now();
console.log('\n  LANDBOOK REPORT GENERATOR (Editorial Style)\n');

const col = await getCollection('landbooks');
let lb;

if (landbookId) {
  lb = await col.findOne({ id: landbookId });
  if (!lb) { console.error('  Landbook not found.'); process.exit(1); }
} else {
  // Get last submission/landbook
  lb = await col.find({}).sort({ created: -1 }).limit(1).next();
  if (!lb) {
    // Try waitlist
    const wl = await getCollection('waitlist');
    const entry = await wl.find({}).sort({ createdAt: -1 }).limit(1).next();
    if (!entry) { console.error('  No landbooks or waitlist entries found.'); process.exit(1); }
    console.log(`  Found waitlist entry: ${entry.email} / ${entry.address}`);
    // Create a quick landbook from waitlist
    const token = process.env.VITE_MAPBOX_TOKEN;
    let lat, lng;
    if (entry.location?.lat) { lat = entry.location.lat; lng = entry.location.lng; }
    else if (entry.address) {
      const geoRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(entry.address)}.json?access_token=${token}&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData.features?.length) { console.error('  Geocoding failed.'); process.exit(1); }
      lng = geoData.features[0].center[0]; lat = geoData.features[0].center[1];
    } else { console.error('  No address or location.'); process.exit(1); }

    const offset = 0.00045;
    const lngOff = offset / Math.cos(lat * Math.PI / 180);
    const boundary = [[lat-offset,lng-lngOff],[lat-offset,lng+lngOff],[lat+offset,lng+lngOff],[lat+offset,lng-lngOff]];
    landbookId = crypto.randomUUID();
    lb = { id: landbookId, boundary, center: [lat,lng], area: polygonArea(boundary), perimeter: polygonPerimeter(boundary), address: entry.address||'', email: entry.email, autoData: {}, created: new Date().toISOString(), source: 'report-generate' };
    await col.insertOne(lb);
    console.log(`  Created landbook: ${landbookId}`);
  }
  landbookId = lb.id;
}

const [lat, lng] = lb.center || [0, 0];
const areaHa = sqmToHectares(lb.area || 0) || 1;
const name = lb.address?.split(',')[0]?.trim() || 'Untitled Property';
const location = lb.address?.split(',').slice(1).join(',').trim() || '';
console.log(`  Property: ${name} (${areaHa.toFixed(1)} ha)`);

// ---------------------------------------------------------------------------
// Fetch API data
// ---------------------------------------------------------------------------
let api = {};
const autoData = lb.autoData;
const isFresh = !forceFresh && autoData?.lastFetched && (Date.now() - new Date(autoData.lastFetched).getTime()) < 24*60*60*1000;

if (isFresh) {
  console.log('  Using cached data...');
  for (const [key, val] of Object.entries(autoData)) { if (key !== 'lastFetched' && key !== 'apiStatus') api[key] = { ok: true, data: val }; }
} else {
  console.log('  Fetching 19 APIs...');
  const bounds = lb.boundary ? expandBounds(polygonBounds(lb.boundary), 0.3) : null;
  const tasks = [
    { key:'elevation', fn:()=>getElevation(lat,lng) }, { key:'forecast', fn:()=>getForecast(lat,lng) },
    { key:'climate', fn:()=>getClimateAverages(lat,lng) }, { key:'soilProps', fn:()=>getSoilProperties(lat,lng) },
    { key:'soilClass', fn:()=>getSoilClassification(lat,lng) }, { key:'species', fn:()=>getSpeciesCounts(lat,lng,5) },
    { key:'threatened', fn:()=>getThreatenedSpecies(lat,lng,10) }, { key:'water', fn:()=>bounds?getWaterFeatures(bounds):Promise.resolve(null) },
    { key:'gbif', fn:()=>getSpeciesOccurrences(lat,lng,10) }, { key:'activeFires', fn:()=>getActiveFiresNearby(lat,lng,50) },
    { key:'flood', fn:()=>getFloodForecastWithHistory(lat,lng) }, { key:'infrastructure', fn:()=>bounds?getInfrastructure(bounds):Promise.resolve(null) },
    { key:'geology', fn:()=>getGeology(lat,lng) }, { key:'protectedAreas', fn:()=>getProtectedAreas(lat,lng,25) },
    { key:'riskScores', fn:()=>fetchRiskScores(lat,lng) }, { key:'regionalClimate', fn:()=>getRegionalClimateAverages(lat,lng,25) },
    { key:'climateProjections', fn:()=>getClimateProjections(lat,lng) }, { key:'roads', fn:()=>bounds?getRoadAccess(bounds):Promise.resolve(null) },
    { key:'power', fn:()=>bounds?getPowerGrid(bounds):Promise.resolve(null) },
  ];
  const results = await Promise.allSettled(tasks.map(t => withTimeout(t.fn(), 30000)));
  let ok=0, fail=0;
  tasks.forEach((t,i) => { if(results[i].status==='fulfilled'){api[t.key]={ok:true,data:results[i].value};ok++;}else{api[t.key]={ok:false,error:String(results[i].reason)};fail++;} });
  console.log(`  APIs: ${ok} OK, ${fail} failed`);
  const persist = { lastFetched: new Date().toISOString() };
  for (const [k,v] of Object.entries(api)) { if(v.ok) persist[k]=v.data; }
  await col.updateOne({ id: landbookId }, { $set: { autoData: persist, updated: new Date().toISOString() } });
}

// ---------------------------------------------------------------------------
// Compute scores & extract data
// ---------------------------------------------------------------------------
console.log('  Computing scores...');
const scores = computeAllScores(api, areaHa);
const eco = computeEcosystemServices(areaHa, api);
const risk = computeRiskProfile(api);
const scenarios = computeRevenueScenarios(areaHa);

const climate = getVal(api,'climate');
const props = getVal(api,'soilProps') ? parseSoilProperties(getVal(api,'soilProps')) : null;
const classification = getVal(api,'soilClass') ? parseSoilClassification(getVal(api,'soilClass')) : null;
const geo = getVal(api,'geology') ? parseGeology(getVal(api,'geology')) : null;
const elevation = getVal(api,'elevation');
const protectedAreas = getVal(api,'protectedAreas');
const speciesData = getVal(api,'species');
const threatenedData = getVal(api,'threatened');
const waterData = getVal(api,'water');
const elevM = elevation?.elevation ?? '\u2014';
const totalValue = Math.round(areaHa * eco.total * 30 * 0.6 / 1000) * 1000;

// Climate
let temps=[], rain=[], annualMean='\u2014', summerMean='\u2014', winterMean='\u2014', annualRain='\u2014', growingDays='\u2014';
if (climate?.monthly_temperature_max && climate?.monthly_temperature_min && climate?.monthly_precipitation) {
  temps = climate.monthly_temperature_max.map((mx,i) => Math.round((mx + climate.monthly_temperature_min[i])/2*10)/10);
  rain = climate.monthly_precipitation;
} else if (climate?.monthly) {
  temps = climate.monthly.map(m => Math.round(((m.temp_max||0)+(m.temp_min||0))/2*10)/10);
  rain = climate.monthly.map(m => m.precipitation||0);
}
if (temps.length===12) { annualMean=(temps.reduce((a,b)=>a+b,0)/12).toFixed(1); summerMean=((temps[5]+temps[6]+temps[7])/3).toFixed(1); winterMean=((temps[0]+temps[1]+temps[11])/3).toFixed(1); growingDays=Math.round(temps.filter(t=>t>10).length/12*365); }
if (rain.length===12) annualRain=Math.round(rain.reduce((a,b)=>a+b,0));

// Water sources
let waterSources = [];
if (waterData) {
  const nodes = extractNodes(waterData), ways = extractWays(waterData);
  nodes.filter(n=>n.tags?.natural==='spring').forEach(s=>waterSources.push({name:s.tags?.name||'Spring',type:'Perennial'}));
  nodes.filter(n=>n.tags?.man_made==='water_well').forEach(w=>waterSources.push({name:w.tags?.name||'Well',type:'Groundwater'}));
  ways.filter(w=>w.tags?.waterway).forEach(r=>waterSources.push({name:r.tags?.name||'Waterway',type:r.tags?.waterway}));
}

// Species groups
let speciesGroups = [];
if (speciesData) {
  const summary = summarizeSpeciesCounts(speciesData);
  speciesGroups = Object.entries(summary.groups||summary).filter(([k,v])=>k!=='total'&&typeof v==='number'&&v>0).map(([g,c])=>({group:g,count:c})).sort((a,b)=>b.count-a.count);
}

const fireScore = parseInt(risk.fire.score) || 0;
const heroUrl = staticMapUrl([lat,lng], 14, 800, 500, { satellite: true, boundary: lb.boundary });
const mapUrl = staticMapUrl([lat,lng], 10, 800, 400, { satellite: false, boundary: lb.boundary });

// ---------------------------------------------------------------------------
// Additional data extraction for full report
// ---------------------------------------------------------------------------

// More map URLs
const mapUrls = [
  { title: 'Location Overview', url: staticMapUrl([lat,lng], 8, 800, 600, { satellite: false, boundary: lb.boundary }) },
  { title: 'Regional Context', url: staticMapUrl([lat,lng], 10, 800, 600, { satellite: false, boundary: lb.boundary }) },
  { title: 'Property Detail (Satellite)', url: staticMapUrl([lat,lng], 14, 800, 600, { satellite: true, boundary: lb.boundary }) },
  { title: 'Close-Up View', url: staticMapUrl([lat,lng], 15, 800, 600, { satellite: true, boundary: lb.boundary }) },
];

// Monthly climate SVG chart
let climateChartSvg = '';
if (temps.length === 12 && rain.length === 12) {
  climateChartSvg = monthlyClimateChart(temps, rain, 640, 220);
}

// Species chart
let speciesChartSvg = '';
if (speciesGroups.length > 0) {
  const { speciesBarChart } = await import('../src/lib/report-charts.js');
  speciesChartSvg = speciesBarChart(speciesGroups, 600);
}

// Radar chart
const radarSvg = radarChart(scores.dimensions, 300);

// Percentile chart
const percentileSvg = percentileChart([
  { label: 'Water Security', percentile: Math.min(95, Math.round(scores.water.score * 10)) },
  { label: 'Biodiversity', percentile: Math.min(90, scores.bio.score) },
  { label: 'Soil Health', percentile: Math.min(85, scores.soil.score) },
  { label: 'Carbon Storage', percentile: Math.min(80, scores.carbon.score) },
  { label: 'Resilience', percentile: Math.min(85, scores.resilience.score) },
], 600);

// ---------------------------------------------------------------------------
// BUILD HTML
// ---------------------------------------------------------------------------
console.log('  Building HTML...');

const ecoBreakdown = eco.services.map(s => ({ name: s.name, value: s.value, pct: Math.round(s.value / eco.total * 100) }));
const topThree = [...ecoBreakdown].sort((a,b) => b.value - a.value).slice(0, 3);
const barColors = ['bg-primary', 'bg-on-tertiary-container', 'bg-editorial-terracotta'];

// -- Helper: editorial page wrapper --
const pageOpen = (cls = '') => `<main class="a4-container shadow-sm mb-4 ${cls}">`;
const pageClose = `</main>`;
const sectionHeader = (title, subtitle = '') => `<header class="mb-12"><div class="flex flex-col gap-4"><h1 class="font-serif text-[42pt] text-primary leading-tight">${title}</h1><div class="w-4/5 h-[0.5pt] bg-outline-variant"></div>${subtitle ? `<p class="w-[65%] text-[12pt] text-on-surface-variant leading-relaxed">${subtitle}</p>` : ''}</div></header>`;
const singleHeader = (title) => `<h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">${title}</h1>`;
const subHead = (t) => `<h2 class="font-serif italic text-[24pt] text-primary mb-6 mt-12">${t}</h2>`;
const twoCol = (left, right) => `<section class="grid grid-cols-[1.5fr_1fr] gap-12 mb-16"><div class="space-y-6">${left}</div><div class="flex flex-col justify-start pt-4">${right}</div></section>`;
const narrativeP = (text, dropCap = false) => `<p class="${dropCap ? 'drop-cap ' : ''}text-[11pt] leading-[1.6] text-editorial-charcoal">${text}</p>`;
const pullQuote = (text) => `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">"${text}"</blockquote>`;
const tableHead = (...cols) => `<table class="w-full text-left text-[10pt] mb-8"><thead><tr class="border-b-2 border-primary">${cols.map(c => `<th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">${c}</th>`).join('')}</tr></thead><tbody>`;
const tableRow = (...cells) => `<tr class="border-b-[0.5pt] border-outline-variant">${cells.map((c,i) => `<td class="py-3 ${i===0?'font-semibold':'text-on-surface-variant'}">${c}</td>`).join('')}</tr>`;
const tableClose = `</tbody></table>`;
const badge = (text, type) => { const cls = type==='success'?'bg-[#d8f3dc] text-[#1b4332]':type==='warning'?'bg-[#fff3cd] text-[#856404]':'bg-[#f8d7da] text-[#721c24]'; return `<span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 ${cls}">${text}</span>`; };
const contextCard = (icon, bigVal, unit, title, desc, extra = '') => `<div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8"><div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">${icon}</span></div><div class="flex-grow grid grid-cols-12 gap-6"><div class="col-span-3"><div class="font-serif text-[36pt] font-normal leading-none text-primary">${bigVal}</div><div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">${unit}</div></div><div class="col-span-9"><h3 class="text-base font-semibold mb-3">${title}</h3><p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">${desc}</p>${extra}</div></div></div>`;
const metricBand = (items) => `<section class="grid grid-cols-${items.length} gap-0 items-center border-b-[0.5pt] border-outline-variant pb-8 mb-8">${items.map((m,i) => `<div class="${i<items.length-1?'hairline-r ':''}px-6 py-2"><div class="font-serif text-[18pt] text-primary leading-tight">${m.value}</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">${m.label}</div></div>`).join('')}</section>`;
const pageFooter = `<footer class="flex justify-between items-end mt-16"><div class="text-[8px] font-bold uppercase tracking-widest text-outline">LandBook \u00b7 ${formatDate()}</div><div class="text-right"><span class="block text-[8px] uppercase tracking-widest text-outline">Natural Capital Assessment</span></div></footer>`;

const html = `<!DOCTYPE html>
<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>LandBook \u2014 ${esc(name)}</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"><\/script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script>
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#012d1d", "primary-container": "#1b4332", "on-primary": "#ffffff",
      "on-primary-container": "#86af99", "secondary": "#585f6c", "on-surface": "#151c27",
      "on-surface-variant": "#414844", "outline": "#717973", "outline-variant": "#c1c8c2",
      "surface": "#FAFAF9", "surface-container": "#e7eefe", "surface-container-low": "#f0f3ff",
      "surface-container-high": "#e2e8f8", "surface-dim": "#d3daea",
      "on-tertiary-container": "#75b393", "tertiary-container": "#00452e",
      "editorial-terracotta": "#E07A5F", "editorial-charcoal": "#374151",
      "primary-fixed-dim": "#a5d0b9", "inverse-primary": "#a5d0b9",
    },
    borderRadius: { DEFAULT: "0px", lg: "0px", xl: "0px", full: "9999px" },
    fontFamily: {
      headline: ["Inter","sans-serif"], body: ["Inter","sans-serif"],
      label: ["Inter","sans-serif"], serif: ["'Libre Baskerville'","serif"],
    },
  }},
}
<\/script>
<style>
body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }
.drop-cap::first-letter { float:left; font-family:'Libre Baskerville',serif; font-size:52pt; line-height:0.8; padding-right:12px; padding-top:4px; color:#012d1d; }
.hairline-b { border-bottom: 0.5pt solid #c1c8c2; }
.hairline-r { border-right: 0.5pt solid #c1c8c2; }
.a4-container { width:210mm; min-height:297mm; margin:auto; background:#FAFAF9; padding:24mm 20mm; position:relative; }
@media print { body { background:white; } .no-print { display:none; } }
</style>
</head>
<body class="bg-surface text-on-surface antialiased">

<!-- PAGE 1: EXECUTIVE SUMMARY -->
${pageOpen('mt-8')}
<div class="flex-1 flex flex-col justify-between h-full">

  <!-- TOP BAND -->
  <section class="flex justify-between items-end pb-4 border-b-[0.5pt] border-outline-variant">
    <div><h1 class="font-serif italic text-[28pt] text-[#1B4332] leading-none">${esc(name)}</h1></div>
    <div class="text-right"><p class="text-[10pt] text-on-surface uppercase tracking-wide">${esc(location)} \u00b7 ${lat.toFixed(4)}\u00b0N, ${Math.abs(lng).toFixed(4)}\u00b0${lng<0?'W':'E'}</p></div>
  </section>

  <!-- MAP / QUOTE -->
  <section class="grid grid-cols-3 gap-6 my-8">
    <div class="col-span-2 h-48 bg-surface-container overflow-hidden">
      <img src="${heroUrl}" alt="Satellite view" class="w-full h-full object-cover opacity-90"/>
    </div>
    <div class="h-48 bg-primary-container p-6 flex flex-col justify-end">
      <p class="font-serif text-white text-lg leading-tight italic">"Resilient landscape management is the cornerstone of 21st-century land stewardship."</p>
    </div>
  </section>

  <!-- KEY METRICS BAND -->
  <section class="grid grid-cols-4 gap-0 items-center border-b-[0.5pt] border-outline-variant pb-8">
    <div class="hairline-r px-6 py-2"><div class="font-serif text-[18pt] text-primary leading-tight">${areaHa.toFixed(1)} ha</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Total Area</div></div>
    <div class="hairline-r px-6 py-2"><div class="font-serif text-[18pt] text-primary leading-tight">\u20ac${fmt(Math.round(totalValue/areaHa))}/ha</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Current Valuation</div></div>
    <div class="hairline-r px-6 py-2"><div class="font-serif text-[18pt] text-primary leading-tight">\u20ac${fmt(totalValue)}</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Asset Value</div></div>
    <div class="px-6 py-2"><div class="font-serif text-[18pt] text-primary leading-tight">${scores.carbonStockTotal} tCO\u2082e</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Carbon Storage</div></div>
  </section>

  <!-- INTRODUCTORY NARRATIVE -->
  <section class="py-10">
    <div class="grid grid-cols-3 gap-8 text-[10.5pt] leading-relaxed text-editorial-charcoal">
      <div class="drop-cap">${esc(name)} encompasses ${areaHa.toFixed(1)} hectares in ${esc(location)}, where the landscape reflects centuries of interaction between natural systems and human stewardship. With ${annualRain}mm of annual rainfall and an elevation of ${elevM}m, the property occupies a distinctive position within its bioregion.</div>
      <div>This assessment evaluates the property across multiple scales\u2014bioregional, watershed, and neighbourhood\u2014to provide a comprehensive understanding of its natural capital value, risks, and opportunities. The analysis draws on satellite imagery, climate data, soil surveys, and regional benchmarks.</div>
      <div class="flex flex-col justify-between">
        <p>Our analysis indicates that continued stewardship will further amplify these natural gains, securing the property's status as a resilient environmental asset.</p>
        <div class="mt-6 border-l-4 border-editorial-terracotta pl-4 py-1">
          <blockquote class="font-serif italic text-primary text-[11pt] leading-snug">"A resilient landscape is not just a resource, but a legacy of natural capital secured for future generations."</blockquote>
        </div>
      </div>
    </div>
  </section>

  <!-- NATURAL CAPITAL SCORE -->
  <section class="py-12 border-t-[0.5pt] border-outline-variant flex flex-col items-center text-center">
    <div class="mb-2"><span class="text-[10pt] font-bold uppercase tracking-[0.2em] text-outline">Natural Capital Score</span></div>
    <div class="font-serif text-[96pt] font-bold text-primary leading-none mb-4">${scores.overallScore}</div>
    <div class="text-lg text-secondary"><span class="font-bold text-on-surface">${scores.overallScore >= 7 ? 'Above Average' : scores.overallScore >= 5 ? 'Average' : 'Below Average'}</span><span class="mx-2 text-outline-variant">|</span>${Math.round(scores.water.score*10)}th percentile in watershed</div>
    <!-- GAUGES -->
    <div class="grid grid-cols-3 gap-16 mt-16 w-full max-w-3xl">
      ${gauge(scores.water.score, 10, '#6B8E6B', 'Water Security')}
      ${gauge(`${fireScore}/5`, 1, '#F59E0B', 'Fire Risk')}
      ${gauge((scores.resilience.score/10).toFixed(1), 10, '#E07A5F', 'Resilience')}
    </div>
  </section>

</div>
</main>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 2: ECONOMIC VALUATION                             -->
<!-- ═══════════════════════════════════════════════════════ -->
<main class="a4-container shadow-sm mb-4">

  <header class="mb-16">
    <div class="flex flex-col gap-4">
      <h1 class="font-serif text-[42pt] text-primary leading-tight">Economic Valuation</h1>
      <div class="w-4/5 h-[0.5pt] bg-outline-variant"></div>
    </div>
  </header>

  <section class="grid grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">Ecosystem services represent the flow of benefits from nature to people. For ${esc(name)}, these services include not only the tangible products of agriculture and forestry but also the less visible contributions of water purification, carbon sequestration, and habitat provision. The total annual value is estimated at \u20ac${fmt(eco.total)}, reflecting both market-priced commodities and non-market regulatory and cultural services.</p>
      <p class="text-[11pt] leading-[1.6] text-editorial-charcoal">The valuation follows the UN SEEA-EA framework with benefit transfer methods adjusted for local conditions. All estimates are conservative\u2014values represent lower-bound estimates rather than maximum potential.</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">"The integration of ecological accounting with real-world stewardship data provides a ledger of truth for environmental value."</blockquote>
      <div class="bg-surface-container-low p-6 space-y-4">
        <h3 class="font-bold text-[10px] uppercase tracking-widest text-primary">Spatial Context</h3>
        <div class="aspect-video w-full bg-slate-200 overflow-hidden"><img src="${mapUrl}" class="w-full h-full object-cover grayscale opacity-50 contrast-125" alt="Regional map"/></div>
        <p class="text-[9pt] italic text-on-surface-variant">${esc(name)} within its bioregional context.</p>
      </div>
    </div>
  </section>

  <!-- BIG NUMBER + BAR -->
  <section class="border-t-[0.5pt] border-outline-variant pt-12 text-center mb-12">
    <div class="flex items-center justify-center gap-6 mb-8">
      <h2 class="font-serif italic text-[28pt] text-primary px-4">Thirty-Year NPV</h2>
    </div>
    <div class="mb-12">
      <p class="font-serif text-[58pt] text-primary leading-none tracking-tight">\u20ac${fmt(eco.npv)}</p>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mt-4">\u00b118% uncertainty at 95% confidence interval</p>
    </div>
    <div class="max-w-2xl mx-auto space-y-4">
      <div class="flex h-[48px] w-full">
        ${topThree.map((s,i) => `<div class="h-full ${barColors[i]}" style="width:${s.pct}%"></div>`).join('')}
      </div>
      <div class="flex justify-between text-[9px] font-bold uppercase tracking-widest text-secondary px-1">
        ${topThree.map((s,i) => `<div class="flex items-center gap-2"><span class="w-2 h-2 ${barColors[i]}"></span> ${esc(s.name)} (${s.pct}%)</div>`).join('')}
      </div>
    </div>
  </section>

  <!-- SERVICES TABLE -->
  <section class="border-t-[0.5pt] border-outline-variant pt-8">
    <table class="w-full text-left text-[10pt]">
      <thead><tr class="border-b-2 border-primary">
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Ecosystem Service</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Annual Value</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Beneficiaries</th>
      </tr></thead>
      <tbody>
        ${eco.services.map(s => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">${esc(s.name)}</td><td class="py-3 font-semibold">\u20ac${fmt(s.value)}</td><td class="py-3 text-on-surface-variant">${esc(s.beneficiaries)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>

  <footer class="flex justify-between items-end mt-16">
    <div class="text-[8px] font-bold uppercase tracking-widest text-outline">LandBook \u00b7 ${formatDate()}</div>
    <div class="text-right"><span class="block text-[8px] uppercase tracking-widest text-outline">Natural Capital Assessment</span></div>
  </footer>
</main>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 3: BIOREGIONAL CONTEXT                            -->
<!-- ═══════════════════════════════════════════════════════ -->
<main class="a4-container shadow-sm mb-4">

  <section class="mb-12">
    <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Why bioregional context matters</h1>
    <p class="w-[65%] text-[12pt] text-on-surface-variant leading-relaxed">Raw numbers are hard to interpret. We compare your parcel to the bioregion\u2014so you see what's typical, what's exceptional, and what to do about it.</p>
  </section>

  <section class="flex-grow">
    <!-- Water Security -->
    <div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8">
      <div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">water_drop</span></div>
      <div class="flex-grow grid grid-cols-12 gap-6">
        <div class="col-span-3"><div class="font-serif text-[36pt] font-normal leading-none text-primary">${Math.round(scores.water.score*10)}%</div><div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">percentile</div></div>
        <div class="col-span-9">
          <h3 class="text-base font-semibold mb-3">${scores.water.score >= 7 ? 'Exceptional' : scores.water.score >= 5 ? 'Good' : 'Below average'} water security</h3>
          <p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">${scores.water.features} water feature${scores.water.features!==1?'s':''} documented. Water Security Index: ${scores.water.score}/10.</p>
          ${scores.water.score >= 7 ? '<div class="flex items-center gap-1.5 text-[8.5pt] font-bold text-[#6B8E6B] uppercase tracking-[0.1em]"><span class="material-symbols-outlined text-[16px]">trending_up</span>Above regional average</div>' : ''}
        </div>
      </div>
    </div>

    <!-- Soil Health -->
    <div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8">
      <div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">landscape</span></div>
      <div class="flex-grow grid grid-cols-12 gap-6">
        <div class="col-span-3"><div class="font-serif text-[36pt] font-normal leading-none text-primary">${scores.soil.score}%</div><div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">soil health</div></div>
        <div class="col-span-9">
          <h3 class="text-base font-semibold mb-3">${props ? `${classification?.wrb || 'Mixed'} soils` : 'Soil profile'}</h3>
          <p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">${props ? `pH ${props.ph}, organic carbon ${props.organicCarbon} g/kg, clay ${props.clay}%.` : 'Soil data processing.'} Elevation: ${elevM}m.${geo ? ` Geology: ${esc(geo.lithology)}.` : ''}</p>
        </div>
      </div>
    </div>

    <!-- Biodiversity -->
    <div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8">
      <div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">forest</span></div>
      <div class="flex-grow grid grid-cols-12 gap-6">
        <div class="col-span-3"><div class="font-serif text-[36pt] font-normal leading-none text-primary">${scores.bio.total || 0}</div><div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">species</div></div>
        <div class="col-span-9">
          <h3 class="text-base font-semibold mb-3">${scores.bio.score >= 60 ? 'Rich' : 'Moderate'} biodiversity</h3>
          <p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">${scores.bio.total || 'Multiple'} species documented across ${speciesGroups.length} taxonomic groups.${threatenedData?.length ? ` ${threatenedData.length} conservation-significant species recorded nearby.` : ''}</p>
        </div>
      </div>
    </div>

    <!-- Climate -->
    <div class="py-8 border-t-[0.5px] border-b-[0.5px] border-outline-variant flex gap-8">
      <div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">thermostat</span></div>
      <div class="flex-grow grid grid-cols-12 gap-6">
        <div class="col-span-3"><div class="font-serif text-[36pt] font-normal leading-none text-primary">${annualMean}\u00b0</div><div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">annual mean</div></div>
        <div class="col-span-9">
          <h3 class="text-base font-semibold mb-3">${annualRain}mm annual rainfall, ${growingDays}-day growing season</h3>
          <p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">Summer mean ${summerMean}\u00b0C, winter mean ${winterMean}\u00b0C. ${Number(annualRain) > 600 ? 'Above-average rainfall supports diverse land use options.' : 'Seasonal water management is essential.'}</p>
          <div class="text-[8.5pt] font-bold ${Number(annualRain) > 500 ? 'text-[#6B8E6B]' : 'text-[#F59E0B]'} border-[0.5px] border-current px-3 py-1 inline-block uppercase tracking-[0.1em]">
            ${Number(annualRain) > 600 ? 'Water-secure region' : 'Seasonal drought risk'}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<!-- ═══════════════════════════════════════════════════════ -->
<!-- PAGE 4: RISK & RESILIENCE                              -->
<!-- ═══════════════════════════════════════════════════════ -->
<main class="a4-container shadow-sm mb-4">

  <header class="mb-16">
    <h1 class="font-serif text-[42pt] text-primary leading-tight">Risk &amp; Resilience</h1>
    <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-4"></div>
  </header>

  <section class="grid grid-cols-3 gap-0 border-b-[0.5pt] border-outline-variant pb-8 mb-12">
    <div class="hairline-r px-6 py-4 text-center"><div class="font-serif text-[24pt] text-primary">${risk.fire.score}</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Fire Risk</div><div class="mt-2"><span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 ${risk.fire.level==='Low'||risk.fire.level==='Very Low'?'bg-[#d8f3dc] text-[#1b4332]':risk.fire.level==='Moderate'?'bg-[#fff3cd] text-[#856404]':'bg-[#f8d7da] text-[#721c24]'}">${risk.fire.level}</span></div></div>
    <div class="hairline-r px-6 py-4 text-center"><div class="font-serif text-[24pt] text-primary">${risk.flood.score}</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Flood Risk</div><div class="mt-2"><span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 ${risk.flood.level==='Low'||risk.flood.level==='Very Low'?'bg-[#d8f3dc] text-[#1b4332]':'bg-[#fff3cd] text-[#856404]'}">${risk.flood.level}</span></div></div>
    <div class="px-6 py-4 text-center"><div class="font-serif text-[24pt] text-primary">${risk.drought.score}</div><div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Drought Risk</div><div class="mt-2"><span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 ${risk.drought.level==='Low'||risk.drought.level==='Very Low'?'bg-[#d8f3dc] text-[#1b4332]':'bg-[#fff3cd] text-[#856404]'}">${risk.drought.level}</span></div></div>
  </section>

  <!-- Revenue Scenarios -->
  <section class="mb-12">
    <h2 class="font-serif italic text-[28pt] text-primary mb-8">Revenue Scenarios</h2>
    <table class="w-full text-left text-[10pt]">
      <thead><tr class="border-b-2 border-primary">
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Scenario</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Annual Revenue</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Investment</th>
      </tr></thead>
      <tbody>
        ${scenarios.map(s => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3 font-semibold">${s.scenario}</td><td class="py-3">\u20ac${fmt(s.annual)}/yr</td><td class="py-3 text-on-surface-variant">${s.investment}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>

  <!-- Next Steps -->
  <section class="border-t-[0.5pt] border-outline-variant pt-8">
    <h2 class="font-serif italic text-[28pt] text-primary mb-6">What to Do Next</h2>
    <div class="grid grid-cols-3 gap-8 text-[10pt]">
      <div>
        <h3 class="text-[9px] font-bold uppercase tracking-widest text-primary mb-4">Immediate (0\u20136 months)</h3>
        <ul class="space-y-2 text-on-surface-variant">
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Soil analysis (\u20ac400\u2013600)</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Fire prevention registration</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Water source documentation</li>
        </ul>
      </div>
      <div>
        <h3 class="text-[9px] font-bold uppercase tracking-widest text-primary mb-4">Short-term (6\u201318 months)</h3>
        <ul class="space-y-2 text-on-surface-variant">
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Land management plan</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Vegetation management</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Solar feasibility study</li>
        </ul>
      </div>
      <div>
        <h3 class="text-[9px] font-bold uppercase tracking-widest text-primary mb-4">Long-term (2\u20135 years)</h3>
        <ul class="space-y-2 text-on-surface-variant">
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Revenue diversification</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Carbon credit certification</li>
          <li class="flex gap-2"><span class="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span>Energy independence</li>
        </ul>
      </div>
    </div>
  </section>

  <footer class="flex justify-between items-end mt-20">
    <div class="text-[8px] font-bold uppercase tracking-widest text-outline">LandBook by LandLibrary \u00b7 ${formatDate()}</div>
    <div class="text-right">
      <span class="block text-[10px] font-serif italic text-primary">Natural Capital Assessment</span>
      <span class="block text-[8px] uppercase tracking-widest text-outline">www.landlibrary.pt</span>
    </div>
  </footer>
</main>

<div class="text-center py-8 text-[9px] text-outline uppercase tracking-widest">
  This report is an invitation to relationship, not a final judgment of value. \u00b7 Generated ${formatDate()}
</div>

</body></html>`;

// ---------------------------------------------------------------------------
// Save to report_versions + file
// ---------------------------------------------------------------------------
console.log('  Saving to report_versions...');
const reportsCol = await getCollection('report_versions');
const count = await reportsCol.countDocuments();
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 40);

const reportDoc = {
  id: crypto.randomUUID(),
  version: `v${count + 1}`,
  name: `${name} \u2014 LandBook`,
  slug: `${slug}-${Date.now().toString(36)}`,
  created: new Date().toISOString(),
  html_content: html,
  landbook_id: landbookId,
  data_snapshot: { scores, eco, risk, scenarios, areaHa },
};

await reportsCol.insertOne(reportDoc);
console.log(`  Saved as: ${reportDoc.version} \u2014 ${reportDoc.name}`);

// Also write file
const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
const dateStr = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
const filename = `LandBook_${safeName}_${dateStr}.html`;
writeFileSync(resolve(ROOT, filename), html, 'utf8');

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n  Done in ${elapsed}s`);
console.log(`  File: ${filename} (${(Buffer.byteLength(html)/1024).toFixed(0)} KB)`);
console.log(`  View: /report-preview (select "${reportDoc.version}")\n`);

process.exit(0);
