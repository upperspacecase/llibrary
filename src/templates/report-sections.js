/**
 * LandBook Report — Section Renderers
 * 18 named exports (one per A4 page) + default renderAllSections.
 * All markup uses Tailwind utility classes matching the Quintas reference style.
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
  if (l === 'low' || l === 'very low')
    return `<span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-[#d8f3dc] text-[#1b4332] inline-block">${escHtml(level)}</span>`;
  if (l === 'moderate')
    return `<span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-[#FEF3C7] text-[#92400E] inline-block">${escHtml(level)}</span>`;
  return `<span class="text-[9px] font-bold uppercase tracking-wider px-3 py-1 bg-[#FEE2E2] text-[#991B1B] inline-block">${escHtml(level)}</span>`;
}

function warningBadge(text) {
  if (!text) return '';
  return `<span class="text-[8.5pt] font-bold text-[#F59E0B] border-[0.5px] border-current px-3 py-1 inline-block uppercase tracking-[0.1em]">${escHtml(text)}</span>`;
}

function safeArr(v) { return Array.isArray(v) ? v : []; }
function safeObj(v) { return v && typeof v === 'object' ? v : {}; }

/** SVG semicircle gauge matching reference pattern */
function gaugeArc(value, max, color, label) {
  const circumference = Math.PI * 45; // 141.37
  const pct = Math.min((value || 0) / max, 1);
  const offset = circumference * (1 - pct);
  return `
  <div class="flex flex-col items-center">
    <div class="relative w-32 h-16 overflow-hidden">
      <svg class="gauge-svg w-32 h-32 absolute top-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E7EEFE" stroke-width="10" stroke-dasharray="141.37" stroke-dashoffset="0"/>
        <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="141.37" stroke-dashoffset="${offset.toFixed(1)}"/>
      </svg>
      <div class="absolute bottom-0 w-full text-center"><span class="font-serif text-xl font-bold">${value != null ? escHtml(String(value)) : '\u2014'}</span></div>
    </div>
    <span class="font-label text-[8pt] font-bold uppercase tracking-widest mt-4 text-outline">${escHtml(label)}</span>
  </div>`;
}

