/**
 * Natura 2000 & Protected Areas — EEA / ICNF data
 * WMS services free and public. No API key needed.
 * https://www.eea.europa.eu/data-and-maps/data/natura-14
 */

// EEA Natura 2000 WMS
export const NATURA2000_WMS = 'https://bio.discomap.eea.europa.eu/arcgis/services/Natura2000/Natura2000End2021/MapServer/WMSServer';

export function getNatura2000WmsParams() {
  return {
    layers: '2,4', // SCI and SPA layers
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
}

// Protected areas relevant to Odemira region
export const ODEMIRA_PROTECTED_AREAS = [
  {
    name: 'Parque Natural do Sudoeste Alentejano e Costa Vicentina',
    nameEn: 'Southwest Alentejo and Vicentine Coast Natural Park',
    type: 'Natural Park',
    designation: 'IUCN Category V',
    area: '131.4 km²',
    established: 1995,
    description: 'One of the best-preserved coastal stretches in Europe. Extends along 100km of coastline from Porto Covo to Burgau. Rich in endemic plant species and important for migratory birds.',
    coordinates: [37.5, -8.8],
    relevance: 'Covers the western coastline of Odemira municipality. Strict building and land use regulations apply within park boundaries.',
  },
  {
    name: 'Costa Sudoeste',
    nameEn: 'Southwest Coast',
    type: 'Natura 2000 SCI',
    designation: 'Sites of Community Importance',
    siteCode: 'PTCON0012',
    description: 'Designated for its habitats directive species and habitat types. Includes coastal cliffs, sand dunes, temporary Mediterranean ponds, and maquis shrubland.',
    coordinates: [37.55, -8.82],
  },
  {
    name: 'Costa Sudoeste',
    nameEn: 'Southwest Coast SPA',
    type: 'Natura 2000 SPA',
    designation: 'Special Protection Area (Birds Directive)',
    siteCode: 'PTZPE0015',
    description: 'Important bird area. Breeding site for white stork, Bonelli\'s eagle, peregrine falcon, and many coastal seabirds. Key stopover for migratory species.',
    coordinates: [37.55, -8.82],
  },
  {
    name: 'Ribeira do Torgal',
    nameEn: 'Torgal Stream',
    type: 'Natura 2000 SCI',
    siteCode: 'PTCON0065',
    description: 'Important freshwater habitat. Home to endemic fish species and otter populations.',
    coordinates: [37.55, -8.65],
  },
];

// Conservation status categories
export const CONSERVATION_STATUS = {
  CR: { label: 'Critically Endangered', color: '#CC3333' },
  EN: { label: 'Endangered', color: '#CC6633' },
  VU: { label: 'Vulnerable', color: '#CC9900' },
  NT: { label: 'Near Threatened', color: '#99CC00' },
  LC: { label: 'Least Concern', color: '#006600' },
  DD: { label: 'Data Deficient', color: '#999999' },
  NE: { label: 'Not Evaluated', color: '#CCCCCC' },
};

// Key species in the Odemira / Vicentine Coast region
export const KEY_SPECIES = [
  { name: 'White Stork', scientific: 'Ciconia ciconia', group: 'Birds', status: 'LC', notes: 'Nests on sea cliffs — unusual globally. The Vicentine Coast has the only known cliff-nesting white stork population.' },
  { name: 'Iberian Lynx', scientific: 'Lynx pardinus', group: 'Mammals', status: 'EN', notes: 'Recovering species. Occasionally sighted in the Odemira hinterland near Monchique.' },
  { name: 'Eurasian Otter', scientific: 'Lutra lutra', group: 'Mammals', status: 'NT', notes: 'Present in Rio Mira and tributary streams. Indicator of water quality.' },
  { name: 'Bonelli\'s Eagle', scientific: 'Aquila fasciata', group: 'Birds', status: 'LC', notes: 'Breeds in the inland areas. Sensitive to habitat disturbance.' },
  { name: 'Iberian Midwife Toad', scientific: 'Alytes cisternasii', group: 'Amphibians', status: 'LC', notes: 'Iberian endemic. Found in temporary ponds and streams.' },
  { name: 'Mediterranean Chameleon', scientific: 'Chamaeleo chamaeleon', group: 'Reptiles', status: 'LC', notes: 'Found in coastal scrub and pine forests. Increasingly rare due to habitat loss.' },
  { name: 'Cistus ladanifer', scientific: 'Cistus ladanifer', group: 'Plants', status: 'LC', notes: 'Dominant shrub in Mediterranean scrubland (maquis). Produces aromatic resin (labdanum).' },
  { name: 'Cork Oak', scientific: 'Quercus suber', group: 'Plants', status: 'LC', notes: 'Keystone species of the montado ecosystem. Economically important for cork production.' },
  { name: 'Portuguese Sundew', scientific: 'Drosera intermedia', group: 'Plants', status: 'LC', notes: 'Carnivorous plant found in wet heathlands. Indicator of pristine boggy habitats.' },
];

// Zoning designations in Portuguese planning system
export const PT_ZONING = {
  REN: {
    name: 'Reserva Ecológica Nacional',
    nameEn: 'National Ecological Reserve',
    description: 'Areas restricted from development to protect ecological systems, prevent risks, and maintain biodiversity. Includes flood zones, steep slopes, coastal areas, and riparian corridors.',
  },
  RAN: {
    name: 'Reserva Agrícola Nacional',
    nameEn: 'National Agricultural Reserve',
    description: 'Protected agricultural land with restrictions on non-agricultural use. Aims to preserve the most productive soils for farming.',
  },
  PDM: {
    name: 'Plano Director Municipal',
    nameEn: 'Municipal Master Plan',
    description: 'The main municipal spatial planning instrument. Defines land use categories, building rules, and development parameters for the entire municipality.',
  },
  NATURA2000: {
    name: 'Rede Natura 2000',
    nameEn: 'Natura 2000 Network',
    description: 'EU-wide network of nature protection areas. Comprises Special Areas of Conservation (SAC) and Special Protection Areas (SPA).',
  },
};
