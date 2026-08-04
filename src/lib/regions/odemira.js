/**
 * Odemira — region #1.
 *
 * Content still lives in ../wiki-data.js (and its PT counterpart). This module
 * only re-exports it in the shape the registry expects, so nothing about the
 * live Odemira wiki changes while the multi-region plumbing is built out.
 */

export { ODEMIRA as REGION, SECTIONS, EVENTS_CALENDAR, LANDMARKS } from '../wiki-data.js';

export const meta = {
  slug: 'odemira',
  status: 'live',
  name: 'Odemira',
  subtitle: 'Southwest Alentejo, Portugal',
  country: 'PT',
  kind: 'municipality',

  // Synthetic region landbook driving the dashboard — see api/regions/odemira.js.
  landbookId: 'region-odemira',

  center: [37.5967, -8.6400],
  bbox: { swLat: 37.30, swLng: -8.95, neLat: 37.87, neLng: -8.20 },

  // Representative point for the point-based pipeline sources (soil, geology,
  // elevation). Recorded on the landbook doc as "sampled at São Teotónio agri".
  samplePoint: [37.5178, -8.7389],

  areaKm2: 1720.6,

  // National networks that have coverage here. Drives which dashboard panels
  // are expected to hold data.
  dataSources: ['snirh', 'ipma', 'dgt', 'corine'],
};