/** Get current month and year string */
function monthYear() {
  const d = new Date();
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/** Standard section header */
function sectionHeader(title, large) {
  const size = large ? 'text-[48pt]' : 'text-[42pt]';
  return `
  <header class="mb-16">
    <div class="flex flex-col gap-4">
      <h1 class="font-serif ${size} text-primary leading-tight">${escHtml(title)}</h1>
      <div class="w-4/5 h-[0.5pt] bg-outline-variant"></div>
    </div>
  </header>`;
}

/** Standard footer */
function sectionFooter(label) {
  return `
  <footer class="flex justify-between items-end mt-16">
    <div class="text-[8px] font-bold uppercase tracking-widest text-outline">LandBook \u00b7 ${monthYear()}</div>
    <div class="text-right"><span class="block text-[8px] uppercase tracking-widest text-outline">${escHtml(label)}</span></div>
  </footer>`;
}

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
<div class="w-[210mm] h-[297mm] mx-auto relative overflow-hidden" style="page-break-after:always;">
  ${maps.satellite
    ? `<img src="${escHtml(maps.satellite)}" alt="Satellite view" class="absolute inset-0 w-full h-full object-cover object-center z-0" />`
    : `<div class="absolute inset-0 w-full h-full bg-primary-container z-0"></div>`}

  <div class="absolute inset-0 z-[1]" style="background:linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.55) 100%);"></div>

  <div class="absolute top-[15mm] left-1/2 -translate-x-1/2 z-[2] text-center text-white">
    <h1 class="text-[10pt] font-medium tracking-[0.2em] uppercase mb-[5mm]">LandBook</h1>
    <p class="text-[9pt] font-light tracking-[0.1em] uppercase opacity-90">Natural Capital Assessment</p>
  </div>

  <div class="absolute top-[15mm] right-[20mm] z-[2] text-white text-[9pt] opacity-90">
    ${fmt(coords.lat, v => v.toFixed(4))}${coords.lat != null && coords.lng != null ? ', ' : ''}${fmt(coords.lng, v => v.toFixed(4))}
  </div>

  <div class="absolute bottom-[60mm] left-[20mm] z-[2] text-white">
    <div class="font-serif italic text-[48pt] font-normal mb-[5mm]" style="text-shadow:2px 2px 8px rgba(0,0,0,0.5);">${escHtml(p.name)}</div>
    <div class="text-[14pt] font-light mb-[10mm] opacity-95">${escHtml(p.address)}</div>
    <div class="text-[9pt] opacity-80 flex gap-[15mm]">
      <span>${fmt(p.area, v => v.toLocaleString() + ' ha', 'Property', 'area')}</span>
      <span>${fmt(eco.valuePerHa, v => '\u20ac' + v.toLocaleString() + '/ha', 'Economics')}</span>
      <span>NCS ${fmt(scores.naturalCapital, v => v + '/100', 'Scores')}</span>
    </div>
  </div>

  <div class="absolute bottom-[15mm] right-[20mm] z-[2] text-white text-[9pt] opacity-80">
    ${fmt(meta.generatedAt, v => v)} &middot; ${fmt(meta.version)}
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// 1 — Property at a Glance (Executive Summary)
// ---------------------------------------------------------------------------

export function renderGlance(d) {
  const p = safeObj(d.property);
  const coords = safeObj(p.coords);
  const scores = safeObj(d.scores);
  const eco = safeObj(d.economics);
  const reg = safeObj(d.regional);
  const pctls = safeObj(reg.percentiles);
  const narr = safeObj(safeObj(d.narratives).executiveSummary);
  const maps = safeObj(d.maps);
  const fire = safeObj(d.fire);

  const ncs = scores.naturalCapital || 0;
  const ncsLabel = ncs >= 80 ? 'Exceptional' : ncs >= 60 ? 'Strong' : ncs >= 40 ? 'Moderate' : 'Developing';
  const coordsStr = (coords.lat != null && coords.lng != null) ? `${coords.lat.toFixed(4)}\u00b0N, ${coords.lng.toFixed(4)}\u00b0W` : '';

  // Split intro into 3 paragraphs
  const introText = narr.intro || '';
  const paragraphs = introText.split(/\n\n+/).filter(Boolean);
  const p1 = paragraphs[0] || '';
  const p2 = paragraphs[1] || '';
  const p3 = paragraphs[2] || '';

  const pullQuote = narr.pullQuote || 'A landscape of extraordinary natural capital.';
  const waterScore = scores.water || 0;
  const fireScore = fire.riskScore || 0;
  const resilienceScore = scores.resilience || safeObj(d.energy).independenceScore || 0;

  return `
<main class="flex-1 flex flex-col min-h-screen">
<div class="flex-1 p-12 flex flex-col justify-between max-w-6xl mx-auto w-full">

  <!-- TOP BAND -->
  <section class="flex justify-between items-end pb-4 border-b-[0.5pt] border-outline-variant">
    <div><h1 class="font-serif italic text-[28pt] text-[#1B4332] leading-none">${escHtml(p.name)}</h1></div>
    <div class="text-right"><p class="font-['Inter'] text-[10pt] text-on-surface uppercase tracking-wide">${escHtml(p.address)}${coordsStr ? ' \u00b7 ' + escHtml(coordsStr) : ''}</p></div>
  </section>

  <!-- MIDDLE SECTION: Bioregion + 15-min radius -->
  <section class="grid grid-cols-2 gap-0 border-b-[0.5pt] border-outline-variant py-10">
    <div class="hairline-r px-12 flex flex-col gap-2">
      <span class="font-label text-[8pt] font-bold uppercase tracking-widest text-outline">Bioregion</span>
      <div class="flex justify-between items-baseline">
        <h2 class="font-serif text-[16pt] text-primary">${escHtml(p.municipality || '')} Region</h2>
        <span class="font-body text-sm font-bold text-on-surface">${fmt(pctls.overall || pctls.carbon, v => v)}th percentile</span>
      </div>
    </div>
    <div class="px-12 flex flex-col gap-2">
      <span class="font-label text-[8pt] font-bold uppercase tracking-widest text-outline">15-Minute Radius</span>
      <div class="flex justify-between items-baseline">
        <h2 class="font-serif text-[16pt] text-primary">${escHtml(p.parish || p.municipality || '')}</h2>
        <span class="font-body text-sm font-bold text-on-surface">${fmt(pctls.water || pctls.overall, v => v)}th percentile</span>
      </div>
    </div>
  </section>

  <!-- MAP / SATELLITE + QUOTE -->
  <section class="grid grid-cols-3 gap-6 my-8">
    <div class="col-span-2 h-48 bg-surface-container overflow-hidden">
      ${maps.satellite
        ? `<img src="${escHtml(maps.satellite)}" alt="Satellite" class="w-full h-full object-cover grayscale opacity-80"/>`
        : `<div class="w-full h-full flex items-center justify-center text-outline text-[10pt]">Map not available</div>`}
    </div>
    <div class="h-48 bg-primary-container p-6 flex flex-col justify-end">
      <p class="font-serif text-white text-lg leading-tight italic">\u201c${escHtml(pullQuote)}\u201d</p>
    </div>
  </section>

  <!-- KEY METRICS BAND: 4 columns -->
  <section class="grid grid-cols-4 gap-0 items-center border-b-[0.5pt] border-outline-variant pb-8">
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(p.area, v => v.toLocaleString())} ha</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Total Area</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">\u20ac${fmt(eco.valuePerHa, v => v.toLocaleString())}/ha</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Current Valuation</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">\u20ac${fmt(eco.totalValue, v => v.toLocaleString())}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Asset Value</div>
    </div>
    <div class="px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.carbonStock, v => v.toLocaleString())} tCO\u2082e</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Carbon Storage</div>
    </div>
  </section>

  <!-- 3-COLUMN NARRATIVE with drop-cap -->
  <section class="py-12">
    <div class="grid grid-cols-3 gap-8 font-body text-[10.5pt] leading-relaxed text-[#414844]">
      <div class="drop-cap">${escHtml(p1)}</div>
      <div>${escHtml(p2)}</div>
      <div class="flex flex-col justify-between">
        <p>${escHtml(p3)}</p>
        <div class="mt-6 border-l-4 border-terracotta pl-4 py-1">
          <blockquote class="font-serif italic text-primary text-[11pt] leading-snug">\u201c${escHtml(pullQuote)}\u201d</blockquote>
        </div>
      </div>
    </div>
  </section>

  <!-- NCS SCORE + GAUGES -->
  <section class="py-12 border-t-[0.5pt] border-outline-variant flex flex-col items-center text-center">
    <div class="mb-2"><span class="font-label text-[10pt] font-bold uppercase tracking-[0.2em] text-outline">Natural Capital Score</span></div>
    <div class="font-serif text-[96pt] font-bold text-primary leading-none mb-4">${ncs}</div>
    <div class="font-body text-lg text-secondary">
      <span class="font-bold text-on-surface">${escHtml(ncsLabel)}</span>
      <span class="mx-2 text-outline-variant">|</span>${fmt(pctls.overall || pctls.carbon, v => v)}th percentile in watershed
    </div>
    <!-- 3 SVG gauge arcs -->
    <div class="grid grid-cols-3 gap-16 mt-16 w-full max-w-3xl">
      ${gaugeArc(waterScore, 10, '#6B8E6B', 'Water Security')}
      ${gaugeArc(fireScore, 5, '#F59E0B', 'Fire Risk')}
      ${gaugeArc(resilienceScore, 10, '#E07A5F', 'Resilience')}
    </div>
  </section>
</div>
</main>`;
}

// ---------------------------------------------------------------------------
// 2 — Economic Valuation (What This Land Provides)
// ---------------------------------------------------------------------------

export function renderEcosystemServices(d) {
  const eco = safeObj(d.economics);
  const es = safeObj(eco.ecosystemServices);
  const narr = safeObj(safeObj(d.narratives).ecosystemServices);
  const maps = safeObj(d.maps);
  const p = safeObj(d.property);

  const services = [
    { name: 'Water Provisioning', value: es.water || 0, beneficiaries: 'Property, downstream users' },
    { name: 'Food & Fiber', value: es.food || 0, beneficiaries: 'Markets, processors' },
    { name: 'Carbon/Climate Regulation', value: es.carbon || 0, beneficiaries: 'Global climate' },
    { name: 'Water Regulation', value: es.regulation || 0, beneficiaries: 'Watershed, aquifer' },
    { name: 'Soil Protection', value: es.soil || 0, beneficiaries: 'Future productivity' },
    { name: 'Recreation/Cultural', value: es.cultural || 0, beneficiaries: 'Visitors, future stewards' },
  ];
  const total = es.total || services.reduce((a, s) => a + s.value, 0);

  // Sort by value desc, pick top 3 for bar colors
  const sorted = [...services].sort((a, b) => b.value - a.value);
  const barColorMap = { 0: 'bg-primary', 1: 'bg-on-tertiary-container', 2: 'bg-editorial-terracotta' };
  const colorAssignment = new Map();
  sorted.forEach((s, i) => { if (i < 3) colorAssignment.set(s.name, barColorMap[i]); });

  // Narrative paragraphs
  const introText = narr.intro || '';
  const introParts = introText.split(/\n\n+/).filter(Boolean);
  const para1 = introParts[0] || '';
  const para2 = introParts[1] || '';

  const pullQuote = narr.pullQuote || '';

  return `
<main class="a4-container shadow-sm mt-8 mb-16">
  <header class="mb-16">
    <div class="flex flex-col gap-4">
      <h1 class="font-serif text-[42pt] text-primary leading-tight">What This Land Provides</h1>
      <div class="w-4/5 h-[0.5pt] bg-outline-variant"></div>
    </div>
  </header>

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(para1)}</p>
      ${para2 ? `<p class="text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(para2)}</p>` : ''}
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">\u201c${escHtml(pullQuote)}\u201d</blockquote>` : ''}
      <div class="bg-surface-container-low p-6 space-y-4">
        <h3 class="font-bold text-[10px] uppercase tracking-widest text-primary">Spatial Context</h3>
        <div class="aspect-video w-full bg-slate-200 overflow-hidden">
          ${maps.regional
            ? `<img src="${escHtml(maps.regional)}" class="w-full h-full object-cover grayscale opacity-50 contrast-125" alt="Regional map"/>`
            : `<div class="w-full h-full flex items-center justify-center text-outline text-[10pt]">Map not available</div>`}
        </div>
        <p class="text-[9pt] italic text-on-surface-variant">${escHtml(p.name)} within its bioregional context.</p>
      </div>
    </div>
  </section>

  <!-- Big number centered -->
  <section class="border-t-[0.5pt] border-outline-variant pt-12 text-center mb-12">
    <div class="flex items-center justify-center gap-6 mb-8">
      <h2 class="font-serif italic text-[28pt] text-primary px-4">Thirty-Year NPV</h2>
    </div>
    <div class="mb-12">
      <p class="font-serif text-[58pt] text-primary leading-none tracking-tight">\u20ac${fmt(safeObj(eco.npv).thirtyYear, v => v.toLocaleString(), 'Economics')}</p>
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary mt-4">\u00b118% uncertainty at 95% confidence interval</p>
    </div>
    <!-- Stacked bar -->
    <div class="max-w-2xl mx-auto space-y-4">
      <div class="flex h-[48px] w-full">
        ${services.map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
          const bgClass = colorAssignment.get(s.name) || 'bg-secondary';
          return pct > 0 ? `<div class="h-full ${bgClass}" style="width:${pct}%"></div>` : '';
        }).join('')}
      </div>
      <div class="flex justify-between text-[9px] font-bold uppercase tracking-widest text-secondary px-1">
        ${services.filter(s => s.value > 0).map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : 0;
          const bgClass = colorAssignment.get(s.name) || 'bg-secondary';
          return `<div class="flex items-center gap-2"><span class="w-2 h-2 ${bgClass}"></span> ${escHtml(s.name)} (${pct}%)</div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <!-- Services table -->
  <section class="border-t-[0.5pt] border-outline-variant pt-8">
    <table class="w-full text-left text-[10pt]">
      <thead><tr class="border-b-2 border-primary">
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Ecosystem Service</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Annual Value</th>
        <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Beneficiaries</th>
      </tr></thead>
      <tbody>
        ${services.map(s => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">${escHtml(s.name)}</td><td class="py-3 font-semibold">\u20ac${fmt(s.value, v => v.toLocaleString())}</td><td class="py-3 text-on-surface-variant">${escHtml(s.beneficiaries)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>

  <footer class="flex justify-between items-end mt-16">
    <div class="text-[8px] font-bold uppercase tracking-widest text-outline">LandBook \u00b7 ${monthYear()}</div>
    <div class="text-right"><span class="block text-[8px] uppercase tracking-widest text-outline">Natural Capital Assessment</span></div>
  </footer>
</main>`;
}

