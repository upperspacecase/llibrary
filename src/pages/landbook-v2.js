/**
 * LandBook Dashboard v2 — Paper Dashboard
 * Sidebar navigation + A4 canvas. Data lives on the landbook document.
 */

// ── Sections config ──────────────────────────────────────
const SECTIONS = [
  { id: 'executive',    label: 'Executive Summary',        icon: 'dashboard' },
  { id: 'cover',        label: 'Cover',                    icon: 'description' },
  { id: 'ecosystem',    label: 'Ecosystem Services',       icon: 'monitoring' },
  { id: 'scorecard',    label: 'Natural Capital Scorecard', icon: 'account_tree' },
  { id: 'terrain',      label: 'Terrain & Soil',           icon: 'inventory_2' },
  { id: 'water',        label: 'Water',                    icon: 'water_drop' },
  { id: 'climate',      label: 'Climate',                  icon: 'thermostat' },
  { id: 'biodiversity', label: 'Biodiversity & Habitat',   icon: 'nature_people' },
  { id: 'agriculture',  label: 'Agriculture',              icon: 'agriculture' },
  { id: 'opportunities',label: 'Opportunities',            icon: 'lightbulb' },
  { id: 'risks',        label: 'Risks',                    icon: 'warning' },
  { id: 'resilience',   label: 'Resilience',               icon: 'shield' },
  { id: 'regional',     label: 'Regional Context',         icon: 'public' },
  { id: 'trends',       label: 'Change Over Time',         icon: 'history' },
  { id: 'maps',         label: 'Map Portfolio',            icon: 'map' },
  { id: 'compliance',   label: 'Compliance',               icon: 'admin_panel_settings' },
  { id: 'actions',      label: 'Next Steps',               icon: 'arrow_forward_ios' },
  { id: 'methodology',  label: 'Methodology',              icon: 'settings' },
];

// ── State ────────────────────────────────────────────────
let landbook = null;
let data = null;       // landbook.data (the pipeline result)
let activeSection = 'executive';

// ── DOM refs ─────────────────────────────────────────────
const nav = document.getElementById('sidebar-nav');
const canvas = document.getElementById('canvas');
const refreshBtn = document.getElementById('refresh-btn');
const dataStatus = document.getElementById('data-status');

// ── Helpers ──────────────────────────────────────────────
function esc(v) { if (v == null) return '\u2014'; const d = document.createElement('div'); d.textContent = String(v); return d.innerHTML; }
function fmt(v, fn) { if (v == null || v === '' || v === undefined) return '\u2014'; return fn ? fn(v) : esc(v); }
function safeObj(v) { return v && typeof v === 'object' ? v : {}; }
function safeArr(v) { return Array.isArray(v) ? v : []; }

