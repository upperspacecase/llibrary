/**
 * LandBook Report — Template Orchestrator
 * Assembles the full self-contained HTML report from reportData.
 *
 * Set USE_HANDLEBARS=true (env) to use the new Handlebars template path.
 * Default: true (Handlebars). Set to "false" to fall back to JS renderers.
 */

import { wrapFullPage } from './report-design-system.js';
import renderAllSections from './report-sections.js';
import { renderReport } from './report-template-engine.js';
import { prepareTemplateData } from '../lib/report-template-data.js';

const USE_HANDLEBARS = (process.env.USE_HANDLEBARS ?? 'true') !== 'false';

/**
 * Build a complete LandBook report.
 * @param {object} reportData - Canonical data shape from report-data-pipeline.js
 * @returns {string} Self-contained HTML document
 */
export function buildReport(reportData) {
  if (USE_HANDLEBARS) {
    const templateData = prepareTemplateData(reportData);
    return renderReport(templateData);
  }

  // Legacy JS renderer path
  const property = reportData.property || {};
  const meta = reportData.meta || {};

  const title = `LandBook \u2014 ${property.name || 'Report'}`;
  const version = meta.version || 'v1';

  const sectionsHtml = renderAllSections(reportData);

  return wrapFullPage(sectionsHtml, { title, version });
}
