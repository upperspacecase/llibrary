/* ───────────────────────────────────────────────────────
   LandBook Report Preview — Rapid Prototyping System
   ─────────────────────────────────────────────────────── */

// ── Styles ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  :root {
    --green: #1B4332;
    --green-light: #2D6A4F;
    --green-pale: #D8F3DC;
    --terra: #BC6C25;
    --terra-light: #DDA15E;
    --sky: #90E0EF;
    --sky-dark: #0077B6;
    --amber: #F4A261;
    --red: #E76F51;
    --bg: #F8F6F2;
    --white: #FFFFFF;
    --text: #1a1a1a;
    --text-muted: #6b7280;
    --border: #e5e2db;
    --font: 'Inter', -apple-system, sans-serif;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: var(--font);
    background: #e5e2db;
    color: var(--text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── Version bar ── */
  #version-bar {
    position: sticky; top: 0; z-index: 100;
    background: var(--green);
    color: white;
    padding: 10px 0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  }
  .version-bar-inner {
    max-width: 900px; margin: 0 auto;
    display: flex; align-items: center; gap: 16px;
    padding: 0 24px;
  }
  .version-label { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
  #version-select {
    background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
    color: white; padding: 6px 12px; border-radius: 6px; font-size: 13px;
    font-family: var(--font); cursor: pointer;
  }
  #version-select option { background: var(--green); color: white; }
  .version-date { font-size: 12px; opacity: 0.7; margin-left: auto; }

  /* ── Report container ── */
  #report-container {
    max-width: 850px; margin: 24px auto; padding: 0 16px;
  }

  /* ── Page (A4 feel) ── */
  .report-page {
    background: var(--white);
    border-radius: 4px;
    box-shadow: 0 1px 8px rgba(0,0,0,0.08);
    margin-bottom: 24px;
    padding: 56px 56px 48px;
    page-break-after: always;
  }

  /* ── Typography ── */
  .section-number {
    font-size: 11px; font-weight: 700; color: var(--terra);
    letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;
  }
  .section-title {
    font-size: 26px; font-weight: 800; color: var(--green);
    margin-bottom: 8px; line-height: 1.2;
  }
  .section-subtitle {
    font-size: 14px; color: var(--text-muted); margin-bottom: 32px;
  }
  h3 {
    font-size: 15px; font-weight: 700; color: var(--green);
    margin: 28px 0 12px; padding-bottom: 6px;
    border-bottom: 2px solid var(--green-pale);
  }

  /* ── Tables ── */
  .data-table {
    width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;
  }
  .data-table th {
    text-align: left; font-weight: 600; font-size: 11px;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;
    padding: 8px 12px; border-bottom: 2px solid var(--border);
  }
  .data-table td {
    padding: 10px 12px; border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table .label { color: var(--text-muted); font-weight: 500; }
  .data-table .value { font-weight: 600; }

  /* ── KPI Cards ── */
  .kpi-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0;
  }
  .kpi-card {
    background: var(--bg); border-radius: 10px; padding: 20px 16px;
    text-align: center; border: 1px solid var(--border);
  }
  .kpi-value {
    font-size: 28px; font-weight: 800; color: var(--green); line-height: 1;
  }
  .kpi-label {
    font-size: 10px; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 1.5px; margin-top: 8px;
  }
  .kpi-sub {
    font-size: 11px; color: var(--text-muted); margin-top: 4px;
  }

  /* ── Cards grid ── */
  .cards-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0;
  }
  .card {
    background: var(--bg); border-radius: 8px; padding: 16px;
    border: 1px solid var(--border); text-align: center;
  }
  .card-icon { font-size: 24px; margin-bottom: 6px; }
  .card-title { font-size: 12px; font-weight: 700; color: var(--green); }

  /* ── Risk indicators ── */
  .risk-row {
    display: flex; align-items: center; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid var(--border);
  }
  .risk-row:last-child { border-bottom: none; }
  .risk-dot {
    width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
  }
  .risk-dot.low { background: #22c55e; }
  .risk-dot.moderate { background: var(--amber); }
  .risk-dot.high { background: var(--red); }
  .risk-label { font-size: 13px; font-weight: 600; flex: 1; }
  .risk-value { font-size: 13px; color: var(--text-muted); }

  /* ── Charts (SVG) ── */
  .chart-container { margin: 20px 0; text-align: center; }
  .chart-container svg { max-width: 100%; }

  /* ── Bar chart ── */
  .bar-row {
    display: flex; align-items: center; gap: 12px; margin: 6px 0;
  }
  .bar-label { width: 140px; font-size: 12px; font-weight: 500; text-align: right; flex-shrink: 0; }
  .bar-track { flex: 1; height: 24px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .bar-fill {
    height: 100%; border-radius: 4px; display: flex; align-items: center;
    padding: 0 8px; font-size: 11px; font-weight: 600; color: white;
    transition: width 0.5s ease;
  }
  .bar-fill.green { background: var(--green); }
  .bar-fill.terra { background: var(--terra); }
  .bar-fill.sky { background: var(--sky-dark); }
  .bar-fill.amber { background: var(--amber); }
  .bar-fill.red { background: var(--red); }

  /* ── Checklist ── */
  .checklist { list-style: none; }
  .checklist li {
    padding: 8px 0; border-bottom: 1px solid var(--border);
    font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
  }
  .checklist li:last-child { border-bottom: none; }
  .check-box {
    width: 16px; height: 16px; border: 2px solid var(--border);
    border-radius: 3px; flex-shrink: 0; margin-top: 1px;
  }

  /* ── Cover page ── */
  .cover-page {
    background: var(--green); color: white; text-align: center;
    padding: 80px 56px 60px; min-height: 500px;
    display: flex; flex-direction: column; justify-content: center;
  }
  .cover-page .section-number,
  .cover-page .section-title { color: white; }
  .cover-badge {
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    background: rgba(255,255,255,0.15); margin-bottom: 32px;
  }
  .cover-property { font-size: 42px; font-weight: 900; margin-bottom: 8px; line-height: 1.1; }
  .cover-location { font-size: 16px; opacity: 0.8; margin-bottom: 40px; }
  .cover-kpi .kpi-card {
    background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);
  }
  .cover-kpi .kpi-value { color: white; }
  .cover-kpi .kpi-label { color: rgba(255,255,255,0.7); }
  .cover-kpi .kpi-sub { color: rgba(255,255,255,0.5); }
  .cover-date { font-size: 12px; opacity: 0.5; margin-top: 40px; }

  /* ── Risk matrix ── */
  .risk-matrix {
    display: grid; grid-template-columns: auto 1fr 1fr; gap: 2px;
    font-size: 12px; margin: 16px 0;
  }
  .risk-matrix .header { font-weight: 700; padding: 10px; text-align: center; background: var(--bg); }
  .risk-matrix .cell {
    padding: 10px; text-align: center; border-radius: 4px; font-weight: 600;
  }
  .risk-matrix .cell.low-risk { background: #dcfce7; color: #166534; }
  .risk-matrix .cell.mod-risk { background: #fef3c7; color: #92400e; }
  .risk-matrix .cell.high-risk { background: #fee2e2; color: #991b1b; }

  /* ── Map placeholder ── */
  .map-placeholder {
    background: var(--bg); border: 2px dashed var(--border); border-radius: 8px;
    height: 200px; display: flex; align-items: center; justify-content: center;
    color: var(--text-muted); font-size: 13px; font-weight: 500; margin: 12px 0;
  }

  /* ── Seasonal calendar ── */
  .season-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0;
  }
  .season-card {
    background: var(--bg); border-radius: 8px; padding: 14px; font-size: 12px;
    border: 1px solid var(--border);
  }
  .season-card .period { font-weight: 700; color: var(--green); margin-bottom: 4px; }
  .season-card .risk-tag {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 10px; font-weight: 600; margin: 4px 0;
  }
  .season-card .risk-tag.moderate { background: #fef3c7; color: #92400e; }
  .season-card .risk-tag.high { background: #fee2e2; color: #991b1b; }
  .season-card .risk-tag.low { background: #dcfce7; color: #166534; }

  /* ── Score bars ── */
  .score-row {
    display: flex; align-items: center; gap: 12px; margin: 8px 0;
  }
  .score-label { width: 120px; font-size: 12px; font-weight: 600; }
  .score-track { flex: 1; height: 10px; background: var(--bg); border-radius: 5px; overflow: hidden; }
  .score-fill { height: 100%; border-radius: 5px; background: var(--green); }
  .score-value { width: 50px; font-size: 13px; font-weight: 700; color: var(--green); text-align: right; }

  /* ── Map portfolio grid ── */
  .map-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 16px 0;
  }
  .map-grid .map-item { text-align: center; }
  .map-grid .map-item .map-placeholder { height: 160px; }
  .map-grid .map-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 6px; }

  /* ── Sources ── */
  .source-tag {
    display: inline-block; padding: 3px 10px; border-radius: 12px;
    font-size: 11px; font-weight: 500; background: var(--green-pale);
    color: var(--green); margin: 2px 4px 2px 0;
  }

  /* ── Disclaimer ── */
  .disclaimer {
    background: var(--bg); border-radius: 8px; padding: 20px;
    font-size: 11px; color: var(--text-muted); line-height: 1.6;
    border-left: 3px solid var(--amber);
  }

  /* ── Print ── */
  @media print {
    body { background: white; }
    #version-bar { display: none; }
    #report-container { max-width: none; margin: 0; padding: 0; }
    .report-page { box-shadow: none; border-radius: 0; margin-bottom: 0; }
    .cover-page { min-height: 100vh; }
  }
`;
document.head.appendChild(style);

// ── Sample Data (Odemira-style property for v1) ──────────
const SAMPLE = {
  property: {
    name: 'Quinta da Ribeira',
    parish: 'Reliquias',
    municipality: 'Odemira',
    country: 'Portugal',
    coords: '37.7164\u00b0N, 8.7167\u00b0W',
    elevation: '85\u2013120m',
    aspect: 'South-facing, 3\u20138% slope',
    zoning: 'Territ\u00f3rio R\u00fastico',
    climate_zone: 'Csa (Hot-summer Mediterranean)',
    area_ha: 6.07,
    area_sqm: 60700,
  },
  kpis: {
    area: '6.07',
    area_unit: 'Hectares',
    value: '\u20ac230K',
    value_sub: 'Est. Market Value',
    bio: '7.2/10',
    bio_sub: 'Bio Score',
    water: '8.5/10',
    water_sub: 'Water Security',
  },
  value_composition: {
    market: { label: 'Market Value', value: 202500, pct: 76 },
    natural: { label: 'Natural Capital', value: 45000, pct: 18 },
    ecosystem: { label: 'Ecosystem Services', value: 14582, pct: 6 },
  },
  opportunities: [
    { icon: '\ud83d\udca7', title: 'Water Security' },
    { icon: '\ud83c\udf3f', title: 'Carbon Credits' },
    { icon: '\ud83d\udd25', title: 'Fire Management' },
    { icon: '\ud83c\udf3e', title: 'Olive Rehabilitation' },
    { icon: '\ud83d\udc1d', title: 'Pollination' },
    { icon: '\ud83c\udfd5\ufe0f', title: 'Eco-Tourism' },
  ],
  risks: [
    { label: 'Fire Risk', score: '3/5', level: 'Moderate', cls: 'moderate' },
    { label: 'Flood Risk', score: '1/5', level: 'Very Low', cls: 'low' },
    { label: 'Drought Risk', score: '3/5', level: 'Moderate', cls: 'moderate' },
  ],
  natural_capital: {
    dimensions: [
      { label: 'Water Resources', score: 8.5, avg: 6.2, status: 'Above Average', insight: '2 springs + borehole' },
      { label: 'Biodiversity', score: 7.2, avg: 5.8, status: 'Above Average', insight: '3 Natura 2000 habitats' },
      { label: 'Soil & Land', score: 7.0, avg: 6.5, status: 'Average', insight: 'Cambisols dominant' },
      { label: 'Carbon & Biomass', score: 6.5, avg: 5.0, status: 'Improvement Potential', insight: '187 tCO\u2082e stored' },
      { label: 'Climate Resilience', score: 6.0, avg: 5.5, status: 'Manageable', insight: 'Fire risk requires active mgmt' },
    ],
  },
  ecosystem_services: {
    total: 14582,
    items: [
      { service: 'Food & Fiber', value: 4902, pct: 34, method: 'Market price' },
      { service: 'Water Provisioning', value: 3152, pct: 22, method: 'Replacement cost' },
      { service: 'Recreation/Cultural', value: 2300, pct: 16, method: 'Travel cost' },
      { service: 'Water Regulation', value: 1200, pct: 8, method: 'Benefit transfer' },
      { service: 'Soil Protection', value: 1092, pct: 8, method: 'Avoided cost' },
      { service: 'Pollination', value: 450, pct: 3, method: 'Production value' },
      { service: 'Pest Control', value: 300, pct: 2, method: 'Avoided cost' },
      { service: 'Genetic Resources', value: 350, pct: 2, method: 'Market value' },
      { service: 'Carbon/Climate', value: 336, pct: 2, method: 'Social cost of carbon' },
    ],
  },
  terrain: {
    slopes: [
      { label: 'Gentle 0\u20135%', pct: 45 },
      { label: 'Moderate 5\u201310%', pct: 40 },
      { label: 'Steep 10\u201315%', pct: 12 },
      { label: 'Very steep >15%', pct: 3 },
    ],
    soils: [
      { label: 'Cambisols', pct: 60 },
      { label: 'Leptosols', pct: 25 },
      { label: 'Fluvisols', pct: 15 },
    ],
    landcover: [
      { label: 'Cork Oak Montado', ha: 3.2, pct: 53 },
      { label: 'Abandoned Olive', ha: 1.8, pct: 30 },
      { label: 'Scrub/Maquis', ha: 0.7, pct: 11 },
      { label: 'Infrastructure', ha: 0.37, pct: 6 },
    ],
    water_security: 8.5,
  },
  climate: {
    summary: [
      { metric: 'Annual Mean Temp', value: '16.5\u00b0C' },
      { metric: 'Summer Mean (Jun\u2013Aug)', value: '24.5\u00b0C' },
      { metric: 'Winter Mean (Dec\u2013Feb)', value: '11.0\u00b0C' },
      { metric: 'Annual Rainfall', value: '650mm' },
      { metric: 'Growing Season', value: '280 days' },
      { metric: 'Frost Days/Year', value: '5\u201310 days' },
    ],
    monthly_temp: [10,11,13,15,18,22,26,26,23,18,13,10],
    monthly_rain: [80,70,55,40,25,8,2,3,20,60,80,90],
    seasons: [
      { period: 'Jan\u2013Mar', risk: 'Saturated soils', tag: 'moderate', notes: 'Access limitations' },
      { period: 'Apr\u2013May', risk: 'Fire season begins', tag: 'moderate', notes: 'Fuel reduction critical' },
      { period: 'Jun\u2013Aug', risk: 'PEAK FIRE RISK', tag: 'high', notes: 'No outdoor burning' },
      { period: 'Sep\u2013Dec', risk: 'First rains, erosion', tag: 'low', notes: 'Revegetation window' },
    ],
  },
  biodiversity: {
    species: [
      { group: 'Birds', count: 25 },
      { group: 'Reptiles', count: 12 },
      { group: 'Amphibians', count: 8 },
      { group: 'Flora (key)', count: 8 },
      { group: 'Mammals', count: 7 },
    ],
    key_species: [
      { species: 'Azure-winged Magpie', status: 'Endemic', significance: 'Mature montado indicator' },
      { species: 'Cork Oak', status: 'Native', significance: '280 trees, prime production' },
      { species: 'Fire Salamander', status: 'Indicator', significance: 'Pristine water quality' },
      { species: 'Common Genet', status: 'Native', significance: 'Healthy ecosystem' },
    ],
    habitats: [
      { code: '9230', name: 'Cork Oak Woods', priority: true },
      { code: '5330', name: 'Mediterranean Maquis', priority: true },
      { code: '92D0', name: 'Riparian Galleries', priority: true },
    ],
  },
  agriculture: {
    cork: [
      { scenario: 'Current Management', revenue: 1572, approach: 'Low input, 9-year cycle' },
      { scenario: 'Optimized Management', revenue: 1954, approach: 'Density increase, soil mgmt' },
      { scenario: 'High-Value Cork', revenue: 1888, approach: 'Premium thickness grade' },
    ],
    revenue_scenarios: [
      { scenario: 'Conservative', value: 1572, label: 'Cork only' },
      { scenario: 'Moderate', value: 3492, label: 'Cork + Pastoral' },
      { scenario: 'Optimized', value: 18492, label: 'All systems' },
    ],
    carbon: {
      stock: '187 tCO\u2082e',
      annual: '4.2 tCO\u2082e/yr',
      credit_value: '\u20ac1,500\u20132,500/yr',
    },
  },
  risk_matrix: [
    { risk: 'Fire', probability: 'High', impact: 'Critical', level: 'HIGH' },
    { risk: 'Drought', probability: 'High', impact: 'Major', level: 'HIGH' },
    { risk: 'Erosion', probability: 'Moderate', impact: 'Major', level: 'MODERATE' },
    { risk: 'Flood', probability: 'Low', impact: 'Critical', level: 'LOW' },
    { risk: 'Pests', probability: 'Low', impact: 'Moderate', level: 'LOW' },
  ],
  mitigations: [
    'Maintain 10m defensible space around structures',
    'Continue grazing rotation for fuel load reduction',
    'Clear abandoned olive area of accumulated debris',
    'Install rainwater harvesting for drought resilience',
  ],
  maps: [
    'Satellite Base & Boundary',
    'Topography & Hydrology',
    'Geology & Soils',
    'Vegetation & Land Cover',
    'Water Resources',
    'Climate & Risk Zones',
    'Biodiversity & Habitats',
    '3D Perspective',
  ],
  valuation: {
    benchmarks: [
      { label: 'Your Property', value: 33400 },
      { label: 'Odemira avg', value: 28000 },
      { label: 'Alentejo avg', value: 22000 },
      { label: 'Premium (water)', value: 42000 },
      { label: 'Premium (views)', value: 38000 },
    ],
    scenarios: [
      { scenario: 'Conservative', total: 185000, per_ha: 30500, basis: 'Comparable sales' },
      { scenario: 'Market', total: 202500, per_ha: 33400, basis: 'Adjusted comparables' },
      { scenario: 'Optimistic', total: 220000, per_ha: 36300, basis: 'Natural capital premium' },
    ],
  },
  next_steps: {
    immediate: [
      'Verify property boundaries with licensed surveyor',
      'Implement fire fuel reduction in abandoned olive area',
      'Install water metering for usage optimization',
    ],
    short_term: [
      'Olive grove rehabilitation assessment',
      'Carbon credit feasibility study',
      'Biodiversity monitoring protocol setup',
    ],
    long_term: [
      'Eco-tourism infrastructure development',
      'Regenerative agriculture certification',
      'Conservation easement evaluation',
    ],
  },
  sources: [
    { category: 'Satellite Imagery', source: 'Sentinel-2 (ESA)', resolution: '10m' },
    { category: 'Soil Data', source: 'SoilGrids 2.0 / INIAP', resolution: '250m / 1:25,000' },
    { category: 'Climate', source: 'Open-Meteo / CHIRPS', resolution: '5km / 30-year' },
    { category: 'Biodiversity', source: 'iNaturalist / GBIF', resolution: 'Point observations' },
    { category: 'Elevation', source: 'Copernicus DEM', resolution: '30m' },
    { category: 'Fire Risk', source: 'EFFIS / NASA FIRMS', resolution: '375m / NRT' },
    { category: 'Geology', source: 'Macrostrat', resolution: 'Variable' },
    { category: 'Infrastructure', source: 'OpenStreetMap (Overpass)', resolution: 'Crowdsourced' },
    { category: 'Protected Areas', source: 'Natura 2000 / EEA', resolution: '1:100,000' },
    { category: 'Admin Boundaries', source: 'DGT Portugal', resolution: '1:25,000' },
    { category: 'Flood Risk', source: 'GloFAS (Open-Meteo)', resolution: '10km' },
    { category: 'Routing', source: 'OpenRouteService', resolution: 'Road network' },
  ],
};

// ── SVG Chart Helpers ────────────────────────────────────

function donutChart(segments, size = 180) {
  const cx = size / 2, cy = size / 2, r = 65, rInner = 40;
  let cumAngle = -90;
  const colors = ['#1B4332', '#BC6C25', '#90E0EF'];
  const paths = segments.map((s, i) => {
    const angle = (s.pct / 100) * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + angle) * Math.PI) / 180;
    cumAngle += angle;
    const large = angle > 180 ? 1 : 0;
    const x1o = cx + r * Math.cos(startRad), y1o = cy + r * Math.sin(startRad);
    const x2o = cx + r * Math.cos(endRad), y2o = cy + r * Math.sin(endRad);
    const x1i = cx + rInner * Math.cos(endRad), y1i = cy + rInner * Math.sin(endRad);
    const x2i = cx + rInner * Math.cos(startRad), y2i = cy + rInner * Math.sin(startRad);
    return `<path d="M${x1o},${y1o} A${r},${r} 0 ${large} 1 ${x2o},${y2o} L${x1i},${y1i} A${rInner},${rInner} 0 ${large} 0 ${x2i},${y2i} Z" fill="${colors[i]}" />`;
  });
  const legend = segments.map((s, i) =>
    `<div style="display:flex;align-items:center;gap:6px;font-size:12px;"><span style="width:10px;height:10px;border-radius:2px;background:${colors[i]};display:inline-block;"></span>${s.label}: ${s.pct}%</div>`
  ).join('');
  return `<div style="display:flex;align-items:center;gap:32px;justify-content:center;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths.join('')}</svg>
    <div style="display:flex;flex-direction:column;gap:6px;">${legend}</div>
  </div>`;
}

function radarChart(dims, size = 260) {
  const cx = size / 2, cy = size / 2, r = 100;
  const n = dims.length;
  const angleStep = (2 * Math.PI) / n;
  const levels = [2, 4, 6, 8, 10];

  let gridLines = '';
  levels.forEach(lev => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = i * angleStep - Math.PI / 2;
      pts.push(`${cx + (r * lev / 10) * Math.cos(a)},${cy + (r * lev / 10) * Math.sin(a)}`);
    }
    gridLines += `<polygon points="${pts.join(' ')}" fill="none" stroke="#e5e2db" stroke-width="1" />`;
  });

  // Axis lines + labels
  let axes = '';
  dims.forEach((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    const x2 = cx + r * Math.cos(a), y2 = cy + r * Math.sin(a);
    axes += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#e5e2db" stroke-width="1" />`;
    const lx = cx + (r + 18) * Math.cos(a), ly = cy + (r + 18) * Math.sin(a);
    axes += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="9" font-weight="600" fill="#6b7280">${d.label}</text>`;
  });

  // Data polygons
  function polygon(values, color, opacity) {
    const pts = values.map((v, i) => {
      const a = i * angleStep - Math.PI / 2;
      return `${cx + (r * v / 10) * Math.cos(a)},${cy + (r * v / 10) * Math.sin(a)}`;
    });
    return `<polygon points="${pts.join(' ')}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="2" />`;
  }

  const avgPoly = polygon(dims.map(d => d.avg), '#BC6C25', 0.1);
  const scorePoly = polygon(dims.map(d => d.score), '#1B4332', 0.2);

  // Dots
  let dots = '';
  dims.forEach((d, i) => {
    const a = i * angleStep - Math.PI / 2;
    const x = cx + (r * d.score / 10) * Math.cos(a);
    const y = cy + (r * d.score / 10) * Math.sin(a);
    dots += `<circle cx="${x}" cy="${y}" r="4" fill="#1B4332" />`;
  });

  return `<div class="chart-container">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${gridLines}${axes}${avgPoly}${scorePoly}${dots}
    </svg>
    <div style="display:flex;gap:20px;justify-content:center;margin-top:8px;font-size:11px;">
      <span><span style="display:inline-block;width:12px;height:3px;background:#1B4332;margin-right:4px;vertical-align:middle;"></span>This Property</span>
      <span><span style="display:inline-block;width:12px;height:3px;background:#BC6C25;margin-right:4px;vertical-align:middle;"></span>Regional Average</span>
    </div>
  </div>`;
}

function monthlyClimateChart(temps, rain, w = 680, h = 220) {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const pad = { l: 40, r: 40, t: 20, b: 30 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const maxT = Math.max(...temps) + 2, maxR = Math.max(...rain) + 10;
  const barW = cw / 12 * 0.5;

  let bars = '', line = '';
  const points = [];
  months.forEach((m, i) => {
    const x = pad.l + (i + 0.5) * (cw / 12);
    const bh = (rain[i] / maxR) * ch;
    bars += `<rect x="${x - barW/2}" y="${pad.t + ch - bh}" width="${barW}" height="${bh}" fill="#90E0EF" rx="2" />`;
    const ty = pad.t + ch - (temps[i] / maxT) * ch;
    points.push(`${x},${ty}`);
  });
  line = `<polyline points="${points.join(' ')}" fill="none" stroke="#E76F51" stroke-width="2.5" stroke-linejoin="round" />`;
  points.forEach(p => {
    const [px, py] = p.split(',');
    line += `<circle cx="${px}" cy="${py}" r="3.5" fill="#E76F51" />`;
  });

  // Axes labels
  let labels = '';
  months.forEach((m, i) => {
    const x = pad.l + (i + 0.5) * (cw / 12);
    labels += `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#6b7280">${m}</text>`;
  });

  return `<div class="chart-container">
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      ${bars}${line}${labels}
    </svg>
    <div style="display:flex;gap:20px;justify-content:center;font-size:11px;">
      <span><span style="display:inline-block;width:12px;height:8px;background:#90E0EF;margin-right:4px;vertical-align:middle;border-radius:2px;"></span>Rainfall (mm)</span>
      <span><span style="display:inline-block;width:12px;height:3px;background:#E76F51;margin-right:4px;vertical-align:middle;"></span>Temperature (\u00b0C)</span>
    </div>
  </div>`;
}

// ── Report HTML Builder ──────────────────────────────────

function buildReportHTML(d) {
  const now = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const maxEco = Math.max(...d.ecosystem_services.items.map(e => e.value));
  const maxRev = Math.max(...d.agriculture.revenue_scenarios.map(r => r.value));
  const maxBench = Math.max(...d.valuation.benchmarks.map(b => b.value));
  const maxBio = Math.max(...d.biodiversity.species.map(s => s.count));

  return `
<!-- SECTION 0: COVER -->
<div class="report-page cover-page">
  <div class="cover-badge">LANDBOOK MVP v3.0</div>
  <div class="cover-property">${d.property.name}</div>
  <div class="cover-location">${d.property.parish}, ${d.property.municipality}, ${d.property.country} &middot; ${d.property.coords}</div>
  <div class="cover-kpi">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-value">${d.kpis.area}</div><div class="kpi-label">Hectares</div></div>
      <div class="kpi-card"><div class="kpi-value">${d.kpis.value}</div><div class="kpi-label">Est. Value</div></div>
      <div class="kpi-card"><div class="kpi-value">${d.kpis.bio}</div><div class="kpi-label">Bio Score</div></div>
      <div class="kpi-card"><div class="kpi-value">${d.kpis.water}</div><div class="kpi-label">Water Security</div></div>
    </div>
  </div>
  <div class="cover-date">Report generated ${now}</div>
</div>

<!-- SECTION 1: EXECUTIVE SUMMARY -->
<div class="report-page">
  <div class="section-number">Section 01</div>
  <div class="section-title">Executive Summary</div>
  <div class="section-subtitle">Decision-ready overview of property attributes and potential</div>

  <h3>1.1 Property Snapshot</h3>
  <table class="data-table">
    <thead><tr><th>Attribute</th><th>Value</th><th>Source</th></tr></thead>
    <tbody>
      <tr><td class="label">Coordinates</td><td class="value">${d.property.coords}</td><td>User input / GPS</td></tr>
      <tr><td class="label">Elevation</td><td class="value">${d.property.elevation}</td><td>Copernicus DEM</td></tr>
      <tr><td class="label">Aspect</td><td class="value">${d.property.aspect}</td><td>Derived</td></tr>
      <tr><td class="label">Zoning</td><td class="value">${d.property.zoning}</td><td>Municipal data</td></tr>
      <tr><td class="label">Climate Zone</td><td class="value">${d.property.climate_zone}</td><td>K\u00f6ppen-Geiger</td></tr>
    </tbody>
  </table>

  <h3>1.2 Value Composition</h3>
  ${donutChart([d.value_composition.market, d.value_composition.natural, d.value_composition.ecosystem])}

  <h3>1.3 Key Opportunities</h3>
  <div class="cards-grid">
    ${d.opportunities.map(o => `<div class="card"><div class="card-icon">${o.icon}</div><div class="card-title">${o.title}</div></div>`).join('')}
  </div>

  <h3>1.4 Risk Summary</h3>
  ${d.risks.map(r => `<div class="risk-row"><div class="risk-dot ${r.cls}"></div><div class="risk-label">${r.label}</div><div class="risk-value">${r.score} (${r.level})</div></div>`).join('')}
</div>

<!-- SECTION 2: NATURAL CAPITAL SCORECARD -->
<div class="report-page">
  <div class="section-number">Section 02</div>
  <div class="section-title">Natural Capital Scorecard</div>
  <div class="section-subtitle">Five-dimension assessment compared to regional averages</div>

  ${radarChart(d.natural_capital.dimensions)}

  <h3>Detailed Breakdown</h3>
  <table class="data-table">
    <thead><tr><th>Dimension</th><th>Score</th><th>Status</th><th>Key Insight</th></tr></thead>
    <tbody>
      ${d.natural_capital.dimensions.map(dim => `<tr><td class="label">${dim.label}</td><td class="value">${dim.score}/10</td><td>${dim.status}</td><td>${dim.insight}</td></tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- SECTION 3: ECOSYSTEM SERVICES VALUATION -->
<div class="report-page">
  <div class="section-number">Section 03</div>
  <div class="section-title">Ecosystem Services Valuation</div>
  <div class="section-subtitle">Total annual value: \u20ac${d.ecosystem_services.total.toLocaleString()}</div>

  <table class="data-table">
    <thead><tr><th>Service</th><th>Annual Value</th><th>% Total</th><th>Methodology</th></tr></thead>
    <tbody>
      ${d.ecosystem_services.items.map(e => `<tr><td class="label">${e.service}</td><td class="value">\u20ac${e.value.toLocaleString()}</td><td>${e.pct}%</td><td>${e.method}</td></tr>`).join('')}
    </tbody>
  </table>

  ${d.ecosystem_services.items.map(e => `<div class="bar-row"><div class="bar-label">${e.service}</div><div class="bar-track"><div class="bar-fill green" style="width:${(e.value / maxEco * 100).toFixed(0)}%">\u20ac${e.value.toLocaleString()}</div></div></div>`).join('')}
</div>

<!-- SECTION 4: TERRAIN & LANDSCAPE -->
<div class="report-page">
  <div class="section-number">Section 04</div>
  <div class="section-title">Terrain & Landscape</div>
  <div class="section-subtitle">Topography, soils, land cover, and water resources</div>

  <h3>4.1 Slope Analysis</h3>
  ${d.terrain.slopes.map(s => `<div class="bar-row"><div class="bar-label">${s.label}</div><div class="bar-track"><div class="bar-fill terra" style="width:${s.pct}%">${s.pct}%</div></div></div>`).join('')}

  <h3>4.2 Soil Composition</h3>
  ${d.terrain.soils.map(s => `<div class="bar-row"><div class="bar-label">${s.label}</div><div class="bar-track"><div class="bar-fill green" style="width:${s.pct}%">${s.pct}%</div></div></div>`).join('')}

  <h3>4.3 Land Cover</h3>
  ${d.terrain.landcover.map(lc => `<div class="bar-row"><div class="bar-label">${lc.label}</div><div class="bar-track"><div class="bar-fill sky" style="width:${lc.pct}%">${lc.ha}ha (${lc.pct}%)</div></div></div>`).join('')}

  <h3>4.4 Water Resources</h3>
  <div class="map-placeholder">Map: Spring locations, borehole, pond, watershed boundaries</div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:12px;">
    <div class="score-label" style="font-size:14px;font-weight:700;">Water Security Index</div>
    <div class="score-track" style="flex:1;height:14px;"><div class="score-fill" style="width:${d.terrain.water_security * 10}%;background:var(--sky-dark);"></div></div>
    <div class="score-value" style="color:var(--sky-dark);">${d.terrain.water_security}/10</div>
  </div>
</div>

<!-- SECTION 5: CLIMATE PROFILE -->
<div class="report-page">
  <div class="section-number">Section 05</div>
  <div class="section-title">Climate Profile</div>
  <div class="section-subtitle">Seasonal patterns, risks, and growing conditions</div>

  <h3>5.1 Annual Climate Summary</h3>
  <table class="data-table">
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>
      ${d.climate.summary.map(c => `<tr><td class="label">${c.metric}</td><td class="value">${c.value}</td></tr>`).join('')}
    </tbody>
  </table>

  <h3>5.2 Monthly Profile</h3>
  ${monthlyClimateChart(d.climate.monthly_temp, d.climate.monthly_rain)}

  <h3>5.3 Seasonal Risk Calendar</h3>
  <div class="season-grid">
    ${d.climate.seasons.map(s => `<div class="season-card"><div class="period">${s.period}</div><span class="risk-tag ${s.tag}">${s.risk}</span><div style="margin-top:6px;color:var(--text-muted);">${s.notes}</div></div>`).join('')}
  </div>
</div>

<!-- SECTION 6: BIODIVERSITY INVENTORY -->
<div class="report-page">
  <div class="section-number">Section 06</div>
  <div class="section-title">Biodiversity Inventory</div>
  <div class="section-subtitle">Species observations and habitat classifications</div>

  <h3>6.1 Species Summary</h3>
  ${d.biodiversity.species.map(s => `<div class="bar-row"><div class="bar-label">${s.group}</div><div class="bar-track"><div class="bar-fill green" style="width:${(s.count / maxBio * 100).toFixed(0)}%">${s.count} species</div></div></div>`).join('')}

  <h3>6.2 Key Species & Indicators</h3>
  <table class="data-table">
    <thead><tr><th>Species</th><th>Status</th><th>Ecological Significance</th></tr></thead>
    <tbody>
      ${d.biodiversity.key_species.map(s => `<tr><td class="value">${s.species}</td><td>${s.status}</td><td>${s.significance}</td></tr>`).join('')}
    </tbody>
  </table>

  <h3>6.3 Habitat Types (Natura 2000)</h3>
  ${d.biodiversity.habitats.map(h => `<div style="margin:8px 0;font-size:13px;"><strong style="color:var(--green);">*${h.code}</strong> ${h.name} ${h.priority ? '<span style="font-size:10px;background:var(--green-pale);padding:2px 8px;border-radius:10px;color:var(--green);font-weight:600;">Priority</span>' : ''}</div>`).join('')}
</div>

<!-- SECTION 7: AGRICULTURAL & REVENUE POTENTIAL -->
<div class="report-page">
  <div class="section-number">Section 07</div>
  <div class="section-title">Agricultural & Revenue Potential</div>
  <div class="section-subtitle">Production models and income scenarios</div>

  <h3>7.1 Cork Production Model</h3>
  <table class="data-table">
    <thead><tr><th>Scenario</th><th>Annual Revenue</th><th>Approach</th></tr></thead>
    <tbody>
      ${d.agriculture.cork.map(c => `<tr><td class="label">${c.scenario}</td><td class="value">\u20ac${c.revenue.toLocaleString()}</td><td>${c.approach}</td></tr>`).join('')}
    </tbody>
  </table>

  <h3>7.2 Total Revenue Scenarios</h3>
  ${d.agriculture.revenue_scenarios.map(r => `<div class="bar-row"><div class="bar-label">${r.scenario}</div><div class="bar-track"><div class="bar-fill terra" style="width:${(r.value / maxRev * 100).toFixed(0)}%">\u20ac${r.value.toLocaleString()}/yr</div></div></div>`).join('')}

  <h3>7.3 Carbon Potential</h3>
  <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="kpi-card"><div class="kpi-value" style="font-size:20px;">${d.agriculture.carbon.stock}</div><div class="kpi-label">Current Stock</div></div>
    <div class="kpi-card"><div class="kpi-value" style="font-size:20px;">${d.agriculture.carbon.annual}</div><div class="kpi-label">Annual Sequestration</div></div>
    <div class="kpi-card"><div class="kpi-value" style="font-size:20px;">${d.agriculture.carbon.credit_value}</div><div class="kpi-label">Credit Value</div></div>
  </div>
</div>

<!-- SECTION 8: RISK ASSESSMENT -->
<div class="report-page">
  <div class="section-number">Section 08</div>
  <div class="section-title">Risk Assessment</div>
  <div class="section-subtitle">Threat analysis and mitigation strategies</div>

  <h3>8.1 Risk Matrix</h3>
  <table class="data-table">
    <thead><tr><th>Risk</th><th>Probability</th><th>Impact</th><th>Level</th></tr></thead>
    <tbody>
      ${d.risk_matrix.map(r => {
        const cls = r.level === 'HIGH' ? 'high-risk' : r.level === 'MODERATE' ? 'mod-risk' : 'low-risk';
        return `<tr><td class="label">${r.risk}</td><td>${r.probability}</td><td>${r.impact}</td><td><span class="risk-tag ${r.level === 'HIGH' ? 'high' : r.level === 'MODERATE' ? 'moderate' : 'low'}" style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${r.level}</span></td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h3>8.2 Wildfire History</h3>
  <div class="map-placeholder">Chart: 25-year wildfire history for region</div>

  <h3>8.3 Mitigation Recommendations</h3>
  <ul class="checklist">
    ${d.mitigations.map(m => `<li><span class="check-box"></span>${m}</li>`).join('')}
  </ul>
</div>

<!-- SECTION 9: MAP PORTFOLIO -->
<div class="report-page">
  <div class="section-number">Section 09</div>
  <div class="section-title">Map Portfolio</div>
  <div class="section-subtitle">8 essential geospatial layers</div>

  <div class="map-grid">
    ${d.maps.map((m, i) => `<div class="map-item"><div class="map-placeholder">${i + 1}. ${m}</div><div class="map-label">${m}</div></div>`).join('')}
  </div>
</div>

<!-- SECTION 10: MARKET CONTEXT -->
<div class="report-page">
  <div class="section-number">Section 10</div>
  <div class="section-title">Market Context & Comparables</div>
  <div class="section-subtitle">Valuation benchmarks and scenarios</div>

  <h3>10.1 Regional Benchmarks (\u20ac/ha)</h3>
  ${d.valuation.benchmarks.map(b => `<div class="bar-row"><div class="bar-label">${b.label}</div><div class="bar-track"><div class="bar-fill ${b.label === 'Your Property' ? 'green' : 'terra'}" style="width:${(b.value / maxBench * 100).toFixed(0)}%">\u20ac${b.value.toLocaleString()}</div></div></div>`).join('')}

  <h3>10.2 Valuation Scenarios</h3>
  <table class="data-table">
    <thead><tr><th>Scenario</th><th>Total Value</th><th>\u20ac/ha</th><th>Basis</th></tr></thead>
    <tbody>
      ${d.valuation.scenarios.map(v => `<tr><td class="label">${v.scenario}</td><td class="value">\u20ac${v.total.toLocaleString()}</td><td>\u20ac${v.per_ha.toLocaleString()}</td><td>${v.basis}</td></tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- SECTION 11: NEXT STEPS -->
<div class="report-page">
  <div class="section-number">Section 11</div>
  <div class="section-title">Next Steps & Recommendations</div>
  <div class="section-subtitle">Prioritized action plan</div>

  <h3>Immediate Actions (0\u20136 months)</h3>
  <ul class="checklist">${d.next_steps.immediate.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Short-term (6\u201318 months)</h3>
  <ul class="checklist">${d.next_steps.short_term.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>

  <h3>Long-term (2\u20135 years)</h3>
  <ul class="checklist">${d.next_steps.long_term.map(s => `<li><span class="check-box"></span>${s}</li>`).join('')}</ul>
</div>

<!-- SECTION 12: METHODOLOGY & SOURCES -->
<div class="report-page">
  <div class="section-number">Section 12</div>
  <div class="section-title">Methodology & Sources</div>
  <div class="section-subtitle">Data transparency and limitations</div>

  <h3>12.1 Data Sources</h3>
  <table class="data-table">
    <thead><tr><th>Category</th><th>Primary Source</th><th>Resolution</th></tr></thead>
    <tbody>
      ${d.sources.map(s => `<tr><td class="label">${s.category}</td><td class="value">${s.source}</td><td>${s.resolution}</td></tr>`).join('')}
    </tbody>
  </table>

  <h3>12.2 Methodology Notes</h3>
  <div style="font-size:13px;color:var(--text-muted);line-height:1.8;">
    <div style="margin:4px 0;">${['SEEA EA framework compliance', 'Benefit transfer valuation methods', 'Conservative estimation principles', 'Uncertainty flags where data is limited'].map(n => `<span class="source-tag">${n}</span>`).join(' ')}</div>
  </div>

  <h3>12.3 Disclaimer</h3>
  <div class="disclaimer">
    This report is generated using publicly available data sources and computational models. Values presented are estimates intended for informational purposes only and should not be relied upon as the sole basis for financial, legal, or land management decisions. Property boundaries, valuations, and environmental assessments should be verified by licensed professionals. Data accuracy is subject to the resolution and currency of underlying sources. LandLibrary accepts no liability for decisions made based on this report.
  </div>
</div>
  `;
}

// ── Init ─────────────────────────────────────────────────

const container = document.getElementById('report-container');
const select = document.getElementById('version-select');
const dateEl = document.getElementById('version-date');

let versions = [];

async function loadVersions() {
  try {
    const res = await fetch('/api/reports');
    versions = await res.json();
  } catch {
    versions = [];
  }

  if (versions.length === 0) {
    select.innerHTML = '<option value="">No versions yet</option>';
    container.innerHTML = '<div style="text-align:center;padding:80px 20px;color:#6b7280;font-size:15px;">No report versions found. Generate one via <code>POST /api/reports/generate</code>.</div>';
    return;
  }

  select.innerHTML = versions.map(v =>
    `<option value="${v.id}">${v.version} — ${v.name}</option>`
  ).join('');

  // Show first (most recent) version
  showVersion(versions[0]);
}

function showVersion(v) {
  container.innerHTML = v.html_content;
  dateEl.textContent = new Date(v.created).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

select.addEventListener('change', () => {
  const v = versions.find(v => v.id === select.value);
  if (v) showVersion(v);
});

loadVersions();
