/**
 * LandBook Report — Design System
 * Single source of truth for editorial CSS, design tokens, and page shell.
 * Fully self-contained: no Tailwind CDN, no external CSS.
 * Only external deps: Google Fonts (Libre Baskerville, Inter, Material Symbols).
 */

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------

export const TOKENS = {
  // Colors
  primary:            '#012d1d',
  primaryContainer:   '#1B4332',
  terracotta:         '#E07A5F',
  surface:            '#FAFAF9',
  outlineVariant:     '#c1c8c2',
  onSurface:          '#151c27',
  charcoal:           '#374151',
  secondary:          '#585f6c',
  outline:            '#717973',
  sage:               '#8FBC8F',
  sand:               '#D4A574',
  white:              '#FFFFFF',
  badgeSuccess:       '#8FBC8F',
  badgeWarning:       '#D4A574',
  badgeDanger:        '#E07A5F',
  lightGray:          '#D1D5DB',

  // Typography
  serifFont:   "'Libre Baskerville', Georgia, serif",
  sansFont:    "'Inter', sans-serif",

  // Page
  pageWidth:   '210mm',
  pageHeight:  '297mm',
  pagePadding: '24mm',
};

// ---------------------------------------------------------------------------
// Complete CSS — self-contained, no Tailwind
// ---------------------------------------------------------------------------

