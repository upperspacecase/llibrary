/**
 * LandBook Report — Template Orchestrator
 * Assembles the full self-contained HTML report from reportData.
 */

import { wrapFullPage } from './report-design-system.js';
import renderAllSections from './report-sections.js';

/**
 * Build a complete LandBook report.
 * @param {object} reportData - Canonical data shape from report-data-pipeline.js
 * @returns {string} Self-contained HTML document
 */
export function buildReport(reportData) {
  const property = reportData.property || {};
  const meta = reportData.meta || {};

  const title = `LandBook \u2014 ${property.name || 'Report'}`;
  const version = meta.version || 'v1';

  const sectionsHtml = renderAllSections(reportData);

  return wrapFullPage(sectionsHtml, { title, version });
}
