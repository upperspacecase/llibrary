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

/** SVG semicircle gauge arc */
function gaugeArc(value, max, radius, color, label) {
  const pct = Math.min(value / max, 1);
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - pct);
  return `
  <div class="flex flex-col items-center">
    <svg width="${radius * 2 + 16}" height="${radius + 24}" viewBox="0 0 ${radius * 2 + 16} ${radius + 24}">
      <path d="M8,${radius + 8} A${radius},${radius} 0 0,1 ${radius * 2 + 8},${radius + 8}"
            fill="none" stroke="#c1c8c2" stroke-width="6" stroke-linecap="round"/>
      <path d="M8,${radius + 8} A${radius},${radius} 0 0,1 ${radius * 2 + 8},${radius + 8}"
            fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
    </svg>
    <span class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">${escHtml(label)}</span>
  </div>`;
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
  const scores = safeObj(d.scores);
  const eco = safeObj(d.economics);
  const reg = safeObj(scores.regional);
  const narr = safeObj(safeObj(d.narratives).executiveSummary);
  const maps = safeObj(d.maps);

  const ncs = scores.naturalCapital || 0;

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <!-- Top band -->
  <div class="flex justify-between items-end pb-4 border-b-[0.5pt] border-outline-variant">
    <div>
      <div class="font-serif italic text-[28pt] text-[#1B4332] leading-none">${escHtml(p.name)}</div>
    </div>
    <div class="text-right">
      <div class="text-[10pt] text-on-surface uppercase tracking-wide">${escHtml(p.address)}</div>
    </div>
  </div>

  <!-- Map + Quote grid -->
  <div class="grid grid-cols-3 gap-6 my-8">
    <div class="col-span-2 h-48 bg-[#f0efeb] overflow-hidden">
      ${maps.overview
        ? `<img src="${escHtml(maps.overview)}" alt="Property overview" class="w-full h-full object-cover" />`
        : maps.satellite
          ? `<img src="${escHtml(maps.satellite)}" alt="Satellite" class="w-full h-full object-cover" />`
          : `<div class="w-full h-full flex items-center justify-center text-outline text-[10pt]">Map not available</div>`}
    </div>
    <div class="h-48 bg-primary-container p-6 flex flex-col justify-end">
      ${narr.pullQuote
        ? `<p class="font-serif text-white text-lg leading-tight italic">${escHtml(narr.pullQuote)}</p>`
        : `<p class="font-serif text-white text-lg leading-tight italic">A landscape of extraordinary natural capital.</p>`}
    </div>
  </div>

  <!-- KPI band -->
  <div class="grid grid-cols-4 gap-0 items-center border-b-[0.5pt] border-outline-variant pb-8">
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(p.area, v => v.toLocaleString())}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Hectares</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.valuePerHa, v => '\u20ac' + v.toLocaleString())}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Value / Ha</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(scores.biodiversity, v => v)}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Biodiversity</div>
    </div>
    <div class="px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.carbonStock, v => v.toLocaleString())}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Carbon Stock (tC)</div>
    </div>
  </div>

  <!-- Narrative columns -->
  <div class="grid grid-cols-3 gap-8 text-[10.5pt] leading-relaxed text-editorial-charcoal mt-8">
    <div class="drop-cap">${escHtml(narr.intro)}</div>
    <div>${escHtml(narr.body || '')}</div>
    <div>
      <!-- NCS score -->
      <div class="text-center mb-4">
        <div class="font-serif text-[96pt] font-bold text-primary leading-none">${ncs}</div>
        <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-2">Natural Capital Score</div>
      </div>
      <!-- Gauges -->
      <div class="flex justify-around mt-4">
        ${gaugeArc(scores.carbon || 0, 100, 32, TOKENS.primary, 'Carbon')}
        ${gaugeArc(scores.biodiversity || 0, 100, 32, TOKENS.onTertiaryContainer, 'Biodiversity')}
        ${gaugeArc(scores.water || 0, 100, 32, TOKENS.editorialTerracotta, 'Water')}
      </div>
    </div>
  </div>

  ${narr.pullQuote ? `
  <div class="mt-6 border-l-4 border-editorial-terracotta pl-4 py-1">
    <p class="font-serif italic text-primary text-[11pt] leading-snug">${escHtml(narr.pullQuote)}</p>
  </div>` : ''}

  <!-- Footer -->
  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook Natural Capital Assessment &middot; ${escHtml(p.name)}
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

  const segments = [
    { label: 'Water', value: es.water || 0 },
    { label: 'Food', value: es.food || 0 },
    { label: 'Carbon', value: es.carbon || 0 },
    { label: 'Regulation', value: es.regulation || 0 },
    { label: 'Soil', value: es.soil || 0 },
    { label: 'Cultural', value: es.cultural || 0 },
  ];
  const total = es.total || segments.reduce((a, s) => a + s.value, 0);
  const barColors = ['#012d1d', '#75b393', '#E07A5F', '#585f6c', '#414844', '#c1c8c2'];

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <!-- Header -->
  <h1 class="font-serif text-[42pt] text-primary leading-tight">What This Land Provides</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <!-- Content grid -->
  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-20">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.intro)}</p>

      ${narr.pullQuote ? `
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mt-6">
        ${escHtml(narr.pullQuote)}
      </blockquote>` : ''}
    </div>
    <div>
      <!-- Big number -->
      <div class="mb-8">
        <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-2">30-Year Net Present Value</div>
        <div class="font-serif text-[58pt] text-primary leading-none tracking-tight">${fmt(safeObj(eco.npv).thirtyYear, v => '\u20ac' + v.toLocaleString(), 'Economics')}</div>
      </div>
    </div>
  </div>

  <!-- Stacked bar -->
  <div class="mb-8">
    <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-3">Annual Ecosystem Services Breakdown</div>
    <div class="flex h-10 w-full overflow-hidden">
      ${segments.map((s, i) => {
        const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
        return pct > 0 ? `<div class="h-full" style="width:${pct}%; background:${barColors[i % barColors.length]};" title="${s.label}: ${pct}%"></div>` : '';
      }).join('')}
    </div>
    <div class="flex gap-4 mt-2">
      ${segments.map((s, i) => `<div class="flex items-center gap-1">
        <div class="w-2.5 h-2.5" style="background:${barColors[i % barColors.length]};"></div>
        <span class="text-[8pt] text-outline">${escHtml(s.label)}</span>
      </div>`).join('')}
    </div>
  </div>

  <!-- Table -->
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Service</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Annual Value</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Share</th>
      </tr>
    </thead>
    <tbody>
      ${segments.map(s => {
        const share = total ? ((s.value / total) * 100).toFixed(1) : 0;
        return `<tr class="border-b-[0.5pt] border-outline-variant">
          <td class="py-2">${escHtml(s.label)}</td>
          <td class="py-2">${fmt(s.value, v => '\u20ac' + v.toLocaleString())}</td>
          <td class="py-2">${share}%</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Economic Valuation
  </div>
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

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">How This Land Performs</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.text)}</p>
    </div>
    <div>
      <div class="text-center">
        ${radarChart(dims)}
      </div>
    </div>
  </div>

  <!-- Dimension rows -->
  ${dims.map(dim => {
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

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Natural Capital Scorecard
  </div>
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

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">The Lay of the Land</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.description)}</p>
    </div>
    <div>
      <div class="flex items-center gap-3 mb-4">
        <span class="material-symbols-outlined text-[24px] text-primary">landscape</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">Terrain Profile</span>
      </div>
      <div class="space-y-2 text-[10.5pt] text-editorial-charcoal">
        <div>Elevation: ${fmt(terrain.elevation, v => v + ' m')}</div>
        <div>Slope: ${fmt(terrain.slope, v => v + '\u00b0')}</div>
        <div>Aspect: ${fmt(terrain.aspect)}</div>
      </div>
    </div>
  </div>

  <!-- Soil table -->
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">grass</span>
    Soil Properties
  </div>
  <table class="w-full text-left text-[10pt] mb-8">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Property</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Value</th>
      </tr>
    </thead>
    <tbody>
      ${soilRows.map(([label, val]) => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">${escHtml(label)}</td><td class="py-2">${val}</td></tr>`).join('')}
    </tbody>
  </table>

  <!-- Geology table -->
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">layers</span>
    Geology
  </div>
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Attribute</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Detail</th>
      </tr>
    </thead>
    <tbody>
      ${geoRows.map(([label, val]) => `<tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">${escHtml(label)}</td><td class="py-2">${val}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Terrain &amp; Geology
  </div>
</main>`;
}

// ---------------------------------------------------------------------------
// 5 — Water
// ---------------------------------------------------------------------------

export function renderWater(d) {
  const w = safeObj(d.water);
  const fr = safeObj(w.floodRisk);
  const narr = safeObj(safeObj(d.narratives).water);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Water</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.narrative)}</p>

      ${narr.pullQuote ? `
      <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mt-6">
        ${escHtml(narr.pullQuote)}
      </blockquote>` : ''}
    </div>
    <div>
      <!-- Water KPIs -->
      <div class="space-y-6">
        <div class="flex items-center gap-4">
          <span class="material-symbols-outlined text-[24px] text-primary">water_drop</span>
          <div>
            <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(w.securityIndex, v => v)}</div>
            <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Water Security Index</div>
          </div>
        </div>
        ${gaugeArc(w.securityIndex || 0, 100, 48, TOKENS.primary, 'Security')}
      </div>
    </div>
  </div>

  <!-- Water features table -->
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">waves</span>
    Water Features
  </div>
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Feature</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Springs</td><td class="py-2">${fmt(w.springs)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Wells</td><td class="py-2">${fmt(w.wells)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Waterways</td><td class="py-2">${fmt(w.waterways)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Water Bodies</td><td class="py-2">${fmt(w.waterBodies)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Security Index</td><td class="py-2">${fmt(w.securityIndex, v => v + '/100')}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Flood Discharge</td><td class="py-2">${fmt(w.floodDischarge)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Flood Risk</td><td class="py-2">${riskBadge(fr.level)} ${fmt(fr.score, v => v + '/10')}</td></tr>
    </tbody>
  </table>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Water Resources
  </div>
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
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Climate</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.profile)}</p>
    </div>
    <div>
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <span class="material-symbols-outlined text-[24px] text-primary">thermostat</span>
          <div>
            <div class="font-serif text-[36pt] font-normal leading-none text-primary">${fmt(c.annualMeanTemp, v => v.toFixed(1))}<span class="text-[18pt]">\u00b0C</span></div>
            <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Mean Temperature</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Climate KPIs -->
  <div class="grid grid-cols-5 gap-0 items-center border-b-[0.5pt] border-outline-variant pb-6 mb-8">
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.annualMeanTemp, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Mean Temp</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.summerMean, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Summer</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.winterMean, v => v.toFixed(1) + '\u00b0C')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Winter</div>
    </div>
    <div class="hairline-r px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.annualRainfall, v => Math.round(v) + ' mm')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Annual Rainfall</div>
    </div>
    <div class="px-4 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(c.growingSeason, v => v + ' days')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Growing Season</div>
    </div>
  </div>

  <!-- Chart -->
  <div class="text-center">
    ${monthlyClimateChart(temps, rain)}
    <div class="text-[9pt] italic text-secondary mt-2">Monthly average temperature and precipitation</div>
  </div>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Climate Profile
  </div>
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
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Biodiversity &amp; Habitat Index</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-10">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.intro)}</p>
    </div>
    <div>
      <!-- Biodiversity KPIs -->
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
  </div>

  <!-- Species chart -->
  <div class="text-center mb-8">
    ${speciesBarChart(groups.map(g => ({ group: g.group || g.name || g.label || '', count: g.count || g.value || 0 })))}
    <div class="text-[9pt] italic text-secondary mt-2">Species recorded by taxonomic group</div>
  </div>

  <!-- Top species table -->
  ${top10.length > 0 ? `
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Species</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Group</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Status</th>
      </tr>
    </thead>
    <tbody>
      ${top10.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(s.name || s.species)}</td>
        <td class="py-2">${fmt(s.group || s.kingdom)}</td>
        <td class="py-2">${s.threatened ? riskBadge('Critical') : riskBadge('Low')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Biodiversity
  </div>
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
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Agriculture</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.potential)}</p>
    </div>
    <div>
      <div class="flex items-center gap-3 mb-4">
        <span class="material-symbols-outlined text-[24px] text-primary">agriculture</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">Land Cover</span>
      </div>
      <p class="text-[10.5pt] text-editorial-charcoal leading-relaxed">${fmt(ag.landCover)}</p>
    </div>
  </div>

  ${systems.length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">compost</span>
    Agricultural Systems
  </div>
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">System</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Description</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Suitability</th>
      </tr>
    </thead>
    <tbody>
      ${systems.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(s.name || s.system)}</td>
        <td class="py-2">${fmt(s.description || s.detail)}</td>
        <td class="py-2">${fmt(s.suitability || s.rating)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Agriculture
  </div>
</main>`;
}

// ---------------------------------------------------------------------------
// 9 — Opportunities
// ---------------------------------------------------------------------------

export function renderOpportunities(d) {
  const eco = safeObj(d.economics);
  const rev = safeObj(eco.revenueScenarios);
  const narr = safeObj(safeObj(d.narratives).opportunities);

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Opportunities</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.comparison)}</p>
    </div>
    <div>
      <!-- Big number -->
      <div class="mb-6">
        <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-2">Total Property Value</div>
        <div class="font-serif text-[58pt] text-primary leading-none tracking-tight">${fmt(eco.totalValue, v => '\u20ac' + v.toLocaleString())}</div>
      </div>
    </div>
  </div>

  <!-- Revenue scenarios -->
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">trending_up</span>
    Revenue Scenarios
  </div>
  <table class="w-full text-left text-[10pt] mb-10">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Scenario</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Annual Revenue</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Conservative</td><td class="py-2">${fmt(rev.conservative, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Moderate</td><td class="py-2">${fmt(rev.moderate, v => '\u20ac' + v.toLocaleString())}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Optimized</td><td class="py-2">${fmt(rev.optimized, v => '\u20ac' + v.toLocaleString())}</td></tr>
    </tbody>
  </table>

  <!-- KPI band -->
  <div class="grid grid-cols-3 gap-0 items-center border-t-[0.5pt] border-b-[0.5pt] border-outline-variant py-6">
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.totalValue, v => '\u20ac' + v.toLocaleString())}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Total Property Value</div>
    </div>
    <div class="hairline-r px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.carbonStock, v => v.toLocaleString() + ' tC')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Carbon Stock</div>
    </div>
    <div class="px-6 py-2">
      <div class="font-serif text-[18pt] text-primary leading-tight">${fmt(eco.carbonAnnualSeq, v => v.toLocaleString() + ' tC/yr')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Annual Sequestration</div>
    </div>
  </div>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Economic Opportunities
  </div>
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
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Risk &amp; Resilience</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.narrative)}</p>
    </div>
    <div>
      ${safeObj(fire.activeFires).count != null ? `
      <div class="p-4 bg-[#FEF3C7] mb-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="material-symbols-outlined text-[16px] text-[#92400E]">local_fire_department</span>
          <span class="text-[9px] font-bold uppercase tracking-wider text-[#92400E]">Active Alert</span>
        </div>
        <div class="text-[10pt] text-[#92400E]">Active fires within monitoring radius: <strong>${fmt(fire.activeFires.count)}</strong></div>
      </div>` : ''}
    </div>
  </div>

  <!-- Risk KPIs -->
  <div class="grid grid-cols-3 gap-0 border-b-[0.5pt] border-outline-variant pb-8 mb-8">
    <div class="hairline-r px-6 py-2 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(fire.riskScore, v => v + '/10')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Fire Risk</div>
      <div class="mt-2">${riskBadge(fire.riskLevel)}</div>
    </div>
    <div class="hairline-r px-6 py-2 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(flood.riskScore, v => v + '/10')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Flood Risk</div>
      <div class="mt-2">${riskBadge(flood.riskLevel)}</div>
    </div>
    <div class="px-6 py-2 text-center">
      <div class="font-serif text-[24pt] text-primary">${fmt(drought.riskScore, v => v + '/10')}</div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mt-1">Drought Risk</div>
      <div class="mt-2">${riskBadge(drought.riskLevel)}</div>
    </div>
  </div>

  <!-- Risk table -->
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Risk</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Score</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Level</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Fire</td><td class="py-2">${fmt(fire.riskScore, v => v + '/10')}</td><td class="py-2">${riskBadge(fire.riskLevel)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Flood</td><td class="py-2">${fmt(flood.riskScore, v => v + '/10')}</td><td class="py-2">${riskBadge(flood.riskLevel)}</td></tr>
      <tr class="border-b-[0.5pt] border-outline-variant"><td class="py-2">Drought</td><td class="py-2">${fmt(drought.riskScore, v => v + '/10')}</td><td class="py-2">${riskBadge(drought.riskLevel)}</td></tr>
    </tbody>
  </table>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Risk Assessment
  </div>
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
  <h1 class="font-serif text-[42pt] text-primary leading-tight">Resilience</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mt-2 mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.narrative)}</p>
    </div>
    <div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-4">Energy Independence</div>
      <div class="text-center">
        ${energyBarChart(sources.map(s => ({ label: s.label, potential: s.data.score || 0 })))}
      </div>
    </div>
  </div>

  <!-- Energy actions grid -->
  <div class="grid grid-cols-3 gap-8 text-[10pt]">
    ${sources.slice(0, 3).map(s => `
    <div class="py-6 border-t-[0.5px] border-outline-variant">
      <div class="flex items-center gap-2 mb-3">
        <span class="material-symbols-outlined text-[16px] text-primary">${s.icon}</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">${escHtml(s.label)}</span>
      </div>
      <div class="font-serif text-[24pt] text-primary leading-none mb-2">${fmt(s.data.score || s.data.level || s.data)}</div>
      <p class="text-[10pt] text-editorial-charcoal leading-relaxed">${fmt(s.data.detail || '')}</p>
    </div>`).join('')}
  </div>

  <table class="w-full text-left text-[10pt] mt-8">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Source</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Potential</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Detail</th>
      </tr>
    </thead>
    <tbody>
      ${sources.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${escHtml(s.label)}</td>
        <td class="py-2">${fmt(s.data.level || s.data.score || s.data)}</td>
        <td class="py-2">${fmt(s.data.detail || '')}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Energy Resilience
  </div>
</main>`;
}

// ---------------------------------------------------------------------------
// 12 — Bioregional Context
// ---------------------------------------------------------------------------

export function renderContext(d) {
  const reg = safeObj(d.regional);
  const pctls = safeObj(reg.percentiles);
  const narr = safeObj(safeObj(d.narratives).context);
  const protectedAreas = safeArr(reg.protectedAreas);

  const dimensions = [
    { label: 'Water', icon: 'water_drop', percentile: pctls.water || 0 },
    { label: 'Biodiversity', icon: 'forest', percentile: pctls.biodiversity || 0 },
    { label: 'Soil', icon: 'landscape', percentile: pctls.soil || 0 },
    { label: 'Carbon', icon: 'eco', percentile: pctls.carbon || 0 },
    { label: 'Resilience', icon: 'shield', percentile: pctls.resilience || 0 },
  ];

  return `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Bioregional Context</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-3 gap-8 text-[10.5pt] leading-relaxed text-editorial-charcoal mb-10">
    <div class="drop-cap">${escHtml(narr.narrative)}</div>
    <div class="col-span-2">
      ${percentileChart(dimensions)}
    </div>
  </div>

  <!-- Dimension rows -->
  ${dimensions.map(dim => `
  <div class="py-8 border-t-[0.5px] border-outline-variant flex gap-8">
    <span class="material-symbols-outlined text-[24px] text-primary mt-2">${dim.icon}</span>
    <div class="font-serif text-[36pt] font-normal leading-none text-primary w-24">${dim.percentile}<span class="text-[14pt]">th</span></div>
    <div class="flex-1">
      <div class="text-[8pt] font-bold uppercase tracking-widest text-outline mb-1">${escHtml(dim.label)} Percentile</div>
      <div class="text-[10.5pt] text-editorial-charcoal">Ranked in the ${dim.percentile}th percentile regionally</div>
      ${dim.percentile < 25 ? warningBadge('Below 25th Percentile') : ''}
    </div>
  </div>`).join('')}

  ${protectedAreas.length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 mt-8 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">park</span>
    Protected Areas
  </div>
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Name</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Type</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Distance</th>
      </tr>
    </thead>
    <tbody>
      ${protectedAreas.map(a => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(a.name)}</td>
        <td class="py-2">${fmt(a.type || a.designation)}</td>
        <td class="py-2">${fmt(a.distance, v => v + ' km')}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Bioregional Context
  </div>
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
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Change Over Time</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.dynamics)}</p>
    </div>
    <div>
      <div class="flex items-center gap-3 mb-4">
        <span class="material-symbols-outlined text-[24px] text-primary">timeline</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">Climate Trends</span>
      </div>
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
  </div>

  ${npvScenarios.length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">savings</span>
    NPV Scenarios
  </div>
  <table class="w-full text-left text-[10pt] mb-8">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Scenario</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">30-Year NPV</th>
      </tr>
    </thead>
    <tbody>
      ${npvScenarios.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(s.name || s.label)}</td>
        <td class="py-2">${fmt(s.value || s.npv, v => '\u20ac' + v.toLocaleString())}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${safeArr(trends.fireProneByDecade).length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">local_fire_department</span>
    Fire Risk Trend
  </div>
  <table class="w-full text-left text-[10pt]">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Decade</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Fire-Prone Days</th>
      </tr>
    </thead>
    <tbody>
      ${trends.fireProneByDecade.map(t => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(t.decade || t.label)}</td>
        <td class="py-2">${fmt(t.days || t.value)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Temporal Analysis
  </div>
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

  let html = `
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Map Portfolio</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>
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

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Cartographic Portfolio
  </div>
</main>`;

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
<main class="a4-container shadow-sm mt-8 mb-4">
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Compliance</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-12">
    <div>
      <p class="drop-cap text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.framework)}</p>
    </div>
    <div>
      <div class="flex items-center gap-3 mb-4">
        <span class="material-symbols-outlined text-[24px] text-primary">gavel</span>
        <span class="text-[8pt] font-bold uppercase tracking-widest text-outline">Regulatory Overview</span>
      </div>
    </div>
  </div>

  ${items.length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">checklist</span>
    Regulatory Framework
  </div>
  <table class="w-full text-left text-[10pt] mb-8">
    <thead>
      <tr class="border-b-2 border-primary">
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Regulation</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Status</th>
        <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `<tr class="border-b-[0.5pt] border-outline-variant">
        <td class="py-2">${fmt(i.name || i.regulation)}</td>
        <td class="py-2">${riskBadge(i.status || i.level)}</td>
        <td class="py-2">${fmt(i.notes || i.detail)}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  ${timeline.length > 0 ? `
  <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
    <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
    Timeline
  </div>
  <div class="space-y-4">
    ${timeline.map(t => `
    <div class="flex gap-6 py-3 border-b-[0.5pt] border-outline-variant">
      <div class="font-serif text-[14pt] text-primary font-bold w-20">${escHtml(String(t.year || t.date))}</div>
      <div class="text-[10.5pt] text-editorial-charcoal flex-1">${escHtml(t.event || t.description)}</div>
    </div>`).join('')}
  </div>` : ''}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Compliance &amp; Regulation
  </div>
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
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">What to Do Next</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-3 gap-8 text-[10.5pt] leading-relaxed text-editorial-charcoal mb-10">
    <div class="drop-cap">${escHtml(narr.framing)}</div>
    <div class="col-span-2"></div>
  </div>

  ${actionGrid('Immediate Actions', 'priority_high', actions.immediate)}
  ${actionGrid('Short-Term Actions', 'event_upcoming', actions.shortTerm)}
  ${actionGrid('Long-Term Actions', 'calendar_month', actions.longTerm)}

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Action Plan
  </div>
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
  <h1 class="font-serif italic text-[32pt] leading-tight text-primary mb-6">Methodology, Sources &amp; Disclaimer</h1>
  <div class="w-4/5 h-[0.5pt] bg-outline-variant mb-8"></div>

  <div class="grid grid-cols-[1.5fr_1fr] gap-12 mb-10">
    <div>
      <div class="text-[8pt] font-bold uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px] text-primary">source</span>
        Data Sources
      </div>
      <table class="w-full text-left text-[10pt]">
        <thead>
          <tr class="border-b-2 border-primary">
            <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Source</th>
            <th class="text-[8pt] font-bold uppercase tracking-widest text-primary pb-2">Description</th>
          </tr>
        </thead>
        <tbody>
          ${sources.map(s => `<tr class="border-b-[0.5pt] border-outline-variant">
            <td class="py-2 font-semibold">${escHtml(s.name)}</td>
            <td class="py-2">${escHtml(s.description)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div>
      <div class="text-[11pt] leading-[1.6] text-editorial-charcoal">${escHtml(narr.text)}</div>
    </div>
  </div>

  ${narr.disclaimer ? `
  <blockquote class="pl-6 border-l-[3pt] border-editorial-terracotta italic font-serif text-[13pt] text-primary leading-relaxed mb-8">
    ${escHtml(narr.disclaimer)}
  </blockquote>` : ''}

  <div class="border-t-[0.5pt] border-outline-variant pt-6 text-center">
    <div class="text-[8pt] font-bold uppercase tracking-widest text-outline">LandBook Natural Capital Assessment</div>
    <div class="text-[9pt] text-secondary mt-2">Generated ${fmt(meta.generatedAt)} &middot; ${fmt(meta.version)}</div>
  </div>

  <div class="absolute bottom-[20mm] left-[20mm] right-[20mm] text-[8px] font-bold uppercase tracking-widest text-outline">
    LandBook &middot; Methodology &amp; Disclaimer
  </div>
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
