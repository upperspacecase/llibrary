/**
 * Bacia do Lima — region #2, DRAFT.
 *
 * Metadata only, and no content authored yet.
 *
 * A basin is not an administrative unit: it has no council, no resident
 * population and no master plan of its own. D1 (decided 2026-08-04) keeps the
 * same ten sections as Odemira and re-sources three of them — overview leads
 * with basin facts instead of population and parishes, community is framed as
 * the municipalities in the basin, and governance covers river-basin
 * management rather than one council. See REGION_PIPELINE_PLAN.md §4.
 *
 * `status: 'draft'` keeps this out of getLiveRegions(), so nothing surfaces it
 * until the flag is flipped.
 */

export const meta = {
  slug: 'bacia-do-lima',
  // 'preview' = listed and reachable, content still being written. It carries
  // the same card badge as a live region by design decision (2026-08-04).
  status: 'preview',
  featured: true,
  name: 'Bacia do Lima',
  subtitle: 'Alto Minho, Portugal',
  country: 'PT',
  kind: 'basin',

  // TODO: needs its own artwork — reusing the water illustration for now.
  image: '/wiki/water.png',
  // A basin has no resident population of its own, so the second stat counts
  // municipalities instead of people. See D1.
  cardStats: [
    { value: '~1,180', unit: 'km²' },
    { value: '10', unit: 'municipalities' },
  ],

  // Synthetic region landbook, created 2026-08-04 from Carolina's boundary and
  // piped the same day (42/45 sources, 13 narratives).
  landbookId: 'region-bacia-do-lima',

  center: [41.86340, -8.37220],
  bbox: { swLat: 41.6798, swLng: -8.8288, neLat: 42.0797, neLng: -8.0871 },

  // Refóios do Lima — valley floor at 39 m, in the agricultural middle of the
  // basin. The polygon centroid was rejected: it lands at 306 m on high ground,
  // which would have sampled soil and geology off the uplands rather than the
  // farmed valley. Mirrors Odemira's "sampled at São Teotónio agri" choice.
  samplePoint: [41.7830, -8.5450],

  areaKm2: 1180.1,

  // No namesake municipality — the outline crosses ten of them, so station
  // labels always carry "parish · municipality".
  homeMunicipality: null,

  // SNIRH / IPMA / DGT all stop at the border, and the Lima rises in Galicia
  // as the Limia. Scope for v1 is the Portuguese basin only — see D2.
  dataSources: ['snirh', 'ipma', 'dgt', 'corine'],
  coverageNote: 'Portuguese basin only; Galician headwaters are out of scope for v1.',

  // Municipalities the outline crosses, from reverse-geocoding all 27 boundary
  // vertices plus the centroid (Nominatim, 2026-08-04). A basin is not an
  // administrative unit — this list is what stands in for "the region" in any
  // section that needs governance, population or community facts.
  municipalities: [
    'Melgaço', 'Arcos de Valdevez', 'Ponte da Barca', 'Vila Verde',
    'Ponte de Lima', 'Viana do Castelo', 'Paredes de Coura',
    'Terras de Bouro', 'Caminha', 'Monção',
  ],
  // 4 of 28 sample points landed in Galicia (Lobios, Lobeira, Entrimo), so the
  // outline does cross the border even though v1 scopes data to Portugal.
  municipalitiesES: ['Lobios', 'Lobeira', 'Entrimo'],

  // Provenance: submitted through the public form, not drawn in-house.
  source: {
    collection: 'submissions',
    id: 'c022402f-ce57-4d37-b85e-2cd0d2892586',
    title: 'Bacia do Lima (rough outline)',
    submittedBy: 'Carolina Carvalho',
    submittedAt: '2026-06-06T17:28:21.159Z',
    // D3 decided 2026-08-04: ship Carolina's outline as-is. Labelled a "rough
    // outline" by her, so area figures should be presented as approximate.
    boundaryIsProvisional: false,
    boundaryDecision: 'Use the submitted outline. Area is approximate; do not quote it to a decimal.',
  },
};