export const REPORT_CSS = `
/* Reset */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

/* Base */
body {
  font-family: ${TOKENS.sansFont};
  font-size: 11pt;
  line-height: 1.6;
  color: ${TOKENS.charcoal};
  background: #e5e2db;
  -webkit-font-smoothing: antialiased;
  text-align: justify;
  text-align-last: left;
}

/* Page Setup */
@page {
  size: A4;
  margin: 20mm;
  @top-center { content: string(doctitle); font-size: 9pt; color: ${TOKENS.secondary}; }
  @bottom-center { content: counter(page); font-size: 9pt; color: ${TOKENS.secondary}; }
}
@page :first { margin: 0; @top-center { content: none; } @bottom-center { content: none; } }
@page cover { @top-center { content: none; } @bottom-center { content: none; } }
body { string-set: doctitle ""; }
h1.section-title { string-set: doctitle content(); }

/* A4 Container */
.a4 {
  width: ${TOKENS.pageWidth};
  min-height: ${TOKENS.pageHeight};
  margin: auto;
  background: ${TOKENS.surface};
  padding: ${TOKENS.pagePadding};
  position: relative;
  page-break-after: always;
}

/* Print */
@media print {
  body { background: white; }
  .a4 { box-shadow: none; margin: 0; }
  .no-print { display: none; }
}
@media screen {
  .a4 { box-shadow: 0 1px 8px rgba(0,0,0,0.08); margin-top: 24px; margin-bottom: 24px; }
}

/* ── Typography ── */

h1.section-title {
  font-family: ${TOKENS.serifFont};
  font-size: 32pt;
  font-style: italic;
  font-weight: 400;
  color: ${TOKENS.primary};
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 0.5pt solid ${TOKENS.primary};
}

h1.section-title-large {
  font-family: ${TOKENS.serifFont};
  font-size: 48pt;
  font-style: italic;
  font-weight: 400;
  color: ${TOKENS.primary};
  margin-bottom: 8mm;
  padding-bottom: 4mm;
  border-bottom: 0.5pt solid ${TOKENS.primary};
}

h2.subsection-title {
  font-family: ${TOKENS.sansFont};
  font-size: 14pt;
  font-weight: 600;
  color: ${TOKENS.primary};
  margin-top: 8mm;
  margin-bottom: 4mm;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.micro-label {
  font-family: ${TOKENS.sansFont};
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: ${TOKENS.outline};
}

.serif { font-family: ${TOKENS.serifFont}; }
.sans { font-family: ${TOKENS.sansFont}; }

/* ── Drop Cap ── */

.drop-cap::first-letter {
  font-family: ${TOKENS.serifFont};
  font-size: 48pt;
  float: left;
  line-height: 0.8;
  padding-right: 3mm;
  padding-top: 2mm;
  color: ${TOKENS.primary};
}

/* ─��� Pull Quote ── */

.pull-quote {
  border-left: 3pt solid ${TOKENS.terracotta};
  padding-left: 5mm;
  margin: 8mm 0;
  font-family: ${TOKENS.serifFont};
  font-size: 13pt;
  font-style: italic;
  color: ${TOKENS.charcoal};
  line-height: 1.5;
}

/* ── Two Column ── */

.two-column {
  column-count: 2;
  column-gap: 10mm;
}
.two-column p {
  margin-bottom: 4mm;
}

/* ── Metrics Row ── */

.metrics-row {
  display: flex;
  justify-content: space-between;
  margin: 8mm 0;
  padding: 5mm 0;
  border-top: 0.5pt solid ${TOKENS.lightGray};
  border-bottom: 0.5pt solid ${TOKENS.lightGray};
}

.metric {
  text-align: center;
  flex: 1;
  border-right: 0.5pt solid ${TOKENS.lightGray};
}
.metric:last-child { border-right: none; }

.metric-value {
  font-family: ${TOKENS.sansFont};
  font-size: 20pt;
  font-weight: 600;
  color: ${TOKENS.primary};
  display: block;
}
.metric-label {
  font-family: ${TOKENS.sansFont};
  font-size: 8pt;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${TOKENS.charcoal};
  margin-top: 2mm;
}

/* ── Big Number ── */

.big-number { text-align: center; margin: 10mm 0; }
.big-number-value {
  font-family: ${TOKENS.sansFont};
  font-size: 48pt;
  font-weight: 600;
  color: ${TOKENS.primary};
  display: block;
}
.big-number-label {
  font-family: ${TOKENS.sansFont};
  font-size: 10pt;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: ${TOKENS.charcoal};
  margin-bottom: 3mm;
}
.big-number-note {
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  font-style: italic;
  color: ${TOKENS.secondary};
}

/* ── Tables ── */

table {
  width: 100%;
  border-collapse: collapse;
  margin: 6mm 0;
  font-size: 10pt;
  page-break-inside: avoid;
}
thead { display: table-header-group; }
th {
  border-top: 2pt solid ${TOKENS.primary};
  border-bottom: 1pt solid ${TOKENS.primary};
  padding: 3mm 2mm;
  text-align: left;
  font-weight: 600;
  color: ${TOKENS.primary};
  text-transform: uppercase;
  font-size: 9pt;
  letter-spacing: 0.03em;
}
td {
  padding: 3mm 2mm;
  border-bottom: 0.5pt solid ${TOKENS.lightGray};
  vertical-align: top;
}
tr:last-child td {
  border-bottom: 2pt solid ${TOKENS.primary};
}

/* ── Badges ── */

.badge {
  display: inline-block;
  padding: 1mm 3mm;
  font-size: 8pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-radius: 2pt;
}
.badge-success { background: ${TOKENS.badgeSuccess}; color: white; }
.badge-warning { background: ${TOKENS.badgeWarning}; color: white; }
.badge-danger  { background: ${TOKENS.badgeDanger}; color: white; }

/* ── Charts ── */

.chart-container {
  margin: 8mm 0;
  text-align: center;
  page-break-inside: avoid;
}
.chart-container svg { max-width: 100%; height: auto; }
.chart-caption {
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  font-style: italic;
  color: ${TOKENS.secondary};
  margin-top: 3mm;
}

/* ── Photo Grid ── */

.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5mm;
  margin: 8mm 0;
}
.photo-grid img {
  width: 100%;
  height: 45mm;
  object-fit: cover;
}
.photo-caption {
  font-size: 8pt;
  font-style: italic;
  color: ${TOKENS.secondary};
  margin-top: 2mm;
}

/* ── Map Pages ── */

.map-page {
  page-break-before: always;
  height: 257mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.map-page img {
  max-width: 100%;
  max-height: 230mm;
  object-fit: contain;
}
.map-title {
  font-family: ${TOKENS.serifFont};
  font-size: 18pt;
  font-style: italic;
  color: ${TOKENS.primary};
  margin-bottom: 5mm;
}

/* ── Cover ── */

.cover {
  width: ${TOKENS.pageWidth};
  height: ${TOKENS.pageHeight};
  margin: 0 auto;
  position: relative;
  overflow: hidden;
  page: cover;
  page-break-after: always;
  padding: 0;
  background: ${TOKENS.primaryContainer};
}
.cover-bg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 0;
}
.cover-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.5) 100%);
  z-index: 1;
}
.cover-wordmark {
  position: absolute;
  top: 15mm;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  text-align: center;
  color: white;
}
.cover-wordmark h1 {
  font-family: ${TOKENS.sansFont};
  font-size: 10pt;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: 5mm;
}
.cover-wordmark p {
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  font-weight: 300;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.9;
}
.cover-coordinates {
  position: absolute;
  top: 15mm;
  right: 20mm;
  z-index: 2;
  color: white;
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  opacity: 0.9;
}
.cover-content {
  position: absolute;
  bottom: 60mm;
  left: 20mm;
  z-index: 2;
  color: white;
}
.cover-property-name {
  font-family: ${TOKENS.serifFont};
  font-size: 48pt;
  font-style: italic;
  font-weight: 400;
  margin-bottom: 5mm;
  text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
}
.cover-location {
  font-family: ${TOKENS.sansFont};
  font-size: 14pt;
  font-weight: 300;
  margin-bottom: 10mm;
  opacity: 0.95;
}
.cover-meta {
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  opacity: 0.8;
}
.cover-meta span { margin-right: 15mm; }
.cover-date {
  position: absolute;
  bottom: 15mm;
  right: 20mm;
  z-index: 2;
  color: white;
  font-family: ${TOKENS.sansFont};
  font-size: 9pt;
  opacity: 0.8;
}

/* ── Timeline ── */

.timeline {
  margin: 6mm 0;
  padding-left: 0;
  list-style: none;
}
.timeline li {
  position: relative;
  padding-left: 20mm;
  margin-bottom: 4mm;
}
.timeline li::before {
  content: attr(data-year);
  position: absolute;
  left: 0;
  font-weight: 600;
  color: ${TOKENS.primary};
}

/* ── Lists ── */

ul, ol { margin: 4mm 0; padding-left: 6mm; }
li { margin-bottom: 2mm; }

/* ── Utilities ── */

.text-center { text-align: center; }
.text-right { text-align: right; }
.text-muted { color: ${TOKENS.secondary}; }
.text-primary { color: ${TOKENS.primary}; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.italic { font-style: italic; }
.mt-4 { margin-top: 4mm; }
.mt-8 { margin-top: 8mm; }
.mb-4 { margin-bottom: 4mm; }
.mb-8 { margin-bottom: 8mm; }
.hairline { border-bottom: 0.5pt solid ${TOKENS.outlineVariant}; }
.no-break { page-break-inside: avoid; }
.page-break { page-break-after: always; }

/* ── Overflow protection ���─ */

pre, table, figure, img, svg, blockquote { max-width: 100%; box-sizing: border-box; }
a { word-break: break-all; color: ${TOKENS.primary}; text-decoration: none; }

/* ── Material Symbols ── */

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
}

/* ─�� Missing Data ── */

.data-missing {
  color: ${TOKENS.secondary};
  font-style: italic;
  cursor: help;
}
`;

