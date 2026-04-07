/**
 * LandBook Report — Design System
 * Tailwind CSS-based design tokens, minimal custom CSS, and page shell.
 * Matches the Quintas reference editorial style.
 */

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------

export const TOKENS = {
  primary:              '#012d1d',
  primaryContainer:     '#1b4332',
  onPrimary:            '#ffffff',
  onPrimaryContainer:   '#86af99',
  secondary:            '#585f6c',
  onSurface:            '#151c27',
  onSurfaceVariant:     '#414844',
  outline:              '#717973',
  outlineVariant:       '#c1c8c2',
  surface:              '#FAFAF9',
  editorialTerracotta:  '#E07A5F',
  editorialCharcoal:    '#374151',
  onTertiaryContainer:  '#75b393',
  tertiaryContainer:    '#00452e',
  white:                '#FFFFFF',

  // Typography
  serifFont:  "'Libre Baskerville', serif",
  sansFont:   "'Inter', sans-serif",

  // Page
  pageWidth:   '210mm',
  pageHeight:  '297mm',
};

// ---------------------------------------------------------------------------
// Tailwind Config (JS object as string for inline <script>)
// ---------------------------------------------------------------------------

export const TAILWIND_CONFIG = `{
  theme: {
    extend: {
      colors: {
        'primary':                '#012d1d',
        'primary-container':      '#1b4332',
        'on-primary':             '#ffffff',
        'on-primary-container':   '#86af99',
        'secondary':              '#585f6c',
        'on-surface':             '#151c27',
        'on-surface-variant':     '#414844',
        'outline':                '#717973',
        'outline-variant':        '#c1c8c2',
        'surface':                '#FAFAF9',
        'editorial-terracotta':   '#E07A5F',
        'editorial-charcoal':     '#374151',
        'on-tertiary-container':  '#75b393',
        'tertiary-container':     '#00452e',
      },
      borderRadius: {
        DEFAULT: '0px',
        lg: '0px',
        xl: '0px',
        full: '9999px',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body:     ['Inter', 'sans-serif'],
        label:    ['Inter', 'sans-serif'],
        serif:    ['Libre Baskerville', 'serif'],
      },
    },
  },
}`;

// ---------------------------------------------------------------------------
// Minimal Custom CSS (only what Tailwind can't do)
// ---------------------------------------------------------------------------

export const REPORT_CSS = `
body {
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
}
.drop-cap::first-letter {
  float: left;
  font-family: 'Libre Baskerville', serif;
  font-size: 52pt;
  line-height: 0.8;
  padding-right: 12px;
  padding-top: 4px;
  color: #012d1d;
}
.hairline-b {
  border-bottom: 0.5pt solid #c1c8c2;
}
.hairline-r {
  border-right: 0.5pt solid #c1c8c2;
}
.a4-container {
  width: 210mm;
  min-height: 297mm;
  margin: auto;
  background: #FAFAF9;
  padding: 24mm 20mm;
  position: relative;
}
@media print {
  body { background: white; }
  .no-print { display: none; }
}
.gauge-svg {
  transform: rotate(-90deg);
}
`;

// ---------------------------------------------------------------------------
// Full Page Shell
// ---------------------------------------------------------------------------

/**
 * Wraps report section HTML in a complete HTML document with Tailwind CDN.
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
<link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
tailwind.config = ${TAILWIND_CONFIG}
</script>
<style>
${REPORT_CSS}
</style>
<meta name="generator" content="LandBook ${version}">
</head>
<body class="bg-surface text-on-surface antialiased">
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
 * Format a value using the schema, or return a dash with tooltip if missing.
 * @param {*} value - The raw value
 * @param {function} [formatter] - Format function (e.g. v => v.toFixed(1))
 * @param {string} [source] - Source description for tooltip
 * @param {string} [reason] - Reason for missing data
 */
export function fmt(value, formatter, source, reason) {
  if (value == null || (typeof value === 'number' && isNaN(value))) {
    const tooltip = source ? `Source: ${source}${reason ? ' | Status: ' + reason : ' | Status: unavailable'}` : '';
    return `<span class="text-secondary italic cursor-help" title="${escHtml(tooltip)}">\u2014</span>`;
  }
  if (formatter) return escHtml(String(formatter(value)));
  return escHtml(String(value));
}
