/**
 * Odemira — region #1. Metadata only.
 *
 * Content stays in ../wiki-data.js and is wired up in ./content.js. Keeping
 * the two apart matters: the API functions import this registry, and pulling
 * 78 kB of wiki prose into every serverless cold start would be waste.
 */

export const meta = {
  slug: 'odemira',
  status: 'live',
  featured: true,
  name: 'Odemira',
  subtitle: 'Southwest Alentejo, Portugal',
  country: 'PT',
  kind: 'municipality',

  // "Chat with Land" — backed by this region's Pinecone namespace.
  hasChat: true,

  // Card artwork and the two stats the home/commons cards show.
  image: '/wiki/bioregion.png',
  cardStats: [
    { value: '1,720.6', unit: 'km²' },
    { value: '31,488', unit: 'population' },
  ],

  // Stat tiles on the wiki hub. These were hardcoded into the page, which meant
  // every region claimed Odemira's protected share and coastline.
  hubStats: [
    { value: '1,720.6', label: 'km² area' },
    { value: '44%', label: 'protected' },
    { value: '110 km', label: 'coastline' },
  ],

  // Synthetic region landbook driving the dashboard.
  landbookId: 'region-odemira',

  center: [37.5967, -8.6400],
  bbox: { swLat: 37.30, swLng: -8.95, neLat: 37.87, neLng: -8.20 },

  // Representative point for the point-based pipeline sources (soil, geology,
  // elevation). Recorded on the landbook doc as "sampled at São Teotónio agri".
  samplePoint: [37.5178, -8.7389],

  areaKm2: 1720.6,

  // The municipality the region is named after. Station labels drop the
  // municipality when it matches, so "Luzianes · Odemira" reads "Luzianes".
  // Regions that are not a single municipality set this to null.
  homeMunicipality: 'Odemira',

  // National networks with coverage here — drives which dashboard panels are
  // expected to hold data.
  dataSources: ['snirh', 'ipma', 'dgt', 'corine'],
};
