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
    return `<span class="px-2 py-1 bg-brand-forest/20 text-brand-forest text-[10px] font-bold">${escHtml(level).toUpperCase()}</span>`;
  if (l === 'moderate')
    return `<span class="px-2 py-1 bg-brand-amber/20 text-brand-amber text-[10px] font-bold">${escHtml(level).toUpperCase()}</span>`;
  return `<span class="px-2 py-1 bg-brand-terracotta/20 text-brand-terracotta text-[10px] font-bold">${escHtml(level).toUpperCase()}</span>`;
}

function warningBadge(text) {
  if (!text) return '';
  return `<span class="px-2 py-1 bg-brand-amber/20 text-brand-amber text-[10px] font-bold">${escHtml(text).toUpperCase()}</span>`;
}

function safeArr(v) { return Array.isArray(v) ? v : []; }
function safeObj(v) { return v && typeof v === 'object' ? v : {}; }

/** SVG semicircle gauge matching River's Environmental Ledger pattern.
 *  0 → tiny sliver (~2%), 50% → half arc, 100% → full arc */
function gaugeArc(value, max, color, label) {
  const halfCirc = 141.37; // π × r (semicircle arc length)
  const total    = halfCirc * 2; // full circumference for gap
  const raw      = (value != null && max > 0) ? value / max : 0;
  const pct      = Math.max(0, Math.min(raw, 1));
  // Tiny sliver at 0 so the gauge doesn't look broken; linear from there
  const filled   = pct === 0 ? 3 : halfCirc * pct;
  return `
  <div class="text-center">
    <div class="relative w-32 h-16 mx-auto overflow-hidden">
      <svg class="gauge-svg w-32 h-32 absolute top-0 left-0" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#E7EEFE" stroke-width="10" stroke-dasharray="${halfCirc} ${total}"/>
        <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${filled.toFixed(1)} ${total}"/>
      </svg>
      <div class="absolute bottom-0 w-full text-center">
        <span class="text-lg font-bold text-brand-forest">${value != null ? escHtml(String(value)) : '\u2014'}</span>
      </div>
    </div>
    <p class="text-[10px] font-bold tracking-widest text-brand-forest uppercase mt-2">${escHtml(label)}</p>
  </div>`;
}

