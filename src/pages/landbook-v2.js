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
  if (l === 'low' || l === 'very low') return `<span class="px-2 py-1 bg-brand-forest/20 text-brand-forest text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
  if (l === 'moderate') return `<span class="px-2 py-1 bg-brand-amber/20 text-brand-amber text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
  return `<span class="px-2 py-1 bg-brand-terracotta/20 text-brand-terracotta text-[10px] font-bold">${esc(level).toUpperCase()}</span>`;
}

function kpi(value, unit, label) {
  return `<div>
    <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">${esc(label)}</div>
    <div class="flex items-baseline gap-1">
      <span class="text-3xl font-black tracking-tighter text-brand-forest">${fmt(value)}</span>
      ${unit ? `<span class="text-sm text-brand-sage">${esc(unit)}</span>` : ''}
    </div>
  </div>`;
}

function heroFigure(value, label) {
  return `<div class="text-center">
    <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">${esc(label)}</div>
    <p class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(value)}</p>
  </div>`;
}

function gauge(value, max, color, label) {
  const fraction = Math.min(Math.max((value || 0) / max, 0), 1);
  const halfCircle = 141.37;
  const full = 282.74;
  const filled = halfCircle * fraction;
  const colors = {
    forest: '#3f6653',
    amber: '#D4A574',
    terracotta: '#C4705A',
    sage: '#8B9A7E',
  };
  const stroke = colors[color] || colors.forest;
  return `<div class="text-center">
    <div class="relative w-32 h-16 mx-auto overflow-hidden">
      <svg class="gauge-svg w-32 h-32 absolute top-0 left-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E7EEFE" stroke-width="10" stroke-dasharray="${halfCircle} ${full}"></circle>
        <circle cx="50" cy="50" r="45" fill="none" stroke="${stroke}" stroke-width="10" stroke-dasharray="${filled} ${full}"></circle>
      </svg>
      <div class="absolute bottom-0 w-full text-center">
        <span class="text-lg font-bold text-brand-forest">${fmt(value)}</span>
      </div>
    </div>
    <p class="text-[10px] font-bold tracking-widest text-brand-forest uppercase mt-2">${esc(label)}</p>
  </div>`;
}

function stackedBar(segments, totalValue, label) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0) || 1;
  const colors = ['bg-brand-forest', 'bg-brand-sage', 'bg-brand-amber', 'bg-brand-terracotta', 'bg-brand-charcoal'];
  return `<div>
    <div class="flex justify-between items-end mb-4">
      <h4 class="text-[10px] font-bold tracking-widest text-brand-forest uppercase">${esc(label)}</h4>
      ${totalValue ? `<p class="text-[14.4px] font-bold text-brand-forest">${totalValue}</p>` : ''}
    </div>
    <div class="flex h-12 w-full">
      ${segments.map((s, i) => {
        const pct = ((s.value / total) * 100).toFixed(1);
        return `<div class="h-full ${colors[i % colors.length]}" style="width: ${pct}%;"></div>`;
      }).join('')}
    </div>
    <div class="flex gap-6 mt-4">
      ${segments.map((s, i) => {
        const pct = ((s.value / total) * 100).toFixed(0);
        return `<div class="flex items-center gap-2"><div class="w-2 h-2 ${colors[i % colors.length]}"></div><span class="text-[10px] font-bold text-brand-forest">${esc(s.name)} ${pct}%</span></div>`;
      }).join('')}
    </div>
  </div>`;
}