// ---------------------------------------------------------------------------
// Full Page Shell
// ---------------------------------------------------------------------------

/**
 * Wraps report section HTML in a complete, self-contained HTML document.
 * @param {string} innerHtml - The rendered section HTML
 * @param {object} opts
 * @param {string} opts.title - Document title
 * @param {string} opts.version - Report version string
 */
export function wrapFullPage(innerHtml, { title = 'LandBook Report', version = 'v1' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<link rel="icon" type="image/jpeg" href="https://llibrary-eight.vercel.app/favicon1.jpg">
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<style>
${REPORT_CSS}
</style>
<meta name="generator" content="LandBook ${version}">
</head>
<body>
${innerHtml}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape HTML entities */
export function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a value using the schema, or return '—' with tooltip if missing.
 * @param {*} value - The raw value
 * @param {function} [formatter] - Format function (e.g. v => v.toFixed(1))
 * @param {string} [source] - Source description for tooltip
 * @param {string} [reason] - Reason for missing data
 */
export function fmt(value, formatter, source, reason) {
  if (value == null || (typeof value === 'number' && isNaN(value))) {
    const tooltip = source ? `Source: ${source}${reason ? ' | Status: ' + reason : ' | Status: unavailable'}` : '';
    return `<span class="data-missing" title="${escHtml(tooltip)}">\u2014</span>`;
  }
  if (formatter) return escHtml(String(formatter(value)));
  return escHtml(String(value));
}