/** Get current month and year string */
function monthYear() {
  const d = new Date();
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/** Standard section header — River's Environmental Ledger pattern */
function sectionHeader(title) {
  return `
  <header class="mb-12">
    <h1 class="serif-title text-[36px] text-brand-forest leading-tight">${escHtml(title)}</h1>
    <div class="hairline mt-4"></div>
  </header>`;
}

/** Standard footer — River's Environmental Ledger pattern */
function sectionFooter(label) {
  return `
  <footer class="mt-20">
    <div class="hairline mb-6" style="opacity:0.5"></div>
    <div class="flex justify-between">
      <span class="text-[8px] uppercase tracking-widest text-brand-sage">LandBook \u00b7 ${monthYear()}</span>
      <span class="text-[8px] uppercase tracking-widest text-brand-sage">${escHtml(label)}</span>
    </div>
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
    : `<div class="absolute inset-0 w-full h-full bg-brand-forest z-0"></div>`}

  <div class="absolute inset-0 z-[1]" style="background:linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.55) 100%);"></div>

  <div class="absolute top-[15mm] left-1/2 -translate-x-1/2 z-[2] text-center text-white">
    <h1 class="text-[10px] font-bold tracking-[0.2em] uppercase mb-[5mm]">LandBook</h1>
    <p class="text-[10px] font-bold tracking-[0.2em] uppercase opacity-90">Natural Capital Assessment</p>
  </div>

  <div class="absolute top-[15mm] right-[20mm] z-[2] text-white text-[10px] font-bold tracking-[0.2em] uppercase opacity-90">
    ${fmt(coords.lat, v => v.toFixed(4))}${coords.lat != null && coords.lng != null ? ', ' : ''}${fmt(coords.lng, v => v.toFixed(4))}
  </div>

  <div class="absolute bottom-[60mm] left-[20mm] z-[2] text-white">
    <div class="serif-title text-5xl mb-[5mm]" style="text-shadow:2px 2px 8px rgba(0,0,0,0.5);">${escHtml(p.name)}</div>
    <div class="text-[14pt] font-light mb-[10mm] opacity-95">${escHtml(p.address)}</div>
    <div class="text-[10px] font-bold tracking-[0.15em] uppercase opacity-80 flex gap-[15mm]">
      <span>${fmt(p.area, v => v.toLocaleString() + ' ha', 'Property', 'area')}</span>
      <span>${fmt(eco.valuePerHa, v => '\u20ac' + v.toLocaleString() + '/ha', 'Economics')}</span>
      <span>NCS ${fmt(scores.naturalCapital, v => v + '/100', 'Scores')}</span>
    </div>
  </div>

  <div class="absolute bottom-[15mm] right-[20mm] z-[2] text-white text-[10px] font-bold tracking-[0.15em] uppercase opacity-80">
    ${fmt(meta.generatedAt, v => v)} \u00b7 ${fmt(meta.version)}
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
<main class="a4-container">
<div class="flex flex-col justify-between h-full">

  <!-- PAGE HEADER — River's pattern -->
  <header class="mb-12">
    <div class="flex justify-between items-baseline">
      <h1 class="serif-title text-5xl text-brand-forest">${escHtml(p.name)}</h1>
      <div class="text-right">
        <p class="text-[10px] font-bold tracking-[0.2em] text-brand-forest uppercase">${escHtml(coordsStr)}</p>
        <p class="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase">${escHtml(p.address)}</p>
      </div>
    </div>
    <div class="hairline mt-4"></div>
  </header>

  <!-- BIOREGION + 15-MIN RADIUS -->
  <section class="grid grid-cols-2 gap-0 py-8">
    <div class="hairline-r px-12 flex flex-col gap-2">
      <span class="text-[8px] uppercase tracking-widest text-brand-sage">Bioregion</span>
      <div class="flex justify-between items-baseline">
        <h2 class="text-[24px] serif-title text-brand-forest">${escHtml(p.municipality || '')} Region</h2>
        <span class="text-sm font-bold text-brand-forest">${fmt(pctls.overall || pctls.carbon, v => v)}th percentile</span>
      </div>
    </div>
    <div class="px-12 flex flex-col gap-2">
      <span class="text-[8px] uppercase tracking-widest text-brand-sage">15-Minute Radius</span>
      <div class="flex justify-between items-baseline">
        <h2 class="text-[24px] serif-title text-brand-forest">${escHtml(p.parish || p.municipality || '')}</h2>
        <span class="text-sm font-bold text-brand-forest">${fmt(pctls.water || pctls.overall, v => v)}th percentile</span>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- MAP / SATELLITE + QUOTE -->
  <section class="grid grid-cols-3 gap-6 my-8">
    <div class="col-span-2 h-48 bg-surface-container overflow-hidden">
      ${maps.satellite
        ? `<img src="${escHtml(maps.satellite)}" alt="Satellite" class="w-full h-full object-cover grayscale opacity-80"/>`
        : `<div class="w-full h-full flex items-center justify-center text-brand-sage text-sm">Map not available</div>`}
    </div>
    <div class="h-48 bg-brand-forest p-6 flex flex-col justify-end">
      <p class="serif-title text-brand-cream text-lg leading-tight">\u201c${escHtml(pullQuote)}\u201d</p>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- KEY METRICS — hero figure pattern -->
  <section class="grid grid-cols-4 gap-0 items-center py-8">
    <div class="hairline-r px-6 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(p.area, v => v.toLocaleString())}</div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Hectares</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">\u20ac${fmt(eco.valuePerHa, v => v.toLocaleString())}</div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Per Hectare</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">\u20ac${fmt(eco.totalValue, v => v.toLocaleString())}</div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Asset Value</div>
    </div>
    <div class="px-6 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(eco.carbonStock, v => v.toLocaleString())}</div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">tCO\u2082e Stored</div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- 3-COLUMN NARRATIVE -->
  <section class="py-12">
    <div class="grid grid-cols-3 gap-8 text-[14.6px] leading-relaxed text-on-surface">
      <div class="drop-cap">${escHtml(p1)}</div>
      <div>${escHtml(p2)}</div>
      <div class="flex flex-col justify-between">
        <p>${escHtml(p3)}</p>
        <div class="flex justify-end mt-6">
          <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
            <p class="serif-title text-xl text-brand-forest leading-relaxed">\u201c${escHtml(pullQuote)}\u201d</p>
          </blockquote>
        </div>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- NCS SCORE + GAUGES -->
  <section class="py-12 flex flex-col items-center text-center">
    <div class="mb-2"><span class="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase">Natural Capital Score</span></div>
    <div class="text-[96pt] font-black text-brand-forest leading-none mb-4">${ncs}</div>
    <div class="text-lg text-on-surface">
      <span class="font-bold text-brand-forest">${escHtml(ncsLabel)}</span>
      <span class="mx-2 text-brand-sage">|</span>${fmt(pctls.overall || pctls.carbon, v => v)}th percentile in watershed
    </div>
    <!-- 3 SVG gauge arcs -->
    <div class="grid grid-cols-3 gap-16 mt-16 w-full max-w-3xl">
      ${gaugeArc(waterScore, 10, '#3f6653', 'Water Security')}
      ${gaugeArc(fireScore, 5, '#D4A574', 'Fire Risk')}
      ${gaugeArc(resilienceScore, 10, '#C4705A', 'Resilience')}
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

  // Sort by value desc, pick top 3 for bar colors (River's palette)
  const sorted = [...services].sort((a, b) => b.value - a.value);
  const barColorMap = { 0: 'bg-brand-forest', 1: 'bg-brand-sage', 2: 'bg-brand-amber' };
  const colorAssignment = new Map();
  sorted.forEach((s, i) => { if (i < 3) colorAssignment.set(s.name, barColorMap[i]); });

  // Narrative paragraphs
  const introText = narr.intro || '';
  const introParts = introText.split(/\n\n+/).filter(Boolean);
  const para1 = introParts[0] || '';
  const para2 = introParts[1] || '';

  const pullQuote = narr.pullQuote || '';

  return `
<main class="a4-container">
  ${sectionHeader('What This Land Provides')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(para1)}</p>
      ${para2 ? `<p class="text-[14.6px] leading-relaxed text-on-surface">${escHtml(para2)}</p>` : ''}
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">\u201c${escHtml(pullQuote)}\u201d</p>
        </blockquote>
      </div>` : ''}
      <div class="mt-6 p-6 space-y-4">
        <h3 class="text-[10px] font-bold tracking-widest text-brand-sage uppercase">Spatial Context</h3>
        <div class="aspect-video w-full bg-brand-cream overflow-hidden">
          ${maps.regional
            ? `<img src="${escHtml(maps.regional)}" class="w-full h-full object-cover grayscale opacity-50 contrast-125" alt="Regional map"/>`
            : `<div class="w-full h-full flex items-center justify-center text-brand-sage text-sm">Map not available</div>`}
        </div>
        <p class="text-[12px] italic text-brand-forest">${escHtml(p.name)} within its bioregional context.</p>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- NPV hero figure -->
  <section class="py-12 text-center">
    <h2 class="text-[24px] serif-title text-brand-forest mb-8">Thirty-Year NPV</h2>
    <div class="mb-8">
      <p class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">\u20ac${fmt(safeObj(eco.npv).thirtyYear, v => v.toLocaleString(), 'Economics')}</p>
      <p class="text-[10px] font-bold tracking-[0.15em] text-brand-sage uppercase mt-4">\u00b118% uncertainty at 95% confidence interval</p>
    </div>

    <!-- Horizontal bar chart — River's pattern -->
    <div class="max-w-2xl mx-auto">
      <div class="flex justify-between items-end mb-4">
        <h4 class="text-[10px] font-bold tracking-widest text-brand-forest uppercase">Valuation Composition</h4>
        <p class="text-[14.4px] font-bold text-brand-forest">\u20ac${fmt(total, v => v.toLocaleString())}</p>
      </div>
      <div class="flex h-12 w-full">
        ${services.map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
          const bgClass = colorAssignment.get(s.name) || 'bg-brand-sage';
          return pct > 0 ? `<div class="h-full ${bgClass}" style="width:${pct}%"></div>` : '';
        }).join('')}
      </div>
      <div class="flex gap-6 mt-4">
        ${services.filter(s => s.value > 0).map(s => {
          const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : 0;
          const bgClass = colorAssignment.get(s.name) || 'bg-brand-sage';
          return `<div class="flex items-center gap-2"><div class="w-2 h-2 ${bgClass}"></div><span class="text-[10px] font-bold text-brand-forest">${escHtml(s.name)} ${pct}%</span></div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Services table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Ecosystem Service</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Annual Value</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Beneficiaries</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${services.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${escHtml(s.name)}</td>
          <td class="py-4 text-sm text-on-surface">\u20ac${fmt(s.value, v => v.toLocaleString())}</td>
          <td class="py-4 text-sm text-on-surface">${escHtml(s.beneficiaries)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  ${sectionFooter('Natural Capital Assessment')}
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
<main class="a4-container">
  ${sectionHeader('How This Land Performs')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.text)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">\u201c${escHtml(pullQuote)}\u201d</p>
        </blockquote>
      </div>` : ''}
      <div class="text-center mt-6">
        ${radarChart(dims)}
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Dimension rows — percentile comparison card pattern -->
  ${dims.map((dim, i) => {
    const diff = dim.score - dim.avg;
    const sign = diff > 0 ? '+' : '';
    const diffLabel = diff > 0 ? 'Above regional average' : diff < 0 ? 'Below regional average' : 'At regional average';
    return `
    <div class="py-8 flex gap-8 items-start">
      <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-brand-cream text-3xl">${dim.icon}</span>
      </div>
      <div>
        <div class="flex items-baseline gap-4 mb-2">
          <span class="text-[30px] font-black text-brand-forest">${dim.score}</span>
          <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">${escHtml(diffLabel)} (${sign}${diff})</span>
        </div>
        <p class="text-sm text-on-surface leading-relaxed max-w-[300px]">${escHtml(dim.label)} \u2014 Regional avg: ${dim.avg}/100</p>
        ${Math.abs(diff) >= 20 && diff < 0 ? `<div class="mt-2">${warningBadge('Below Regional Average')}</div>` : ''}
      </div>
    </div>
    ${i < dims.length - 1 ? '<div class="hairline"></div>' : ''}`;
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
<main class="a4-container">
  ${sectionHeader('The Lay of the Land')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.description)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${pullQuote ? `
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">\u201c${escHtml(pullQuote)}\u201d</p>
        </blockquote>
      </div>` : ''}
      <div class="space-y-3 text-sm text-on-surface mt-6">
        <div>Elevation: ${fmt(terrain.elevation, v => v + ' m')}</div>
        <div>Slope: ${fmt(terrain.slope, v => v + '\u00b0')}</div>
        <div>Aspect: ${fmt(terrain.aspect)}</div>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Soil table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Soil Property</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Value</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${soilRows.map(([label, val]) => `<tr><td class="py-4 text-sm font-bold text-brand-forest">${escHtml(label)}</td><td class="py-4 text-sm text-on-surface">${val}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="hairline"></div>

  <!-- Geology table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Geology</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Detail</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${geoRows.map(([label, val]) => `<tr><td class="py-4 text-sm font-bold text-brand-forest">${escHtml(label)}</td><td class="py-4 text-sm text-on-surface">${val}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>

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
<main class="a4-container">
  ${sectionHeader('Water')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${narr.pullQuote ? `
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">\u201c${escHtml(narr.pullQuote)}\u201d</p>
        </blockquote>
      </div>` : ''}
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Water features table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Feature</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Value</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Springs</td><td class="py-4 text-sm text-on-surface">${fmt(w.springs)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Wells</td><td class="py-4 text-sm text-on-surface">${fmt(w.wells)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Waterways</td><td class="py-4 text-sm text-on-surface">${fmt(w.waterways)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Water Bodies</td><td class="py-4 text-sm text-on-surface">${fmt(w.waterBodies)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Security Index</td><td class="py-4 text-sm text-on-surface">${fmt(w.securityIndex, v => v + '/100')}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Flood Discharge</td><td class="py-4 text-sm text-on-surface">${fmt(w.floodDischarge)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Flood Risk</td><td class="py-4 text-right">${riskBadge(safeObj(w.floodRisk).level)} ${fmt(safeObj(w.floodRisk).score, v => v + '/10')}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Annual Rainfall</td><td class="py-4 text-sm text-on-surface">${fmt(climate.annualRainfall, v => Math.round(v) + ' mm')}</td></tr>
      </tbody>
    </table>
  </div>

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
<main class="a4-container">
  ${sectionHeader('Climate')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.profile)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">${escHtml(c.zone || '')}</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Climate KPIs — hero figures -->
  <section class="grid grid-cols-5 gap-0 items-center py-8">
    <div class="hairline-r px-4 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(c.annualMeanTemp, v => v.toFixed(1))}<span class="text-xl">\u00b0C</span></div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Mean Temp</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(c.summerMean, v => v.toFixed(1))}<span class="text-xl">\u00b0C</span></div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Summer</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(c.winterMean, v => v.toFixed(1))}<span class="text-xl">\u00b0C</span></div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Winter</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(c.annualRainfall, v => Math.round(v))}<span class="text-xl"> mm</span></div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Annual Rainfall</div>
    </div>
    <div class="px-4 py-2">
      <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(c.growingSeason, v => v)}<span class="text-xl"> d</span></div>
      <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Growing Season</div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Chart -->
  <div class="text-center py-8">
    ${monthlyClimateChart(temps, rain)}
    <div class="text-[12px] italic text-brand-forest mt-2">Monthly average temperature and precipitation</div>
  </div>

  <div class="hairline"></div>

  <!-- Seasonal management cards -->
  <section class="py-12">
    <h4 class="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase mb-8">SEASONAL MANAGEMENT</h4>
    <div class="grid grid-cols-4 gap-8">
      <div>
        <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">JAN\u2013MAR</span>
        <div class="mb-4"><span class="inline-block bg-brand-sage text-white px-3 py-1 text-[10px] font-bold">RECHARGE</span></div>
        <p class="text-[13px] text-brand-forest leading-relaxed">Peak aquifer saturation window.</p>
      </div>
      <div>
        <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">APR\u2013MAY</span>
        <div class="mb-4"><span class="inline-block bg-brand-forest text-white px-3 py-1 text-[10px] font-bold">GROWTH</span></div>
        <p class="text-[13px] text-brand-forest leading-relaxed">Maximum biomass production phase.</p>
      </div>
      <div>
        <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">JUN\u2013AUG</span>
        <div class="mb-4"><span class="inline-block bg-brand-terracotta text-white px-3 py-1 text-[10px] font-bold">DORMANCY</span></div>
        <p class="text-[13px] text-brand-forest leading-relaxed">Highest evaporation vulnerability.</p>
      </div>
      <div>
        <span class="text-[10px] font-bold text-brand-sage uppercase block mb-4">SEP\u2013DEC</span>
        <div class="mb-4"><span class="inline-block bg-brand-amber text-white px-3 py-1 text-[10px] font-bold">HARVEST</span></div>
        <p class="text-[13px] text-brand-forest leading-relaxed">Ideal for soil remediation works.</p>
      </div>
    </div>
  </section>

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
<main class="a4-container">
  ${sectionHeader('Biodiversity & Habitat Index')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.intro)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4 space-y-6">
      <!-- Percentile comparison cards -->
      <div class="py-4 flex gap-8 items-start">
        <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-brand-cream text-3xl">pets</span>
        </div>
        <div>
          <div class="flex items-baseline gap-4 mb-2">
            <span class="text-[30px] font-black text-brand-forest">${fmt(sp.total)}</span>
            <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">Total Species</span>
          </div>
        </div>
      </div>
      <div class="hairline"></div>
      <div class="py-4 flex gap-8 items-start">
        <div class="w-16 h-16 bg-brand-terracotta flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-brand-cream text-3xl">warning</span>
        </div>
        <div>
          <div class="flex items-baseline gap-4 mb-2">
            <span class="text-[30px] font-black text-brand-forest">${fmt(sp.threatened)}</span>
            <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">Threatened</span>
          </div>
        </div>
      </div>
      <div class="hairline"></div>
      <div class="py-4 flex gap-8 items-start">
        <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-brand-cream text-3xl">database</span>
        </div>
        <div>
          <div class="flex items-baseline gap-4 mb-2">
            <span class="text-[30px] font-black text-brand-forest">${fmt(sp.gbifTotal)}</span>
            <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">GBIF Records</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Species chart -->
  <div class="text-center py-8">
    ${speciesBarChart(groups.map(g => ({ group: g.group || g.name || g.label || '', count: g.count || g.value || 0 })))}
    <div class="text-[12px] italic text-brand-forest mt-2">Species recorded by taxonomic group</div>
  </div>

  <div class="hairline"></div>

  <!-- Top species table -->
  ${top10.length > 0 ? `
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Species</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Group</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase text-right">Status</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${top10.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(s.name || s.species)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.group || s.kingdom)}</td>
          <td class="py-4 text-right">${s.threatened ? riskBadge('Critical') : riskBadge('Low')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

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
<main class="a4-container">
  ${sectionHeader('Agriculture')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.potential)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">${fmt(ag.landCover)}</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Land cover swatch row -->
  ${systems.length > 0 ? `
  <div class="flex gap-1 py-4">
    ${systems.slice(0, 3).map((s, i) => {
      const colors = ['bg-brand-forest', 'bg-brand-sage', 'bg-brand-amber'];
      return `<div class="flex-1 ${colors[i] || 'bg-brand-sage'} p-4 h-24 flex flex-col justify-end">
        <span class="text-[9px] font-bold text-brand-cream uppercase tracking-widest">${escHtml(s.name || s.system || '')}</span>
      </div>`;
    }).join('')}
  </div>

  <div class="hairline"></div>

  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">System</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Description</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Suitability</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${systems.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(s.name || s.system)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.description || s.detail)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.suitability || s.rating)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

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
<main class="a4-container">
  ${sectionHeader('Opportunities')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.comparison)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">Carbon stock: ${fmt(eco.carbonStock, v => v.toLocaleString())} tC \u00b7 Credit value: \u20ac${fmt(eco.carbonCreditValue, v => v.toLocaleString())}</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Revenue scenarios -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Scenario</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Annual Revenue</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Conservative</td><td class="py-4 text-sm text-on-surface">${fmt(rev.conservative, v => '\u20ac' + v.toLocaleString())}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Moderate</td><td class="py-4 text-sm text-on-surface">${fmt(rev.moderate, v => '\u20ac' + v.toLocaleString())}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Optimized</td><td class="py-4 text-sm text-on-surface">${fmt(rev.optimized, v => '\u20ac' + v.toLocaleString())}</td></tr>
      </tbody>
    </table>
  </div>

  ${details.length > 0 ? `
  <div class="hairline"></div>
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Revenue Stream</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Estimate</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${details.map(item => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(item.name || item.label)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(item.value || item.estimate, v => '\u20ac' + v.toLocaleString())}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

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
<main class="a4-container">
  ${sectionHeader('Risk & Resilience')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${safeObj(fire.activeFires).count != null ? `
      <div class="p-4 bg-brand-amber/20 mb-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="material-symbols-outlined text-[16px] text-brand-amber">local_fire_department</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-brand-amber">Active Alert</span>
        </div>
        <div class="text-sm text-brand-amber">Active fires within monitoring radius: <strong>${fmt(fire.activeFires.count)}</strong></div>
      </div>` : ''}
    </div>
  </section>

  <div class="hairline"></div>

  <!-- 3-col risk gauges -->
  <div class="grid grid-cols-3 gap-8 py-16">
    ${gaugeArc(fire.riskScore, 5, '#C4705A', 'Fire Risk')}
    ${gaugeArc(flood.riskScore, 5, '#D4A574', 'Flood Risk')}
    ${gaugeArc(drought.riskScore, 5, '#3f6653', 'Drought Risk')}
  </div>

  <div class="hairline"></div>

  <!-- Risk table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Risk</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Score</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase text-right">Severity</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Fire</td><td class="py-4 text-sm text-on-surface">${fmt(fire.riskScore, v => v + '/5')}</td><td class="py-4 text-right">${riskBadge(fire.riskLevel)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Flood</td><td class="py-4 text-sm text-on-surface">${fmt(flood.riskScore, v => v + '/5')}</td><td class="py-4 text-right">${riskBadge(flood.riskLevel)}</td></tr>
        <tr><td class="py-4 text-sm font-bold text-brand-forest">Drought</td><td class="py-4 text-sm text-on-surface">${fmt(drought.riskScore, v => v + '/5')}</td><td class="py-4 text-right">${riskBadge(drought.riskLevel)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="hairline"></div>

  <!-- Recommendation box -->
  ${narr.recommendation ? `
  <div class="py-8">
    <span class="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">RECOMMENDATION</span>
    <p class="text-brand-forest font-medium leading-relaxed">${escHtml(narr.recommendation)}</p>
  </div>` : ''}

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
<main class="a4-container">
  ${sectionHeader('Resilience')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.narrative)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">Energy Independence Score: ${fmt(energy.independenceScore, v => v)}/10</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Recommendation box -->
  ${narr.recommendation ? `
  <div class="py-8">
    <span class="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">RECOMMENDATION</span>
    <p class="text-brand-forest font-medium leading-relaxed">${escHtml(narr.recommendation)}</p>
  </div>

  <div class="hairline"></div>` : ''}

  <!-- Energy sources table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Source</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Potential</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Detail</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${sources.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${escHtml(s.label)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.data.level || s.data.score || s.data)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.data.detail || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

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
<main class="a4-container">
  <section class="mb-12">
    <h1 class="serif-title text-[36px] text-brand-forest leading-tight mb-6">Why bioregional context matters</h1>
    <div class="hairline mt-4 mb-8"></div>
    <p class="w-[65%] text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.narrative || 'Raw numbers are hard to interpret. We compare your parcel to the bioregion\u2014so you see what\u2019s typical, what\u2019s exceptional, and what to do about it.')}</p>
  </section>

  <!-- Dimension rows — percentile comparison card pattern -->
  <section>
    ${dimensions.map((dim, i) => {
      return `
    <div class="py-8 flex gap-8 items-start">
      <div class="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined text-brand-cream text-3xl">${dim.icon}</span>
      </div>
      <div>
        <div class="flex items-baseline gap-4 mb-2">
          <span class="text-[30px] font-black text-brand-forest">${fmt(dim.value)}</span>
          <span class="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">${escHtml(dim.sublabel)}</span>
        </div>
        <p class="text-sm text-on-surface leading-relaxed max-w-[300px]">${escHtml(dim.headline)} \u2014 ${dim.description}</p>
      </div>
    </div>
    ${i < dimensions.length - 1 ? '<div class="hairline"></div>' : ''}`;
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
<main class="a4-container">
  ${sectionHeader('Change Over Time')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.dynamics)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="space-y-6">
        <div class="py-3">
          <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(trends.tempPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(2))}\u00b0C</div>
          <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Per Decade</div>
        </div>
        <div class="hairline"></div>
        <div class="py-3">
          <div class="text-[43px] font-black tracking-tighter text-brand-forest leading-none">${fmt(trends.precipPerDecade, v => (v > 0 ? '+' : '') + v.toFixed(1))} mm</div>
          <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase mt-2">Precip / Decade</div>
        </div>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  ${npvScenarios.length > 0 ? `
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Scenario</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">30-Year NPV</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${npvScenarios.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(s.name || s.label)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(s.value || s.npv, v => '\u20ac' + v.toLocaleString())}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${safeArr(trends.fireProneByDecade).length > 0 ? `
  <div class="hairline"></div>
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Decade</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Fire-Prone Days</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${trends.fireProneByDecade.map(t => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(t.decade || t.label)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(t.avgDays || t.days || t.value)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

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
<main class="a4-container">
  ${sectionHeader('Map Portfolio')}

  <p class="text-[14.6px] leading-relaxed text-on-surface mb-8">The following pages present the property across multiple cartographic perspectives, from satellite imagery to regional context.</p>

  <div class="hairline"></div>

  <div class="grid grid-cols-2 gap-6 py-8">
    ${mapEntries.map(entry => {
      const src = maps[entry.key];
      return `
    <div class="border-[0.5px] border-brand-sage overflow-hidden">
      <div class="h-56 bg-brand-cream overflow-hidden">
        ${src
          ? `<img src="${escHtml(src)}" alt="${escHtml(entry.title)}" class="w-full h-full object-cover" />`
          : `<div class="w-full h-full flex items-center justify-center text-brand-sage text-sm">Not available</div>`}
      </div>
      <div class="p-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-brand-forest">${entry.icon}</span>
        <span class="text-[10px] font-bold uppercase tracking-widest text-brand-sage">${escHtml(entry.title)}</span>
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
<main class="a4-container">
  ${sectionHeader('Compliance')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.framework)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">Regulatory compliance overview</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  ${items.length > 0 ? `
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Regulation</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Status</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Notes</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${items.map(i => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${fmt(i.name || i.regulation)}</td>
          <td class="py-4 text-right">${riskBadge(i.status || i.level)}</td>
          <td class="py-4 text-sm text-on-surface">${fmt(i.description || i.notes || i.detail)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${timeline.length > 0 ? `
  <div class="hairline"></div>
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Year</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Event Description</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${timeline.map(t => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${escHtml(String(t.deadline || t.year || t.date || ''))}</td>
          <td class="py-4 text-sm text-on-surface">${escHtml(t.action || t.event || t.description || '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
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

  function actionGroup(title, items) {
    const list = safeArr(items);
    if (!list.length) return '';
    return `
    <div class="py-8">
      <span class="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">${escHtml(title)}</span>
      ${list.map(a => `
      <div class="mb-4">
        <p class="text-brand-forest font-medium leading-relaxed">${fmt(a.action || a.name || a.description)}</p>
        ${a.priority ? `<span class="text-[10px] text-brand-sage uppercase tracking-widest">Priority: ${escHtml(a.priority)}</span>` : ''}
        ${a.impact ? `<span class="text-[10px] text-brand-sage uppercase tracking-widest ml-4">Impact: ${escHtml(a.impact)}</span>` : ''}
      </div>`).join('')}
    </div>
    <div class="hairline"></div>`;
  }

  return `
<main class="a4-container">
  ${sectionHeader('What to Do Next')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.framing)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">Strategic action plan</p>
        </blockquote>
      </div>
    </div>
  </section>

  <div class="hairline"></div>

  ${actionGroup('Immediate Actions', actions.immediate)}
  ${actionGroup('Short-Term Actions', actions.shortTerm)}
  ${actionGroup('Long-Term Actions', actions.longTerm)}

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
<main class="a4-container">
  ${sectionHeader('Methodology, Sources & Disclaimer')}

  <!-- 60/40 split -->
  <section class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div class="space-y-8">
      <p class="drop-cap text-[14.6px] leading-relaxed text-on-surface">${escHtml(narr.text)}</p>
    </div>
    <div class="flex flex-col justify-start pt-4">
      ${narr.disclaimer ? `
      <div class="flex justify-end">
        <blockquote class="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
          <p class="serif-title text-xl text-brand-forest leading-relaxed">${escHtml(narr.disclaimer)}</p>
        </blockquote>
      </div>` : ''}
    </div>
  </section>

  <div class="hairline"></div>

  <!-- Sources table -->
  <div class="py-4">
    <table class="w-full text-left">
      <thead>
        <tr class="border-b-[0.5px] border-brand-sage">
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Source</th>
          <th class="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase">Description</th>
        </tr>
      </thead>
      <tbody class="divide-y-[0.5px] divide-brand-sage/20">
        ${sources.map(s => `<tr>
          <td class="py-4 text-sm font-bold text-brand-forest">${escHtml(s.name)}</td>
          <td class="py-4 text-sm text-on-surface">${escHtml(s.description)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="hairline"></div>

  <div class="pt-6 text-center">
    <div class="text-[10px] font-bold tracking-[0.15em] text-brand-forest uppercase">LandBook Natural Capital Assessment</div>
    <div class="text-[12px] italic text-brand-forest mt-2">Generated ${fmt(meta.generatedAt)} \u00b7 ${fmt(meta.version)}</div>
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
