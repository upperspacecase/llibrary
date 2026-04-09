/**
 * Source Registry
 *
 * Maps every API source key (matching fetchAllData's entries array) to its
 * TTL (seconds before stale) and logical group for batch refresh.
 */

const DAY = 86400;

export const SOURCE_REGISTRY = {
  elevation:        { ttl: 365 * DAY, group: 'terrain',       label: 'Open-Meteo Elevation' },
  forecast:         { ttl: 3600,      group: 'climate',       label: 'Open-Meteo Forecast' },
  climate:          { ttl: 30 * DAY,  group: 'climate',       label: 'Open-Meteo Climate Averages' },
  climateTrends:    { ttl: 90 * DAY,  group: 'trends',        label: 'Open-Meteo 50yr Archive' },
  soilProps:        { ttl: 365 * DAY, group: 'soil',          label: 'SoilGrids Properties' },
  soilClass:        { ttl: 365 * DAY, group: 'soil',          label: 'SoilGrids Classification' },
  geology:          { ttl: 365 * DAY, group: 'geology',       label: 'Macrostrat Geology' },
  species:          { ttl: 7 * DAY,   group: 'biodiversity',  label: 'iNaturalist Species' },
  threatened:       { ttl: 7 * DAY,   group: 'biodiversity',  label: 'iNaturalist Threatened' },
  gbif:             { ttl: 7 * DAY,   group: 'biodiversity',  label: 'GBIF Occurrences' },
  flood:            { ttl: DAY,       group: 'water',          label: 'GloFAS Flood Forecast' },
  water:            { ttl: 30 * DAY,  group: 'water',          label: 'Overpass Water Features' },
  infrastructure:   { ttl: 30 * DAY,  group: 'infrastructure', label: 'Overpass Infrastructure' },
  protectedAreas:   { ttl: 30 * DAY,  group: 'regional',       label: 'Overpass Protected Areas' },
  activeFires:      { ttl: 3600,      group: 'fire',           label: 'NASA FIRMS Active' },
  historicalFires:  { ttl: 7 * DAY,   group: 'fire',           label: 'NASA FIRMS Historical' },
  riskScores:       { ttl: DAY,       group: 'risk',           label: 'Risk Scores (computed)' },
  admin:            { ttl: 365 * DAY, group: 'property',       label: 'DGT Admin Unit' },
  ipmaLocation:     { ttl: 365 * DAY, group: 'climate',        label: 'IPMA Location' },
  terrainProfile:   { ttl: 365 * DAY, group: 'terrain',        label: 'Multi-point Elevation' },
  landCover:        { ttl: 365 * DAY, group: 'agriculture',    label: 'CORINE Land Cover' },
  nominatim:        { ttl: 365 * DAY, group: 'property',       label: 'Nominatim Geocode' },
  solarWind:        { ttl: 30 * DAY,  group: 'energy',         label: 'Open-Meteo Solar/Wind' },
  pollen:           { ttl: DAY,       group: 'biodiversity',   label: 'Google Pollen' },
  regionalBaseline: { ttl: 7 * DAY,   group: 'regional',       label: 'Regional 8-pt Baseline' },
  speciesWindow0:   { ttl: 30 * DAY,  group: 'biodiversity',   label: 'iNaturalist Window 1' },
  speciesWindow1:   { ttl: 30 * DAY,  group: 'biodiversity',   label: 'iNaturalist Window 2' },
  speciesWindow2:   { ttl: 30 * DAY,  group: 'biodiversity',   label: 'iNaturalist Window 3' },
  ipmaForecast:     { ttl: 3600,      group: 'climate',        label: 'IPMA Forecast' },
};

/** All unique group names */
export const GROUPS = [...new Set(Object.values(SOURCE_REGISTRY).map(s => s.group))];

/** Get all source keys belonging to a group */
export function sourcesByGroup(group) {
  return Object.entries(SOURCE_REGISTRY)
    .filter(([, meta]) => meta.group === group)
    .map(([key]) => key);
}

/** Check whether a fetched-at timestamp is stale for a given source */
export function isStale(sourceKey, fetchedAt) {
  const meta = SOURCE_REGISTRY[sourceKey];
  if (!meta) return true;
  const age = (Date.now() - new Date(fetchedAt).getTime()) / 1000;
  return age > meta.ttl;
}
