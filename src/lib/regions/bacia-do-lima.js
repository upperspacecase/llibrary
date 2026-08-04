/**
 * Bacia do Lima — region #2, DRAFT.
 *
 * Metadata only. There is no content yet: the section model for a river basin
 * is still an open question (a basin has no parishes, no resident population
 * and no PDM of its own — it spans Viana do Castelo, Ponte de Lima, Arcos de
 * Valdevez and others). See REGION_PIPELINE_PLAN.md §4, decision D1.
 *
 * `status: 'draft'` keeps this out of getLiveRegions(), so nothing surfaces it
 * until the flag is flipped.
 */

// No content authored yet — the wiki renders nothing for a draft region.
export const SECTIONS = {};
export const EVENTS_CALENDAR = [];
export const LANDMARKS = [];

export const REGION = {
  name: 'Bacia do Lima',
  subtitle: 'Alto Minho, Portugal',
  country: 'Portugal',
  region: 'Alto Minho',
  center: [41.86340, -8.37220],
  bbox: [41.6798, -8.8288, 42.0797, -8.0871], // [south, west, north, east]
  area: 1180.1, // km²
};

export const meta = {
  slug: 'bacia-do-lima',
  status: 'draft',
  name: 'Bacia do Lima',
  subtitle: 'Alto Minho, Portugal',
  country: 'PT',
  kind: 'basin',

  // Synthetic region landbook — NOT created yet. Nothing writes to this id
  // until the boundary decision (D3) is settled and the pipeline is run.
  landbookId: 'region-bacia-do-lima',

  center: [41.86340, -8.37220],
  bbox: { swLat: 41.6798, swLng: -8.8288, neLat: 42.0797, neLng: -8.0871 },

  // Not chosen yet. Odemira uses an agricultural point rather than the
  // centroid; the equivalent call for the basin is still open.
  samplePoint: null,

  areaKm2: 1180.1,

  // SNIRH / IPMA / DGT all stop at the border, and the Lima rises in Galicia
  // as the Limia. Scope for v1 is the Portuguese basin only — see D2.
  dataSources: ['snirh', 'ipma', 'dgt', 'corine'],
  coverageNote: 'Portuguese basin only; Galician headwaters are out of scope for v1.',

  // Provenance: submitted through the public form, not drawn in-house.
  source: {
    collection: 'submissions',
    id: 'c022402f-ce57-4d37-b85e-2cd0d2892586',
    title: 'Bacia do Lima (rough outline)',
    submittedBy: 'Carolina Carvalho',
    submittedAt: '2026-06-06T17:28:21.159Z',
    // The submitter's own label says "rough outline" — D3 decides whether this
    // polygon ships or is replaced with a proper watershed boundary.
    boundaryIsProvisional: true,
  },
};