function riskBadge(level) {
  if (!level) return '';
  const l = String(level).toLowerCase();
  if (l === 'low' || l === 'very low') return `<span class="px-2 py-1 bg-zinc-200 text-zinc-700 text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
  if (l === 'moderate') return `<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
  return `<span class="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
}

function kpi(value, unit, label) {
  return `<div>
    <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">${esc(label)}</div>
    <div class="flex items-baseline gap-1">
      <span class="text-3xl font-black tracking-tighter text-zinc-900">${fmt(value)}</span>
      ${unit ? `<span class="text-sm text-zinc-400">${esc(unit)}</span>` : ''}
    </div>
  </div>`;
}

function tableHeader(...cols) {
  return `<thead><tr class="border-b border-zinc-200">${cols.map(c =>
    `<th class="py-3 text-[10px] font-bold tracking-widest text-zinc-400 uppercase text-left">${esc(c)}</th>`
  ).join('')}</tr></thead>`;
}

function tableRow(...cells) {
  return `<tr class="border-b border-zinc-100">${cells.map((c, i) =>
    `<td class="py-3 text-sm ${i === 0 ? 'font-bold text-zinc-900' : 'text-zinc-600'}">${c}</td>`
  ).join('')}</tr>`;
}

function sectionTitle(title) {
  return `<div class="mb-8">
    <h1 class="text-2xl font-bold tracking-tighter text-zinc-900 mb-2">${esc(title)}</h1>
    <div class="h-px bg-zinc-200 w-full"></div>
  </div>`;
}

function divider() { return '<div class="h-px bg-zinc-100 w-full my-6"></div>'; }

// ── Sidebar ──────────────────────────────────────────────
function renderNav() {
  nav.innerHTML = SECTIONS.map(s => `
    <a href="#" data-section="${s.id}" class="flex items-center gap-3 px-4 py-2 transition-colors duration-150 font-['Inter'] text-sm tracking-tight
      ${s.id === activeSection
        ? 'bg-zinc-200 text-zinc-900 font-bold'
        : 'text-zinc-500 hover:bg-zinc-200'}">
      <span class="material-symbols-outlined" style="font-size:20px">${s.icon}</span>
      <span>${s.label}</span>
    </a>
  `).join('');

  nav.addEventListener('click', e => {
    e.preventDefault();
    const link = e.target.closest('[data-section]');
    if (!link) return;
    activeSection = link.dataset.section;
    renderNav();
    renderCanvas();
  });
}

// ── Canvas ───────────────────────────────────────────────
function renderCanvas() {
  if (!data) {
    canvas.innerHTML = emptyState();
    return;
  }
  const renderer = renderers[activeSection];
  canvas.innerHTML = renderer ? `<div class="px-12 py-16">${renderer(data)}</div>` : emptyState();
}

function emptyState() {
  return `<div class="flex flex-col items-center justify-center h-full min-h-[500px] px-12 py-16 text-center">
    <span class="material-symbols-outlined text-6xl text-zinc-200 mb-8">architecture</span>
    <h2 class="text-2xl font-bold tracking-tighter text-zinc-900 mb-4">NO DATA YET</h2>
    <p class="text-zinc-400 text-sm tracking-tight uppercase mb-8">Click "Update Data" to fetch environmental data for this property.</p>
    <div class="h-px bg-zinc-100 w-full mb-8"></div>
    <div class="flex flex-col gap-4 text-left">
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-zinc-300"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-bold">22 API Sources</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-zinc-300"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-bold">18 Analysis Sections</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-zinc-300"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-zinc-500 font-bold">Cached On Your Landbook</span>
      </div>
    </div>
  </div>`;
}

// ── Section renderers ────────────────────────────────────

const renderers = {

  executive(d) {
    const p = safeObj(d.property);
    const scores = safeObj(d.scores);
    const eco = safeObj(d.economics);
    const fire = safeObj(d.fire);
    const water = safeObj(d.water);
    const ncs = scores.naturalCapital || 0;

    return `${sectionTitle('Executive Summary')}
    <div class="mb-8">
      <div class="text-lg font-bold text-zinc-900 mb-1">${esc(p.name)}</div>
      <div class="text-sm text-zinc-400">${esc(p.address)}</div>
    </div>
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(p.area ? p.area.toFixed(1) : null, 'ha', 'Total Area')}
      ${kpi(ncs, '/100', 'Natural Capital Score')}
      ${kpi(eco.valuePerHa ? '\u20ac' + eco.valuePerHa.toLocaleString() : null, '/ha', 'Ecosystem Value')}
      ${kpi(water.securityIndex, '/10', 'Water Security')}
    </div>
    ${divider()}
    <div class="grid grid-cols-3 gap-8">
      ${kpi(scores.carbon, '/100', 'Carbon Score')}
      ${kpi(scores.biodiversity, '/100', 'Biodiversity Score')}
      ${kpi(fire.riskLevel, '', 'Fire Risk')}
    </div>`;
  },

  cover(d) {
    const p = safeObj(d.property);
    const maps = safeObj(d.maps);
    const scores = safeObj(d.scores);
    const meta = safeObj(d.meta);
    const coords = safeObj(p.coords);

    return `<div class="relative min-h-[600px] flex flex-col justify-between -mx-12 -mt-16 -mb-0 px-12 pt-16 pb-12 bg-zinc-900 text-white overflow-hidden">
      ${maps.satellite ? `<img src="${esc(maps.satellite)}" class="absolute inset-0 w-full h-full object-cover opacity-30" alt=""/>` : ''}
      <div class="relative z-10">
        <div class="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">LANDBOOK</div>
        <div class="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Natural Capital Assessment</div>
      </div>
      <div class="relative z-10">
        <div class="text-4xl font-bold tracking-tighter mb-2">${esc(p.name)}</div>
        <div class="text-sm opacity-70 mb-6">${esc(p.address)}</div>
        <div class="flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          <span>${fmt(p.area, v => v.toFixed(1) + ' ha')}</span>
          <span>NCS ${fmt(scores.naturalCapital, v => v + '/100')}</span>
          <span>${fmt(coords.lat, v => v.toFixed(4))}${coords.lat != null ? ', ' : ''}${fmt(coords.lng, v => v.toFixed(4))}</span>
        </div>
      </div>
      <div class="relative z-10 text-[10px] opacity-50 text-right">
        ${fmt(meta.generatedAt)} \u00b7 ${fmt(meta.version)}
      </div>
    </div>`;
  },

  ecosystem(d) {
    const eco = safeObj(d.economics);
    const es = safeObj(eco.ecosystemServices);
    const npv = safeObj(eco.npv);
    const services = [
      { name: 'Water Provisioning', value: es.water || 0 },
      { name: 'Food & Fiber', value: es.food || 0 },
      { name: 'Carbon/Climate Regulation', value: es.carbon || 0 },
      { name: 'Water Regulation', value: es.regulation || 0 },
      { name: 'Soil Protection', value: es.soil || 0 },
      { name: 'Recreation/Cultural', value: es.cultural || 0 },
    ];
    const total = es.total || services.reduce((a, s) => a + s.value, 0);

    return `${sectionTitle('What This Land Provides')}
    <div class="text-center mb-8">
      <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Thirty-Year NPV</div>
      <div class="text-4xl font-black tracking-tighter text-zinc-900">\u20ac${fmt(npv.thirtyYear, v => v.toLocaleString())}</div>
    </div>
    ${divider()}
    <div class="grid grid-cols-3 gap-6 mb-8">
      ${services.map(s => {
        const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : 0;
        return `<div>
          <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-1">${esc(s.name)}</div>
          <div class="text-xl font-black text-zinc-900">\u20ac${s.value.toLocaleString()}</div>
          <div class="mt-2 h-1 bg-zinc-100"><div class="h-full bg-zinc-900" style="width:${pct}%"></div></div>
        </div>`;
      }).join('')}
    </div>
    ${divider()}
    <table class="w-full text-left">
      ${tableHeader('Service', 'Annual Value', '% of Total')}
      <tbody>
        ${services.map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : '0';
          return tableRow(s.name, '\u20ac' + s.value.toLocaleString(), pct + '%');
        }).join('')}
      </tbody>
    </table>`;
  },

  scorecard(d) {
    const scores = safeObj(d.scores);
    const reg = safeObj(scores.regional);
    const dims = [
      { label: 'Carbon', score: scores.carbon || 0, avg: reg.carbon || 0 },
      { label: 'Biodiversity', score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
      { label: 'Water', score: scores.water || 0, avg: reg.water || 0 },
      { label: 'Soil', score: scores.soil || 0, avg: reg.soil || 0 },
      { label: 'Pollination', score: scores.pollination || 0, avg: reg.pollination || 0 },
    ];

    return `${sectionTitle('How This Land Performs')}
    <div class="text-center mb-8">
      <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Natural Capital Score</div>
      <div class="text-5xl font-black tracking-tighter text-zinc-900">${scores.naturalCapital || 0}</div>
      <div class="text-sm text-zinc-400">/100</div>
    </div>
    ${divider()}
    ${dims.map(dim => {
      const diff = dim.score - dim.avg;
      const sign = diff > 0 ? '+' : '';
      const pct = Math.min(dim.score, 100);
      return `<div class="flex items-center gap-6 py-4 border-b border-zinc-100 last:border-0">
        <div class="w-24 text-sm font-bold text-zinc-900">${dim.label}</div>
        <div class="flex-1">
          <div class="h-2 bg-zinc-100 w-full"><div class="h-full bg-zinc-900" style="width:${pct}%"></div></div>
        </div>
        <div class="w-12 text-right text-sm font-black text-zinc-900">${dim.score}</div>
        <div class="w-20 text-right text-[10px] font-bold ${diff >= 0 ? 'text-zinc-500' : 'text-red-500'}">${sign}${diff} vs avg</div>
      </div>`;
    }).join('')}`;
  },

  terrain(d) {
    const terrain = safeObj(d.terrain);
    const soil = safeObj(d.soil);
    const geo = safeObj(d.geology);

    return `${sectionTitle('Terrain & Soil')}
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(terrain.elevation, 'm', 'Elevation')}
      ${kpi(terrain.slope, '%', 'Slope')}
      ${kpi(terrain.aspect, '', 'Aspect')}
      ${kpi(terrain.range, 'm', 'Relief')}
    </div>
    ${divider()}
    <table class="w-full text-left mb-6">
      ${tableHeader('Soil Property', 'Value')}
      <tbody>
        ${tableRow('Classification', fmt(soil.classification))}
        ${tableRow('pH', fmt(soil.ph, v => v.toFixed(1)))}
        ${tableRow('Organic Carbon', fmt(soil.organicCarbon, v => v + ' g/kg'))}
        ${tableRow('Clay / Sand / Silt', `${fmt(soil.clay, v => v + '%')} / ${fmt(soil.sand, v => v + '%')} / ${fmt(soil.silt, v => v + '%')}`)}
        ${tableRow('Nitrogen', fmt(soil.nitrogen))}
        ${tableRow('CEC', fmt(soil.cec))}
        ${tableRow('Bulk Density', fmt(soil.bulkDensity))}
      </tbody>
    </table>
    ${divider()}
    <table class="w-full text-left">
      ${tableHeader('Geology', 'Value')}
      <tbody>
        ${tableRow('Lithology', fmt(geo.lithology))}
        ${tableRow('Environment', fmt(geo.environment))}
        ${tableRow('Period', fmt(geo.period))}
        ${tableRow('Age', fmt(geo.age))}
      </tbody>
    </table>`;
  },

  water(d) {
    const w = safeObj(d.water);
    const climate = safeObj(d.climate);

    return `${sectionTitle('Water')}
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(w.securityIndex, '/10', 'Security Index')}
      ${kpi(w.springs, '', 'Springs')}
      ${kpi(w.wells, '', 'Wells')}
      ${kpi(w.waterways, '', 'Waterways')}
    </div>
    ${divider()}
    <table class="w-full text-left">
      ${tableHeader('Metric', 'Value')}
      <tbody>
        ${tableRow('Water Bodies', fmt(w.waterBodies))}
        ${tableRow('Flood Discharge', fmt(w.floodDischarge))}
        ${tableRow('Flood Risk', riskBadge(w.floodRisk))}
        ${tableRow('Annual Rainfall', fmt(climate.annualRainfall, v => Math.round(v) + ' mm'))}
      </tbody>
    </table>`;
  },

  climate(d) {
    const c = safeObj(d.climate);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const highs = safeArr(c.monthlyAvgHigh);
    const lows = safeArr(c.monthlyAvgLow);
    const precip = safeArr(c.monthlyPrecip);

    return `${sectionTitle('Climate')}
    <div class="grid grid-cols-5 gap-6 mb-8">
      ${kpi(c.annualMeanTemp != null ? c.annualMeanTemp.toFixed(1) : null, '\u00b0C', 'Mean Temp')}
      ${kpi(c.summerMean != null ? c.summerMean.toFixed(1) : null, '\u00b0C', 'Summer')}
      ${kpi(c.winterMean != null ? c.winterMean.toFixed(1) : null, '\u00b0C', 'Winter')}
      ${kpi(c.annualRainfall != null ? Math.round(c.annualRainfall) : null, 'mm', 'Annual Rainfall')}
      ${kpi(c.growingSeason, 'months', 'Growing Season')}
    </div>
    ${divider()}
    <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">Climate Zone</div>
    <div class="text-lg font-bold text-zinc-900 mb-6">${fmt(c.zone)}</div>
    ${divider()}
    ${highs.length === 12 ? `
    <table class="w-full text-left text-sm">
      ${tableHeader('Month', 'High \u00b0C', 'Low \u00b0C', 'Precip mm')}
      <tbody>
        ${months.map((m, i) => tableRow(m, fmt(highs[i], v => v.toFixed(1)), fmt(lows[i], v => v.toFixed(1)), fmt(precip[i]))).join('')}
      </tbody>
    </table>` : ''}`;
  },

  biodiversity(d) {
    const sp = safeObj(d.species);
    const groups = safeArr(sp.groups);
    const top10 = safeArr(sp.top10);
    const trends = safeObj(sp.trends);

    return `${sectionTitle('Biodiversity & Habitat')}
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(sp.total, '', 'Total Species')}
      ${kpi(sp.threatened, '', 'Threatened')}
      ${kpi(sp.gbifTotal, '', 'GBIF Records')}
      ${kpi(trends.direction, '', 'Trend')}
    </div>
    ${divider()}
    ${groups.length > 0 ? `
    <table class="w-full text-left mb-6">
      ${tableHeader('Taxonomic Group', 'Count')}
      <tbody>${groups.map(g => tableRow(g.name || g.group || '', fmt(g.count || g.value))).join('')}</tbody>
    </table>
    ${divider()}` : ''}
    ${top10.length > 0 ? `
    <table class="w-full text-left">
      ${tableHeader('Species', 'Group', 'Observations')}
      <tbody>${top10.map(s => tableRow(s.name || '', s.group || '', fmt(s.count))).join('')}</tbody>
    </table>` : ''}`;
  },

  agriculture(d) {
    const ag = safeObj(d.agriculture);
    const systems = safeArr(ag.systems);

    return `${sectionTitle('Agriculture')}
    <div class="mb-6">
      <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Land Cover</div>
      <div class="text-lg font-bold text-zinc-900">${fmt(ag.landCover)}</div>
    </div>
    ${divider()}
    ${systems.length > 0 ? `
    <table class="w-full text-left">
      ${tableHeader('System', 'Description', 'Suitability')}
      <tbody>${systems.map(s => tableRow(
        fmt(s.name || s.system),
        fmt(s.description || s.detail),
        fmt(s.suitability || s.rating)
      )).join('')}</tbody>
    </table>` : '<p class="text-sm text-zinc-400">No agricultural systems data available.</p>'}`;
  },

  opportunities(d) {
    const eco = safeObj(d.economics);
    const rev = safeObj(eco.revenueScenarios);
    const details = safeArr(rev.details);

    return `${sectionTitle('Opportunities')}
    <div class="grid grid-cols-3 gap-8 mb-8">
      ${kpi(rev.conservative != null ? '\u20ac' + rev.conservative.toLocaleString() : null, '/yr', 'Conservative')}
      ${kpi(rev.moderate != null ? '\u20ac' + rev.moderate.toLocaleString() : null, '/yr', 'Moderate')}
      ${kpi(rev.optimized != null ? '\u20ac' + rev.optimized.toLocaleString() : null, '/yr', 'Optimized')}
    </div>
    ${divider()}
    <div class="grid grid-cols-2 gap-8 mb-6">
      ${kpi(eco.carbonStock ? eco.carbonStock.toLocaleString() + ' tC' : null, '', 'Carbon Stock')}
      ${kpi(eco.carbonCreditValue ? '\u20ac' + eco.carbonCreditValue.toLocaleString() : null, '/yr', 'Carbon Credit Value')}
    </div>
    ${details.length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('Revenue Stream', 'Estimate')}
      <tbody>${details.map(item => tableRow(
        fmt(item.name || item.label),
        fmt(item.value || item.estimate, v => '\u20ac' + v.toLocaleString())
      )).join('')}</tbody>
    </table>` : ''}`;
  },

  risks(d) {
    const fire = safeObj(d.fire);
    const flood = safeObj(d.flood);
    const drought = safeObj(d.drought);

    return `${sectionTitle('Risks')}
    <div class="grid grid-cols-3 gap-8 mb-8">
      <div>
        <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Fire Risk</div>
        <div class="text-3xl font-black text-zinc-900 mb-1">${fmt(fire.riskScore, v => v + '/5')}</div>
        ${riskBadge(fire.riskLevel)}
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Flood Risk</div>
        <div class="text-3xl font-black text-zinc-900 mb-1">${fmt(flood.riskScore, v => v + '/5')}</div>
        ${riskBadge(flood.riskLevel)}
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Drought Risk</div>
        <div class="text-3xl font-black text-zinc-900 mb-1">${fmt(drought.riskScore, v => v + '/5')}</div>
        ${riskBadge(drought.riskLevel)}
      </div>
    </div>
    ${fire.activeFires ? `${divider()}
    <div class="flex items-center gap-3 p-4 bg-zinc-100 mb-6">
      <span class="material-symbols-outlined text-red-500" style="font-size:20px">local_fire_department</span>
      <span class="text-sm text-zinc-900 font-bold">Active fires within monitoring radius: ${fire.activeFires}</span>
    </div>` : ''}
    ${safeArr(fire.historical).length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('Year', 'Fire Detections')}
      <tbody>${fire.historical.map(h => tableRow(h.year, fmt(h.count))).join('')}</tbody>
    </table>` : ''}`;
  },

  resilience(d) {
    const energy = safeObj(d.energy);
    const sources = [
      { label: 'Solar', data: safeObj(energy.solar) },
      { label: 'Wind', data: safeObj(energy.wind) },
      { label: 'Micro-Hydro', data: safeObj(energy.microHydro) },
      { label: 'Biomass', data: safeObj(energy.biomass) },
    ];

    return `${sectionTitle('Resilience')}
    <div class="mb-8">
      ${kpi(energy.independenceScore, '/10', 'Energy Independence Score')}
    </div>
    ${divider()}
    <table class="w-full text-left">
      ${tableHeader('Energy Source', 'Potential', 'Detail')}
      <tbody>${sources.map(s => tableRow(
        s.label,
        fmt(s.data.level || s.data.score || s.data),
        fmt(s.data.detail || '')
      )).join('')}</tbody>
    </table>`;
  },

  regional(d) {
    const regional = safeObj(d.regional);
    const pctls = safeObj(regional.percentiles);
    const areas = safeArr(regional.protectedAreas);

    return `${sectionTitle('Regional Context')}
    <div class="grid grid-cols-3 gap-8 mb-8">
      ${kpi(pctls.soil != null ? pctls.soil + 'th' : null, '', 'Soil Percentile')}
      ${kpi(pctls.carbon != null ? pctls.carbon + 'th' : null, '', 'Carbon Percentile')}
      ${kpi(pctls.biodiversity != null ? pctls.biodiversity + 'th' : null, '', 'Biodiversity Percentile')}
    </div>
    ${areas.length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('Protected Area', 'Type', 'Designation')}
      <tbody>${areas.map(a => tableRow(a.name, fmt(a.type), fmt(a.designation))).join('')}</tbody>
    </table>` : ''}`;
  },

  trends(d) {
    const trends = safeObj(d.trends);
    const eco = safeObj(d.economics);
    const npvScenarios = safeArr(safeObj(eco.npv).scenarios);
    const fireDecades = safeArr(trends.fireProneByDecade);

    return `${sectionTitle('Change Over Time')}
    <div class="grid grid-cols-2 gap-8 mb-8">
      <div>
        <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Temp Trend / Decade</div>
        <div class="text-3xl font-black tracking-tighter text-zinc-900">${fmt(trends.tempPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(2))}\u00b0C</div>
      </div>
      <div>
        <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Precip Trend / Decade</div>
        <div class="text-3xl font-black tracking-tighter text-zinc-900">${fmt(trends.precipPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(1))} mm</div>
      </div>
    </div>
    ${npvScenarios.length > 0 ? `${divider()}
    <table class="w-full text-left mb-6">
      ${tableHeader('NPV Scenario', '30-Year Value', 'Risk')}
      <tbody>${npvScenarios.map(s => tableRow(
        fmt(s.name), fmt(s.npv, v => '\u20ac' + v.toLocaleString()), riskBadge(s.riskLevel)
      )).join('')}</tbody>
    </table>` : ''}
    ${fireDecades.length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('Decade', 'Fire-Prone Days')}
      <tbody>${fireDecades.map(t => tableRow(fmt(t.decade || t.label), fmt(t.avgDays || t.days || t.value))).join('')}</tbody>
    </table>` : ''}`;
  },

  maps(d) {
    const maps = safeObj(d.maps);
    const entries = [
      { key: 'satellite', title: 'Satellite View' },
      { key: 'overview', title: 'Overview' },
      { key: 'regional', title: 'Regional Context' },
      { key: 'detail', title: 'Property Detail' },
    ];

    return `${sectionTitle('Map Portfolio')}
    <div class="grid grid-cols-2 gap-4">
      ${entries.map(e => {
        const src = maps[e.key];
        return `<div class="border border-zinc-200 overflow-hidden">
          <div class="h-48 bg-zinc-50">
            ${src
              ? `<img src="${esc(src)}" alt="${esc(e.title)}" class="w-full h-full object-cover"/>`
              : `<div class="w-full h-full flex items-center justify-center text-zinc-300 text-sm">Not available</div>`}
          </div>
          <div class="px-3 py-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">${esc(e.title)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  compliance(d) {
    const comp = safeObj(d.compliance);
    const items = safeArr(comp.items);
    const timeline = safeArr(comp.timeline);

    return `${sectionTitle('Compliance')}
    ${items.length > 0 ? `
    <table class="w-full text-left mb-6">
      ${tableHeader('Regulation', 'Status', 'Notes')}
      <tbody>${items.map(i => tableRow(
        fmt(i.name || i.regulation),
        riskBadge(i.status || i.level),
        fmt(i.description || i.notes || i.detail)
      )).join('')}</tbody>
    </table>` : '<p class="text-sm text-zinc-400 mb-6">No compliance data available.</p>'}
    ${timeline.length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('Year', 'Event')}
      <tbody>${timeline.map(t => tableRow(
        String(t.deadline || t.year || t.date || ''),
        t.action || t.event || t.description || ''
      )).join('')}</tbody>
    </table>` : ''}`;
  },

  actions(d) {
    const actions = safeObj(d.actions);

    function group(title, items) {
      const list = safeArr(items);
      if (!list.length) return '';
      return `<div class="mb-6">
        <div class="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400 mb-3">${esc(title)}</div>
        ${list.map(a => `<div class="py-3 border-b border-zinc-100">
          <div class="text-sm font-bold text-zinc-900">${fmt(a.action || a.name || a.description)}</div>
          <div class="flex gap-4 mt-1">
            ${a.priority ? `<span class="text-[10px] uppercase tracking-widest text-zinc-400">Priority: ${esc(a.priority)}</span>` : ''}
            ${a.impact ? `<span class="text-[10px] uppercase tracking-widest text-zinc-400">Impact: ${esc(a.impact)}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>`;
    }

    return `${sectionTitle('Next Steps')}
    ${group('Immediate Actions', actions.immediate)}
    ${group('Short-Term Actions', actions.shortTerm)}
    ${group('Long-Term Actions', actions.longTerm)}
    ${!safeArr(actions.immediate).length && !safeArr(actions.shortTerm).length && !safeArr(actions.longTerm).length
      ? '<p class="text-sm text-zinc-400">No action items generated yet.</p>' : ''}`;
  },

  methodology(d) {
    const meta = safeObj(d.meta);
    const apiStatus = safeObj(meta.apiStatus);
    const sources = [
      { name: 'GBIF', desc: 'Global Biodiversity Information Facility' },
      { name: 'SoilGrids', desc: 'ISRIC \u2014 global soil predictions at 250m' },
      { name: 'ERA5', desc: 'ECMWF \u2014 climate reanalysis' },
      { name: 'Copernicus', desc: 'EU Earth Observation \u2014 land cover' },
      { name: 'OpenStreetMap', desc: 'Water features and infrastructure' },
      { name: 'FIRMS', desc: 'NASA Fire Information' },
      { name: 'Macrostrat', desc: 'Geological data' },
      { name: 'iNaturalist', desc: 'Species occurrence records' },
    ];

    const statusEntries = Object.entries(apiStatus);
    const okCount = statusEntries.filter(([, v]) => v === 'ok').length;
    const failCount = statusEntries.filter(([, v]) => v !== 'ok').length;

    return `${sectionTitle('Methodology')}
    <div class="grid grid-cols-2 gap-8 mb-6">
      ${kpi(fmt(meta.generatedAt), '', 'Generated')}
      ${kpi(fmt(meta.version), '', 'Pipeline Version')}
    </div>
    ${divider()}
    <div class="mb-6">
      <div class="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">API Coverage</div>
      <div class="text-sm text-zinc-900 font-bold">${okCount} succeeded, ${failCount} failed of ${statusEntries.length} sources</div>
    </div>
    ${divider()}
    <table class="w-full text-left mb-6">
      ${tableHeader('Source', 'Description')}
      <tbody>${sources.map(s => tableRow(s.name, s.desc)).join('')}</tbody>
    </table>
    ${statusEntries.length > 0 ? `${divider()}
    <table class="w-full text-left">
      ${tableHeader('API', 'Status')}
      <tbody>${statusEntries.map(([k, v]) => tableRow(k, v === 'ok'
        ? '<span class="text-[10px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1">OK</span>'
        : `<span class="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1">FAIL</span>`
      )).join('')}</tbody>
    </table>` : ''}`;
  },
};

// ── Refresh handler ──────────────────────────────────────
refreshBtn.addEventListener('click', async () => {
  if (!landbook) return;
  refreshBtn.disabled = true;
  refreshBtn.innerHTML = `
    <span class="material-symbols-outlined spinner" style="font-size:20px">sync</span>
    <span>Fetching data...</span>`;

  try {
    const res = await fetch(`/api/landbooks/${landbook.id}/refresh`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const result = await res.json();
    data = result.data;
    dataStatus.textContent = 'Updated: ' + new Date().toLocaleString();
    renderCanvas();
  } catch (err) {
    dataStatus.textContent = 'Error: ' + err.message;
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:20px">sync</span>
      <span>Update Data</span>`;
  }
});

// ── Init ─────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    canvas.innerHTML = `<div class="flex items-center justify-center h-full min-h-[500px] px-12 py-16">
      <p class="text-zinc-400 text-sm">No landbook ID provided. Add ?id=your-landbook-id to the URL.</p>
    </div>`;
    return;
  }

  try {
    const res = await fetch(`/api/landbooks/${id}`);
    if (!res.ok) throw new Error('Landbook not found');
    landbook = await res.json();
  } catch {
    canvas.innerHTML = `<div class="flex items-center justify-center h-full min-h-[500px] px-12 py-16">
      <p class="text-zinc-400 text-sm">Landbook not found.</p>
    </div>`;
    return;
  }

  // Use cached data if available
  data = landbook.data || null;

  if (data?.dataUpdated || landbook.dataUpdated) {
    dataStatus.textContent = 'Last updated: ' + new Date(landbook.dataUpdated || data.meta?.generatedAt).toLocaleString();
  }

  // Update sidebar branding with property name
  const versionEl = document.getElementById('sidebar-version');
  if (landbook.address) {
    versionEl.textContent = landbook.address.split(',')[0].trim();
  }

  renderNav();
  renderCanvas();
}

init();