// ---------------------------------------------------------------------------
// 3 — How This Land Performs (Scorecard)
// ---------------------------------------------------------------------------

export function renderScorecard(d) {
  const scores = safeObj(d.scores);
  const reg = safeObj(scores.regional);
  const narr = safeObj(safeObj(d.narratives).scorecard);

  const dims = [
    { label: 'Carbon', icon: 'eco', score: scores.carbon || 0, avg: reg.carbon || 0 },
    { label: 'Biodiversity', icon: 'forest', score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
    { label: 'Water', icon: 'water_drop', score: scores.water || 0, avg: reg.water || 0 },
    { label: 'Soil', icon: 'landscape', score: scores.soil || 0, avg: reg.soil || 0 },
    { label: 'Pollination', icon: 'yard', score: scores.pollination || 0, avg: reg.pollination || 0 },
  ];

  const pullQuote = narr.pullQuote || '';

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('How This Land Performs', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.text)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">\u201c${escHtml(pullQuote)}\u201d</blockquote>` : ''}
      <div class="text-center">
        ${radarChart(dims)}
      </div>
    </div>
  </section>

  <!-- Dimension rows -->
  ${dims.map((dim, i) => {
    const diff = dim.score - dim.avg;
    const sign = diff > 0 ? '+' : '';
    return `
    <div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8">
      <span class="material-symbols-outlined text-[24px] text-primary mt-1">${dim.icon}</span>
      <div class="font-serif text-[36pt] font-normal leading-none text-primary w-24">${dim.score}</div>
      <div class="flex-1">
        <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-1">${escHtml(dim.label)}</div>
        <div class="text-[10.5pt] text-editorial-charcoal">Regional avg: ${dim.avg}/100 (${sign}${diff})</div>
        ${Math.abs(diff) >= 20 && diff < 0 ? warningBadge('Below Regional Average') : ''}
      </div>
    </div>`;
  }).join('')}

  ${sectionFooter('Natural Capital Scorecard')}
</main>`;
}

// ---------------------------------------------------------------------------
// 4 — The Lay of the Land (Terrain)
// ---------------------------------------------------------------------------

export function renderTerrain(d) {
  const soil = safeObj(d.soil);
  const geo = safeObj(d.geology);
  const terrain = safeObj(d.terrain);
  const narr = safeObj(safeObj(d.narratives).terrain);

  const soilRows = [
    ['Classification', fmt(soil.classification)],
    ['pH', fmt(soil.ph, v => v.toFixed(1))],
    ['Organic Carbon', fmt(soil.organicCarbon, v => v + ' g/kg')],
    ['Clay / Sand / Silt', `${fmt(soil.clay, v => v + '%')} / ${fmt(soil.sand, v => v + '%')} / ${fmt(soil.silt, v => v + '%')}`],
    ['Nitrogen', fmt(soil.nitrogen, v => v + ' g/kg')],
    ['CEC', fmt(soil.cec, v => v + ' cmol/kg')],
    ['Bulk Density', fmt(soil.bulkDensity, v => v + ' g/cm\u00b3')],
  ];

  const geoRows = [
    ['Lithology', fmt(geo.lithology)],
    ['Environment', fmt(geo.environment)],
    ['Period', fmt(geo.period)],
    ['Age', fmt(geo.age)],
  ];

  const pullQuote = narr.pullQuote || '';

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('The Lay of the Land', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.description)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">\u201c${escHtml(pullQuote)}\u201d</blockquote>` : ''}
      <div class="space-y-3 text-[10.5pt] text-editorial-charcoal">
        <div>Elevation: ${fmt(terrain.elevation, v => v + ' m')}</div>
        <div>Slope: ${fmt(terrain.slope, v => v + '\u00b0')}</div>
        <div>Aspect: ${fmt(terrain.aspect)}</div>
      </div>
    </div>
  </section>

  <!-- Soil table -->
  <table class="w-full text-left text-[10pt] mb-8">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Soil Property</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Value</th>
    </tr></thead>
    <tbody>
      ${soilRows.map(([label, val]) => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">${escHtml(label)}</td><td class="py-3">${val}</td></tr>`).join('')}
    </tbody>
  </table>

  <!-- Geology table -->
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Geology</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Detail</th>
    </tr></thead>
    <tbody>
      ${geoRows.map(([label, val]) => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">${escHtml(label)}</td><td class="py-3">${val}</td></tr>`).join('')}
    </tbody>
  </table>

  ${sectionFooter('Terrain & Geology')}
</main>`;
}

// ---------------------------------------------------------------------------
// 5 — Water
// ---------------------------------------------------------------------------

export function renderWater(d) {
  const w = safeObj(d.water);
  const fr = safeObj(w.floodRisk);
  const climate = safeObj(d.climate);
  const narr = safeObj(safeObj(d.narratives).water);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Water', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${narr.pullQuote ? `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">\u201c${escHtml(narr.pullQuote)}\u201d</blockquote>` : ''}
    </div>
  </section>

  <!-- Water features table -->
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Feature</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Value</th>
    </tr></thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Springs</td><td class="py-3">${fmt(w.springs)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Wells</td><td class="py-3">${fmt(w.wells)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Waterways</td><td class="py-3">${fmt(w.waterways)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Water Bodies</td><td class="py-3">${fmt(w.waterBodies)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Security Index</td><td class="py-3">${fmt(w.securityIndex, v => v + '/100')}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Flood Discharge</td><td class="py-3">${fmt(w.floodDischarge)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Flood Risk</td><td class="py-3">${riskBadge(safeObj(w.floodRisk).level)} ${fmt(safeObj(w.floodRisk).score, v => v + '/10')}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Annual Rainfall</td><td class="py-3">${fmt(climate.annualRainfall, v => Math.round(v) + ' mm')}</td></tr>
    </tbody>
  </table>

  ${sectionFooter('Water Resources')}
</main>`;
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
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Climate', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.profile)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">${escHtml(c.zone || '')}</blockquote>
    </div>
  </section>

  <!-- Climate KPIs -->
  <section class="grid grid-cols-5 gap-0 items-center border-b-[0.5pt] border-outline-variant pb-6 mb-8">
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.annualMeanTemp, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Mean Temp</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.summerMean, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Summer</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.winterMean, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Winter</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.annualRainfall, v => Math.round(v) + ' mm')}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Annual Rainfall</div>
    </div>
    <div class="px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.growingSeason, v => v + ' days')}</div>
      <div class="font-['Inter'] text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Growing Season</div>
    </div>
  </section>

  <!-- Chart -->
  <div class="text-center">
    ${monthlyClimateChart(temps, rain)}
    <div class="text-[9pt] italic text-secondary mt-2">Monthly average temperature and precipitation</div>
  </div>

  ${sectionFooter('Climate Profile')}
</main>`;
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
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Biodiversity & Habitat Index', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.intro)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">${fmt(sp.total)} species recorded \u2014 ${fmt(sp.threatened)} threatened</blockquote>
      <div class="space-y-6">
        <div class="py-4 border-b-[0.5pt] border-outline-variant flex gap-6 items-center">
          <span class="material-symbols-outlined text-[24px] text-primary">pets</span>
          <div>
            <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(sp.total)}</div>
            <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Total Species</div>
          </div>
        </div>
        <div class="py-4 border-b-[0.5pt] border-outline-variant flex gap-6 items-center">
          <span class="material-symbols-outlined text-[24px] text-editorial-terracotta">warning</span>
          <div>
            <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(sp.threatened)}</div>
            <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Threatened</div>
          </div>
        </div>
        <div class="py-4 flex gap-6 items-center">
          <span class="material-symbols-outlined text-[24px] text-primary">database</span>
          <div>
            <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(sp.gbifTotal)}</div>
            <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">GBIF Records</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Species chart -->
  <div class="text-center mb-8">
    ${speciesBarChart(groups.map(g => ({ group: g.group || g.name || g.label || '', count: g.count || g.value || 0 })))}
    <div class="text-[9pt] italic text-secondary mt-2">Species recorded by taxonomic group</div>
  </div>

  <!-- Top species table -->
  ${top10.length > 0 ? `
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Species</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Group</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Status</th>
    </tr></thead>
    <tbody>
      ${top10.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(s.name || s.species)}</td>
        <td class="py-3">${fmt(s.group || s.kingdom)}</td>
        <td class="py-3">${s.threatened ? riskBadge('Critical') : riskBadge('Low')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${sectionFooter('Biodiversity')}
</main>`;
}

// ---------------------------------------------------------------------------
// 8 — Agriculture
// ---------------------------------------------------------------------------

export function renderAgriculture(d) {
  const ag = safeObj(d.agriculture);
  const narr = safeObj(safeObj(d.narratives).agriculture);
  const systems = safeArr(ag.systems);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Agriculture', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.potential)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">${fmt(ag.landCover)}</blockquote>
    </div>
  </section>

  ${systems.length > 0 ? `
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">System</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Description</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Suitability</th>
    </tr></thead>
    <tbody>
      ${systems.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(s.name || s.system)}</td>
        <td class="py-3">${fmt(s.description || s.detail)}</td>
        <td class="py-3">${fmt(s.suitability || s.rating)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${sectionFooter('Agriculture')}
</main>`;
}

// ---------------------------------------------------------------------------
// 9 — Opportunities
// ---------------------------------------------------------------------------

export function renderOpportunities(d) {
  const eco = safeObj(d.economics);
  const rev = safeObj(eco.revenueScenarios);
  const details = safeArr(rev.details);
  const narr = safeObj(safeObj(d.narratives).opportunities);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Opportunities', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.comparison)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">Carbon stock: ${fmt(eco.carbonStock, v => v.toLocaleString())} tC \u00b7 Credit value: \u20ac${fmt(eco.carbonCreditValue, v => v.toLocaleString())}</blockquote>
    </div>
  </section>

  <!-- Revenue scenarios -->
  <table class="w-full text-left text-[10pt] mb-10">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Scenario</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Annual Revenue</th>
    </tr></thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Conservative</td><td class="py-3">${fmt(rev.conservative, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Moderate</td><td class="py-3">${fmt(rev.moderate, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Optimized</td><td class="py-3">${fmt(rev.optimized, v => '\u20ac' + v.toLocaleString())}</td></tr>
    </tbody>
  </table>

  ${details.length > 0 ? `
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Revenue Stream</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Estimate</th>
    </tr></thead>
    <tbody>
      ${details.map(item => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(item.name || item.label)}</td>
        <td class="py-3">${fmt(item.value || item.estimate, v => '\u20ac' + v.toLocaleString())}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${sectionFooter('Economic Opportunities')}
</main>`;
}

// ---------------------------------------------------------------------------
// 10 — Risks
// ---------------------------------------------------------------------------

export function renderRisks(d) {
  const fire = safeObj(d.fire);
  const flood = safeObj(d.flood);
  const drought = safeObj(d.drought);
  const narr = safeObj(safeObj(d.narratives).risks);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Risk & Resilience', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${safeObj(fire.activeFires).count != null ? `
      <div class="p-4 bg-[#FEF3C7] mb-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="material-symbols-outlined text-[16px] text-[#92400E]">local_fire_department</span>
          <span class="text-[9px] font-bold uppercase tracking-wider text-[#92400E]">Active Alert</span>
        </div>
        <div class="text-[10pt] text-[#92400E]">Active fires within monitoring radius: <strong>${fmt(fire.activeFires.count)}</strong></div>
      </div>` : ''}
    </div>
  </section>

  <!-- 3-col risk KPIs -->
  <section class="grid grid-cols-3 gap-0 border-b-[0.5pt] border-outline-variant pb-8 mb-12">
    <div class="hairline-r px-6 py-4 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(fire.riskScore, v => v)}/5</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Fire Risk</div>
      <div class="mt-2">${riskBadge(fire.riskLevel)}</div>
    </div>
    <div class="hairline-r px-6 py-4 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(flood.riskScore, v => v)}/5</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Flood Risk</div>
      <div class="mt-2">${riskBadge(flood.riskLevel)}</div>
    </div>
    <div class="px-6 py-4 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(drought.riskScore, v => v)}/5</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Drought Risk</div>
      <div class="mt-2">${riskBadge(drought.riskLevel)}</div>
    </div>
  </section>

  <!-- Risk table -->
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Risk</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Score</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Level</th>
    </tr></thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Fire</td><td class="py-3">${fmt(fire.riskScore, v => v + '/5')}</td><td class="py-3">${riskBadge(fire.riskLevel)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Flood</td><td class="py-3">${fmt(flood.riskScore, v => v + '/5')}</td><td class="py-3">${riskBadge(flood.riskLevel)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-3">Drought</td><td class="py-3">${fmt(drought.riskScore, v => v + '/5')}</td><td class="py-3">${riskBadge(drought.riskLevel)}</td></tr>
    </tbody>
  </table>

  ${sectionFooter('Risk Assessment')}
</main>`;
}

// ---------------------------------------------------------------------------
// 11 — Resilience
// ---------------------------------------------------------------------------

export function renderResilience(d) {
  const energy = safeObj(d.energy);
  const narr = safeObj(safeObj(d.narratives).resilience);

  const sources = [
    { label: 'Solar', icon: 'solar_power', data: safeObj(energy.solar) },
    { label: 'Wind', icon: 'air', data: safeObj(energy.wind) },
    { label: 'Micro-Hydro', icon: 'water', data: safeObj(energy.microHydro) },
    { label: 'Biomass', icon: 'compost', data: safeObj(energy.biomass) },
  ];

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Resilience', true)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">Energy Independence Score: ${fmt(energy.independenceScore, v => v)}/10</blockquote>
    </div>
  </section>

  <!-- Energy sources table -->
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Source</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Potential</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Detail</th>
    </tr></thead>
    <tbody>
      ${sources.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${escHtml(s.label)}</td>
        <td class="py-3">${fmt(s.data.level || s.data.score || s.data)}</td>
        <td class="py-3">${fmt(s.data.detail || '')}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${sectionFooter('Energy Resilience')}
</main>`;
}

// ---------------------------------------------------------------------------
// 12 — Bioregional Context
// ---------------------------------------------------------------------------

export function renderContext(d) {
  const w = safeObj(d.water);
  const scores = safeObj(d.scores);
  const soil = safeObj(d.soil);
  const sp = safeObj(d.species);
  const climate = safeObj(d.climate);
  const narr = safeObj(safeObj(d.narratives).context);

  const dimensions = [
    {
      label: 'Water Security',
      icon: 'water_drop',
      value: w.securityIndex,
      sublabel: '/ 10',
      headline: 'Hydrological resilience',
      description: narr.narrative ? '' : `Springs: ${fmt(w.springs)}, Wells: ${fmt(w.wells)}, Waterways: ${fmt(w.waterways)}`,
    },
    {
      label: 'Soil Health',
      icon: 'landscape',
      value: scores.soil,
      sublabel: 'soil health',
      headline: 'Edaphic foundation',
      description: `pH ${fmt(soil.ph, v => v.toFixed(1))}, Organic carbon ${fmt(soil.organicCarbon, v => v + ' g/kg')}, Clay ${fmt(soil.clay, v => v + '%')}`,
    },
    {
      label: 'Biodiversity',
      icon: 'forest',
      value: sp.total,
      sublabel: 'species',
      headline: 'Biological richness',
      description: safeArr(sp.groups).map(g => `${escHtml(g.group || g.name || '')}: ${g.count || g.value || 0}`).join(', '),
    },
    {
      label: 'Climate',
      icon: 'thermostat',
      value: climate.annualMeanTemp != null ? climate.annualMeanTemp.toFixed(1) + '\u00b0' : null,
      sublabel: 'annual mean',
      headline: 'Climatic envelope',
      description: `Rainfall: ${fmt(climate.annualRainfall, v => Math.round(v) + ' mm')}, Growing season: ${fmt(climate.growingSeason, v => v + ' days')}`,
    },
  ];

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <section class="mb-12">
    <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Why bioregional context matters</h1>
    <p class="w-[65%] text-[12pt] text-on-surface-variant leading-relaxed">${escHtml(narr.narrative || 'Raw numbers are hard to interpret. We compare your parcel to the bioregion\u2014so you see what\u2019s typical, what\u2019s exceptional, and what to do about it.')}</p>
  </section>

  <section class="flex-grow">
    ${dimensions.map((dim, i) => {
      const isLast = i === dimensions.length - 1;
      return `
    <div class="py-8 border-t-[0.5px] border-outline-variant${isLast ? ' border-b-[0.5px]' : ''} flex gap-8">
      <div class="flex-shrink-0 pt-1"><span class="material-symbols-outlined text-primary text-3xl">${dim.icon}</span></div>
      <div class="flex-grow grid grid-cols-12 gap-6">
        <div class="col-span-3">
          <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(dim.value)}</div>
          <div class="text-[0.7rem] font-bold uppercase tracking-[0.15em] text-on-surface-variant mt-3">${escHtml(dim.sublabel)}</div>
        </div>
        <div class="col-span-9">
          <h3 class="text-base font-semibold mb-3">${escHtml(dim.headline)}</h3>
          <p class="text-[11pt] text-on-surface-variant mb-4 leading-relaxed">${dim.description}</p>
        </div>
      </div>
    </div>`;
    }).join('')}
  </section>

  ${sectionFooter('Bioregional Context')}
</main>`;
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
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Change Over Time', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.dynamics)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="space-y-3">
        <div class="py-3 border-b-[0.5pt] border-outline-variant">
          <div class="font-serif text-[24pt] text-primary leading-none">${fmt(trends.tempPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(2))}<span class="text-[12pt]">\u00b0C</span></div>
          <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Per Decade</div>
        </div>
        <div class="py-3">
          <div class="font-serif text-[24pt] text-primary leading-none">${fmt(trends.precipPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(1))}<span class="text-[12pt]"> mm</span></div>
          <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Precip / Decade</div>
        </div>
      </div>
    </div>
  </section>

  ${npvScenarios.length > 0 ? `
  <table class="w-full text-left text-[10pt] mb-8">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Scenario</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">30-Year NPV</th>
    </tr></thead>
    <tbody>
      ${npvScenarios.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(s.name || s.label)}</td>
        <td class="py-3">${fmt(s.value || s.npv, v => '\u20ac' + v.toLocaleString())}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${safeArr(trends.fireProneByDecade).length > 0 ? `
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Decade</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Fire-Prone Days</th>
    </tr></thead>
    <tbody>
      ${trends.fireProneByDecade.map(t => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(t.decade || t.label)}</td>
        <td class="py-3">${fmt(t.days || t.value)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${sectionFooter('Temporal Analysis')}
</main>`;
}

// ---------------------------------------------------------------------------
// 14 — Map Portfolio
// ---------------------------------------------------------------------------

export function renderMaps(d) {
  const maps = safeObj(d.maps);
  const mapEntries = [
    { key: 'satellite', title: 'Satellite View', icon: 'satellite_alt' },
    { key: 'overview', title: 'Overview', icon: 'map' },
    { key: 'regional', title: 'Regional Context', icon: 'public' },
    { key: 'detail', title: 'Property Detail', icon: 'zoom_in_map' },
  ];

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Map Portfolio', false)}

  <p class="text-[10.5pt] text-secondary leading-relaxed mb-8">The following pages present the property across multiple cartographic perspectives, from satellite imagery to regional context.</p>

  <div class="grid grid-cols-2 gap-6">
    ${mapEntries.map(entry => {
      const src = maps[entry.key];
      return `
    <div class="border-[0.5pt] border-outline-variant overflow-hidden">
      <div class="h-56 bg-[#f0efeb] overflow-hidden">
        ${src
          ? `<img src="${escHtml(src)}" alt="${escHtml(entry.title)}" class="w-full h-full object-cover" />`
          : `<div class="w-full h-full flex items-center justify-center text-outline text-[10pt]">Not available</div>`}
      </div>
      <div class="p-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-primary">${entry.icon}</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">${escHtml(entry.title)}</span>
      </div>
    </div>`;
    }).join('')}
  </div>

  ${sectionFooter('Cartographic Portfolio')}
</main>`;
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
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Compliance', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.framework)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">Regulatory compliance overview</blockquote>
    </div>
  </section>

  ${items.length > 0 ? `
  <table class="w-full text-left text-[10pt] mb-8">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Regulation</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Status</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Notes</th>
    </tr></thead>
    <tbody>
      ${items.map(i => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3">${fmt(i.name || i.regulation)}</td>
        <td class="py-3">${riskBadge(i.status || i.level)}</td>
        <td class="py-3">${fmt(i.notes || i.detail)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${timeline.length > 0 ? `
  <div class="space-y-4">
    ${timeline.map(t => `
    <div class="flex gap-6 py-3 border-b-[0.5pt] border-outline-variant">
      <div class="font-serif text-[14pt] text-primary font-bold w-20">${escHtml(String(t.year || t.date))}</div>
      <div class="text-[10.5pt] text-editorial-charcoal flex-1">${escHtml(t.event || t.description)}</div>
    </div>`).join('')}
  </div>` : ''}

  ${sectionFooter('Compliance & Regulation')}
</main>`;
}

// ---------------------------------------------------------------------------
// 16 — What to Do Next (Actions)
// ---------------------------------------------------------------------------

export function renderActions(d) {
  const actions = safeObj(d.actions);
  const narr = safeObj(safeObj(d.narratives).nextSteps);

  function actionGrid(title, icon, items) {
    const list = safeArr(items);
    if (!list.length) return '';
    return `
    <div class="mb-8">
      <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-primary">${icon}</span>
        ${escHtml(title)}
      </div>
      <div class="grid grid-cols-3 gap-8 text-[10pt]">
        ${list.map(a => `
        <div class="py-4 border-t-[0.5px] border-outline-variant">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-[16px] text-primary">task_alt</span>
            <span class="font-semibold text-on-surface">${fmt(a.action || a.name || a.description)}</span>
          </div>
          ${a.priority ? `<div class="text-[8pt] text-outline">Priority: ${escHtml(a.priority)}</div>` : ''}
          ${a.impact ? `<div class="text-[8pt] text-outline">Impact: ${escHtml(a.impact)}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>`;
  }

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('What to Do Next', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.framing)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">Strategic action plan</blockquote>
    </div>
  </section>

  ${actionGrid('Immediate Actions', 'priority_high', actions.immediate)}
  ${actionGrid('Short-Term Actions', 'event_upcoming', actions.shortTerm)}
  ${actionGrid('Long-Term Actions', 'calendar_month', actions.longTerm)}

  ${sectionFooter('Action Plan')}
</main>`;
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
<main class="a4-container shadow-sm mt-8 mb-4">
  ${sectionHeader('Methodology, Sources & Disclaimer', false)}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div class="space-y-8">
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal font-normal">${escHtml(narr.text)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${narr.disclaimer ? `<blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">${escHtml(narr.disclaimer)}</blockquote>` : ''}
    </div>
  </section>

  <!-- Sources table -->
  <table class="w-full text-left text-[10pt]">
    <thead><tr class="border-b-2 border-primary">
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Source</th>
      <th class="pb-3 text-[8pt] font-bold uppercase tracking-widest text-primary">Description</th>
    </tr></thead>
    <tbody>
      ${sources.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-3 font-semibold">${escHtml(s.name)}</td>
        <td class="py-3">${escHtml(s.description)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="border-t-[0.5pt] border-outline-variant pt-6 text-center mt-12">
    <div class="text-[8pt] font-bold uppercase tracking-widest text-outline">LandBook Natural Capital Assessment</div>
    <div class="text-[9pt] text-secondary mt-2">Generated ${fmt(meta.generatedAt)} &middot; ${fmt(meta.version)}</div>
  </div>

  ${sectionFooter('Methodology & Disclaimer')}
</main>`;
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