function percentileCard(icon, value, suffix, description) {
  return `<div class="flex gap-8 items-start">
    <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
      <span class="material-symbols-outlined text-brand-cream text-3xl">${esc(icon)}</span>
    </div>
    <div>
      <div class="flex items-baseline gap-4 mb-2">
        <span class="text-[30px] font-black text-brand-forest">${fmt(value)}</span>
        ${suffix ? `<span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">${esc(suffix)}</span>` : ''}
      </div>
      ${description ? `<p class="text-sm text-on-surface leading-relaxed max-w-[300px]">${esc(description)}</p>` : ''}
    </div>
  </div>`;
}

function pullQuote(text) {
  if (!text) return '';
  return `<div class="flex justify-end py-4">
    <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
      <p class="serif-title text-xl text-brand-forest leading-relaxed">"${esc(text)}"</p>
    </blockquote>
  </div>`;
}

function recommendationBox(label, text) {
  if (!text) return '';
  return `<div class="py-8">
    <span class="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">${esc(label)}</span>
    <p class="text-brand-forest font-medium leading-relaxed">${esc(text)}</p>
  </div>`;
}

function swatchRow(items) {
  if (!items || !items.length) return '';
  const colors = ['bg-brand-forest', 'bg-brand-sage', 'bg-brand-amber', 'bg-brand-terracotta', 'bg-brand-charcoal'];
  return `<div class="flex gap-1">
    ${items.map((item, i) => `<div class="flex-1 ${colors[i % colors.length]} p-4 h-24 flex flex-col justify-end">
      <span class="text-[9px] font-bold text-brand-cream uppercase tracking-widest">${esc(item)}</span>
    </div>`).join('')}
  </div>`;
}

function seasonalGrid(seasons) {
  if (!seasons || !seasons.length) return '';
  const tagColors = ['bg-[#8B9A7E]', 'bg-[#1B3A2F]', 'bg-[#C4705A]', 'bg-[#D4A574]'];
  return `<div class="grid grid-cols-4 gap-8">
    ${seasons.map((s, i) => `<div>
      <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">${esc(s.period)}</span>
      <div class="mb-4">
        <span class="inline-block ${tagColors[i % tagColors.length]} text-white px-3 py-1 text-[10px] font-bold">${esc(s.tag)}</span>
      </div>
      <p class="text-[13px] text-brand-forest leading-relaxed">${esc(s.description)}</p>
    </div>`).join('')}
  </div>`;
}

function tableHeader(...cols) {
  return `<thead><tr class="border-b-[0.5px] border-brand-sage">${cols.map(c =>
    `<th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase text-left">${esc(c)}</th>`
  ).join('')}</tr></thead>`;
}

function tableRow(...cells) {
  return `<tr class="border-b-[0.5px] border-brand-sage/20">${cells.map((c, i) =>
    `<td class="py-3 text-sm ${i === 0 ? 'font-bold text-brand-forest' : 'text-on-surface'}">${c}</td>`
  ).join('')}</tr>`;
}

function sectionTitle(title) {
  return `<div class="mb-8">
    <h1 class="serif-title text-[24px] text-brand-forest mb-4">${esc(title)}</h1>
    <div class="hairline"></div>
  </div>`;
}

function divider() { return '<div class="hairline my-6"></div>'; }

// ── Sidebar ──────────────────────────────────────────────
function renderNav() {
  nav.innerHTML = SECTIONS.map(s => `
    <a href="#" data-section="${s.id}" class="flex items-center gap-3 px-4 py-2 transition-colors duration-150 text-sm tracking-tight
      ${s.id === activeSection
        ? 'bg-brand-forest/10 text-brand-forest font-bold'
        : 'text-brand-sage hover:bg-brand-sage/10'}">
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
    <span class="material-symbols-outlined text-6xl text-brand-sage/30 mb-8">architecture</span>
    <h2 class="serif-title text-2xl text-brand-forest mb-4">No Data Yet</h2>
    <p class="text-brand-sage text-sm tracking-tight uppercase mb-8">Click "Update Data" to fetch environmental data for this property.</p>
    <div class="hairline mb-8"></div>
    <div class="flex flex-col gap-4 text-left">
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-brand-forest"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-brand-forest font-bold">22 API Sources</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-brand-forest"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-brand-forest font-bold">18 Analysis Sections</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-2 h-2 bg-brand-forest"></div>
        <span class="text-[10px] tracking-[0.2em] uppercase text-brand-forest font-bold">Cached On Your Landbook</span>
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
      <div class="serif-title text-lg text-brand-forest mb-1">${esc(p.name)}</div>
      <div class="text-sm text-brand-sage">${esc(p.address)}</div>
    </div>
    <div class="grid grid-cols-3 gap-8 mb-8">
      ${gauge(ncs, 100, 'forest', 'Natural Capital')}
      ${gauge(water.securityIndex, 10, 'forest', 'Water Security')}
      ${gauge(fire.riskScore, 5, 'terracotta', 'Fire Risk')}
    </div>
    ${divider()}
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(p.area ? p.area.toFixed(1) : null, 'ha', 'Total Area')}
      ${kpi(eco.valuePerHa ? '\u20ac' + eco.valuePerHa.toLocaleString() : null, '/ha', 'Ecosystem Value')}
      ${kpi(scores.carbon, '/100', 'Carbon Score')}
      ${kpi(scores.biodiversity, '/100', 'Biodiversity Score')}
    </div>`;
  },

  cover(d) {
    const p = safeObj(d.property);
    const maps = safeObj(d.maps);
    const scores = safeObj(d.scores);
    const meta = safeObj(d.meta);
    const coords = safeObj(p.coords);

    function toDMS(dec, isLat) {
      const abs = Math.abs(dec);
      const deg = Math.floor(abs);
      const minFloat = (abs - deg) * 60;
      const min = Math.floor(minFloat);
      const sec = ((minFloat - min) * 60).toFixed(1);
      const dir = isLat ? (dec >= 0 ? 'N' : 'S') : (dec >= 0 ? 'E' : 'W');
      return `${deg}\u00b0 ${min}' ${sec}" ${dir}`;
    }

    const coordStr = coords.lat != null && coords.lng != null
      ? `${toDMS(coords.lat, true)}, ${toDMS(coords.lng, false)}`
      : '';

    return `<div class="relative min-h-[600px] flex flex-col justify-between -mx-12 -mt-16 -mb-0 px-12 pt-16 pb-12 bg-brand-forest text-brand-cream overflow-hidden">
      ${maps.satellite ? `<img src="${esc(maps.satellite)}" class="absolute inset-0 w-full h-full object-cover opacity-20" alt=""/>` : ''}
      <div class="relative z-10">
        <div class="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">LANDBOOK</div>
        <div class="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Natural Capital Assessment</div>
      </div>
      <div class="relative z-10">
        <div class="serif-title text-5xl text-brand-cream mb-2">${esc(p.name)}</div>
        <div class="text-sm opacity-70 mb-6">${esc(p.address)}</div>
        <div class="flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          <span>${fmt(p.area, v => v.toFixed(1) + ' ha')}</span>
          <span>NCS ${fmt(scores.naturalCapital, v => v + '/100')}</span>
          <span>${coordStr}</span>
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
      { name: 'Water', value: es.water || 0 },
      { name: 'Food', value: es.food || 0 },
      { name: 'Carbon', value: es.carbon || 0 },
      { name: 'Regulation', value: es.regulation || 0 },
      { name: 'Soil', value: es.soil || 0 },
      { name: 'Cultural', value: es.cultural || 0 },
    ];
    const total = es.total || services.reduce((a, s) => a + s.value, 0);

    return `${sectionTitle('What This Land Provides')}
    ${heroFigure('\u20ac' + fmt(npv.thirtyYear, v => v.toLocaleString()), 'Thirty-Year NPV')}
    ${divider()}
    ${stackedBar(
      services.filter(s => s.value > 0),
      '\u20ac' + total.toLocaleString(),
      'Valuation Composition'
    )}
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
    ${heroFigure(scores.naturalCapital || 0, 'Natural Capital Score')}
    <div class="text-center text-sm text-brand-sage mb-8">/100</div>
    ${divider()}
    ${dims.map(dim => {
      const diff = dim.score - dim.avg;
      const sign = diff > 0 ? '+' : '';
      const pct = Math.min(dim.score, 100);
      return `<div class="flex items-center gap-6 py-4 border-b-[0.5px] border-brand-sage/20 last:border-0">
        <div class="w-24 text-sm font-bold text-brand-forest">${dim.label}</div>
        <div class="flex-1">
          <div class="h-2 bg-brand-sage/20 w-full"><div class="h-full bg-brand-forest" style="width:${pct}%"></div></div>
        </div>
        <div class="w-12 text-right text-sm font-black text-brand-forest">${dim.score}</div>
        <div class="w-20 text-right text-[10px] font-bold ${diff >= 0 ? 'text-brand-sage' : 'text-brand-terracotta'}">${sign}${diff} vs avg</div>
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
    ${terrain.slope != null ? percentileCard('terrain', terrain.slope + '%', 'Slope grade', 'The slope profile influences water runoff patterns, erosion risk, and agricultural suitability.') : ''}
    ${terrain.slope != null ? divider() : ''}
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
    <div class="flex justify-center mb-8">
      ${gauge(w.securityIndex, 10, 'forest', 'Water Security Index')}
    </div>
    ${divider()}
    <div class="grid grid-cols-3 gap-8 mb-8">
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
    <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-3">Climate Zone</div>
    <div class="serif-title text-lg text-brand-forest mb-6">${fmt(c.zone)}</div>
    ${divider()}
    <h4 class="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase mb-8">SEASONAL MANAGEMENT</h4>
    ${seasonalGrid([
      { period: 'JAN\u2013MAR', tag: 'RECHARGE', description: 'Peak aquifer saturation window. Highest rainfall period.' },
      { period: 'APR\u2013MAY', tag: 'GROWTH', description: 'Maximum biomass production phase. Ideal planting.' },
      { period: 'JUN\u2013AUG', tag: 'DORMANCY', description: 'Highest evaporation vulnerability. Fire risk peaks.' },
      { period: 'SEP\u2013DEC', tag: 'HARVEST', description: 'Ideal for soil remediation and preparation works.' },
    ])}
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
    const habitatTypes = groups.slice(0, 5).map(g => g.name || g.group || '');

    return `${sectionTitle('Biodiversity & Habitat')}
    <div class="grid grid-cols-4 gap-8 mb-8">
      ${kpi(sp.total, '', 'Total Species')}
      ${kpi(sp.threatened, '', 'Threatened')}
      ${kpi(sp.gbifTotal, '', 'GBIF Records')}
      ${kpi(trends.direction, '', 'Trend')}
    </div>
    ${divider()}
    ${habitatTypes.length > 0 ? swatchRow(habitatTypes) : ''}
    ${habitatTypes.length > 0 ? divider() : ''}
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
      <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Land Cover</div>
      <div class="serif-title text-lg text-brand-forest">${fmt(ag.landCover)}</div>
    </div>
    ${divider()}
    ${systems.length > 0 ? `
    ${swatchRow(systems.slice(0, 4).map(s => s.name || s.system || ''))}
    ${divider()}
    <table class="w-full text-left">
      ${tableHeader('System', 'Description', 'Suitability')}
      <tbody>${systems.map(s => tableRow(
        fmt(s.name || s.system),
        fmt(s.description || s.detail),
        fmt(s.suitability || s.rating)
      )).join('')}</tbody>
    </table>` : '<p class="text-sm text-brand-sage">No agricultural systems data available.</p>'}`;
  },

  opportunities(d) {
    const eco = safeObj(d.economics);
    const rev = safeObj(eco.revenueScenarios);
    const details = safeArr(rev.details);
    const scenarios = [
      { name: 'Conservative', value: rev.conservative || 0 },
      { name: 'Moderate', value: rev.moderate || 0 },
      { name: 'Optimized', value: rev.optimized || 0 },
    ].filter(s => s.value > 0);

    return `${sectionTitle('Opportunities')}
    <div class="grid grid-cols-3 gap-8 mb-8">
      ${kpi(rev.conservative != null ? '\u20ac' + rev.conservative.toLocaleString() : null, '/yr', 'Conservative')}
      ${kpi(rev.moderate != null ? '\u20ac' + rev.moderate.toLocaleString() : null, '/yr', 'Moderate')}
      ${kpi(rev.optimized != null ? '\u20ac' + rev.optimized.toLocaleString() : null, '/yr', 'Optimized')}
    </div>
    ${scenarios.length > 0 ? stackedBar(scenarios, '', 'Revenue Scenario Comparison') : ''}
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
      ${gauge(fire.riskScore, 5, 'terracotta', 'Fire Risk')}
      ${gauge(flood.riskScore, 5, 'amber', 'Flood Risk')}
      ${gauge(drought.riskScore, 5, 'sage', 'Drought Risk')}
    </div>
    <div class="flex justify-center gap-6 mb-8">
      ${riskBadge(fire.riskLevel)} ${riskBadge(flood.riskLevel)} ${riskBadge(drought.riskLevel)}
    </div>
    ${fire.activeFires ? `${divider()}
    <div class="flex items-center gap-3 p-4 bg-brand-terracotta/10 mb-6">
      <span class="material-symbols-outlined text-brand-terracotta" style="font-size:20px">local_fire_department</span>
      <span class="text-sm text-brand-forest font-bold">Active fires within monitoring radius: ${fire.activeFires}</span>
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
    <div class="flex justify-center mb-8">
      ${gauge(energy.independenceScore, 10, 'forest', 'Energy Independence')}
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
    <div class="space-y-8 mb-8">
      ${pctls.soil != null ? percentileCard('landscape', pctls.soil + '%', pctls.soil > 50 ? 'Above regional median' : 'Below regional median', 'Soil quality compared to properties within 15km radius.') : ''}
      ${pctls.soil != null ? '<div class="hairline"></div>' : ''}
      ${pctls.carbon != null ? percentileCard('co2', pctls.carbon + '%', pctls.carbon > 50 ? 'Above regional median' : 'Below regional median', 'Carbon sequestration capacity relative to neighboring land.') : ''}
      ${pctls.carbon != null ? '<div class="hairline"></div>' : ''}
      ${pctls.biodiversity != null ? percentileCard('forest', pctls.biodiversity + '%', pctls.biodiversity > 50 ? 'Above regional median' : 'Below regional median', 'Species diversity compared to the surrounding bioregion.') : ''}
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
      <div class="text-center">
        <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Temp Trend / Decade</div>
        <p class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(trends.tempPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(2))}\u00b0C</p>
      </div>
      <div class="text-center">
        <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip Trend / Decade</div>
        <p class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(trends.precipPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(1))} mm</p>
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
        return `<div class="border-[0.5px] border-brand-sage/30 overflow-hidden">
          <div class="h-48 bg-brand-sage/10">
            ${src
              ? `<img src="${esc(src)}" alt="${esc(e.title)}" class="w-full h-full object-cover"/>`
              : `<div class="w-full h-full flex items-center justify-center text-brand-sage text-sm">Not available</div>`}
          </div>
          <div class="px-3 py-2">
            <span class="text-[10px] font-bold uppercase tracking-widest text-brand-sage">${esc(e.title)}</span>
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
    </table>` : '<p class="text-sm text-brand-sage mb-6">No compliance data available.</p>'}
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
        <div class="text-[10px] font-black tracking-[0.2em] uppercase text-brand-sage mb-3">${esc(title)}</div>
        ${list.map(a => `<div class="py-3 border-b-[0.5px] border-brand-sage/20">
          ${recommendationBox(
            a.priority ? a.priority.toUpperCase() : 'ACTION',
            a.action || a.name || a.description || ''
          )}
          ${a.impact ? `<span class="text-[10px] uppercase tracking-widest text-brand-sage">Impact: ${esc(a.impact)}</span>` : ''}
        </div>`).join('')}
      </div>`;
    }

    return `${sectionTitle('Next Steps')}
    ${group('Immediate Actions', actions.immediate)}
    ${group('Short-Term Actions', actions.shortTerm)}
    ${group('Long-Term Actions', actions.longTerm)}
    ${!safeArr(actions.immediate).length && !safeArr(actions.shortTerm).length && !safeArr(actions.longTerm).length
      ? '<p class="text-sm text-brand-sage">No action items generated yet.</p>' : ''}`;
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
      <div class="text-[10px] uppercase tracking-widest text-brand-sage mb-2">API Coverage</div>
      <div class="text-sm text-brand-forest font-bold">${okCount} succeeded, ${failCount} failed of ${statusEntries.length} sources</div>
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
        ? '<span class="text-[10px] font-bold text-brand-forest bg-brand-forest/10 px-2 py-1">OK</span>'
        : `<span class="text-[10px] font-bold text-brand-terracotta bg-brand-terracotta/10 px-2 py-1">FAIL</span>`
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
      <p class="text-brand-sage text-sm">No landbook ID provided. Add ?id=your-landbook-id to the URL.</p>
    </div>`;
    return;
  }

  try {
    const res = await fetch(`/api/landbooks/${id}`);
    if (!res.ok) throw new Error('Landbook not found');
    landbook = await res.json();
  } catch {
    canvas.innerHTML = `<div class="flex items-center justify-center h-full min-h-[500px] px-12 py-16">
      <p class="text-brand-sage text-sm">Landbook not found.</p>
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
