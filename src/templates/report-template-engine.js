/**
 * LandBook Report — Handlebars Template Engine
 * Compiles report.hbs, registers partials and helpers, renders HTML.
 */

import Handlebars from 'handlebars';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { wrapFullPage } from './report-design-system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache compiled template
let compiledTemplate = null;

function getTemplate() {
  if (compiledTemplate) return compiledTemplate;

  // Register partials
  const partialsDir = join(__dirname, 'partials');
  for (const file of readdirSync(partialsDir)) {
    if (!file.endsWith('.hbs')) continue;
    const name = file.replace('.hbs', '');
    const source = readFileSync(join(partialsDir, file), 'utf8');
    Handlebars.registerPartial(name, source);
  }

  // Register helpers
  registerHelpers();

  // Compile main template
  const templateSource = readFileSync(join(__dirname, 'report.hbs'), 'utf8');
  compiledTemplate = Handlebars.compile(templateSource);
  return compiledTemplate;
}

function registerHelpers() {
  // Format a value — returns dash with tooltip if missing
  Handlebars.registerHelper('fmt', function (value, ...args) {
    const options = args.pop(); // last arg is always Handlebars options
    const format = typeof args[0] === 'string' ? args[0] : null;

    if (value == null || (typeof value === 'number' && isNaN(value))) {
      return new Handlebars.SafeString(
        '<span class="text-secondary italic cursor-help" title="Data unavailable">\u2014</span>'
      );
    }

    let formatted;
    switch (format) {
      case 'currency':
        formatted = '\u20ac' + Number(value).toLocaleString();
        break;
      case 'int':
        formatted = Math.round(Number(value)).toLocaleString();
        break;
      case 'decimal1':
        formatted = Number(value).toFixed(1);
        break;
      case 'decimal2':
        formatted = Number(value).toFixed(2);
        break;
      case 'decimal4':
        formatted = Number(value).toFixed(4);
        break;
      case 'percent':
        formatted = value + '%';
        break;
      case 'score5':
        formatted = value + '/5';
        break;
      case 'score10':
        formatted = value + '/10';
        break;
      case 'score100':
        formatted = value + '/100';
        break;
      default:
        formatted = String(value);
    }
    return Handlebars.Utils.escapeExpression(formatted);
  });

  // Risk badge helper
  Handlebars.registerHelper('riskBadge', function (level) {
    if (!level) return '';
    const l = String(level).toLowerCase();
    let cls;
    if (l === 'low' || l === 'very low') cls = 'bg-brand-forest/20 text-brand-forest';
    else if (l === 'moderate') cls = 'bg-brand-amber/20 text-brand-amber';
    else cls = 'bg-brand-terracotta/20 text-brand-terracotta';
    return new Handlebars.SafeString(
      `<span class="px-2 py-1 ${cls} text-[10px] font-bold">${Handlebars.Utils.escapeExpression(String(level).toUpperCase())}</span>`
    );
  });

  // Warning badge
  Handlebars.registerHelper('warningBadge', function (text) {
    if (!text) return '';
    return new Handlebars.SafeString(
      `<span class="px-2 py-1 bg-brand-amber/20 text-brand-amber text-[10px] font-bold">${Handlebars.Utils.escapeExpression(String(text).toUpperCase())}</span>`
    );
  });

  // Month/year string
  Handlebars.registerHelper('monthYear', function () {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });

  // Equality check
  Handlebars.registerHelper('ifEq', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // Greater than
  Handlebars.registerHelper('ifGt', function (a, b, options) {
    return a > b ? options.fn(this) : options.inverse(this);
  });

  // Less than
  Handlebars.registerHelper('ifLt', function (a, b, options) {
    return a < b ? options.fn(this) : options.inverse(this);
  });

  // Math: abs
  Handlebars.registerHelper('abs', function (v) {
    return Math.abs(v);
  });

  // Sign prefix
  Handlebars.registerHelper('signPrefix', function (v) {
    return v > 0 ? '+' : '';
  });

  // Not last item in array
  Handlebars.registerHelper('unlessLast', function (index, array, options) {
    return index < array.length - 1 ? options.fn(this) : options.inverse(this);
  });

  // Locale number formatting
  Handlebars.registerHelper('localeNumber', function (v) {
    if (v == null) return '\u2014';
    return Number(v).toLocaleString();
  });
}

/**
 * Render a report from prepared template data.
 * @param {object} templateData - Output of prepareTemplateData()
 * @returns {string} Complete self-contained HTML document
 */
export function renderReport(templateData) {
  const template = getTemplate();
  const sectionsHtml = template(templateData);

  const title = `LandBook \u2014 ${templateData.cover?.name || 'Report'}`;
  const version = templateData.meta?.version || 'v1';

  return wrapFullPage(sectionsHtml, { title, version });
}

/**
 * Clear cached template (useful for development hot-reload).
 */
export function clearTemplateCache() {
  compiledTemplate = null;
}
