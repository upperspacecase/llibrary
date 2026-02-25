/**
 * GBIF — Global Biodiversity Information Facility
 * Free, no API key for read operations.
 * https://www.gbif.org/developer/occurrence
 */

const BASE = 'https://api.gbif.org/v1';

export async function getSpeciesOccurrences(lat, lng, radiusKm = 15, options = {}) {
  const params = new URLSearchParams({
    decimalLatitude: `${(lat - radiusKm / 111).toFixed(4)},${(lat + radiusKm / 111).toFixed(4)}`,
    decimalLongitude: `${(lng - radiusKm / (111 * Math.cos(lat * Math.PI / 180))).toFixed(4)},${(lng + radiusKm / (111 * Math.cos(lat * Math.PI / 180))).toFixed(4)}`,
    limit: String(options.limit || 300),
    hasCoordinate: 'true',
    hasGeospatialIssue: 'false',
    occurrenceStatus: 'PRESENT',
  });
  if (options.taxonKey) params.set('taxonKey', String(options.taxonKey));
  if (options.year) params.set('year', String(options.year));
  if (options.basisOfRecord) params.set('basisOfRecord', options.basisOfRecord);

  const res = await fetch(`${BASE}/occurrence/search?${params}`);
  if (!res.ok) throw new Error(`GBIF error: ${res.status}`);
  return res.json();
}

export async function getSpeciesInArea(bbox, options = {}) {
  const [south, west, north, east] = bbox;
  const geometry = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
  const params = new URLSearchParams({
    geometry,
    limit: String(options.limit || 300),
    hasCoordinate: 'true',
    facet: 'speciesKey',
    facetLimit: '500',
  });

  const res = await fetch(`${BASE}/occurrence/search?${params}`);
  if (!res.ok) throw new Error(`GBIF area search error: ${res.status}`);
  return res.json();
}

export async function getSpeciesDetail(speciesKey) {
  const res = await fetch(`${BASE}/species/${speciesKey}`);
  if (!res.ok) throw new Error(`GBIF species error: ${res.status}`);
  return res.json();
}

export async function searchSpecies(name) {
  const params = new URLSearchParams({ q: name, limit: '20' });
  const res = await fetch(`${BASE}/species/search?${params}`);
  if (!res.ok) throw new Error(`GBIF search error: ${res.status}`);
  return res.json();
}

export function summarizeOccurrences(occurrences) {
  if (!occurrences || !occurrences.results) return { total: 0, species: [], kingdoms: {} };

  const speciesMap = new Map();
  const kingdoms = {};

  occurrences.results.forEach(occ => {
    const key = occ.speciesKey || occ.taxonKey;
    const name = occ.species || occ.scientificName || 'Unknown';
    const kingdom = occ.kingdom || 'Unknown';

    if (key && !speciesMap.has(key)) {
      speciesMap.set(key, {
        key,
        scientificName: occ.scientificName,
        species: occ.species,
        vernacularName: occ.vernacularName,
        kingdom,
        phylum: occ.phylum,
        class: occ.class,
        order: occ.order,
        family: occ.family,
        iucnRedListCategory: occ.iucnRedListCategory,
        count: 0,
      });
    }
    if (speciesMap.has(key)) {
      speciesMap.get(key).count++;
    }
    kingdoms[kingdom] = (kingdoms[kingdom] || 0) + 1;
  });

  const species = Array.from(speciesMap.values()).sort((a, b) => b.count - a.count);
  return { total: occurrences.count || occurrences.results.length, species, kingdoms };
}

// GBIF taxon keys for common groups
export const TAXON_KEYS = {
  PLANTS: 6,       // Plantae
  ANIMALS: 1,      // Animalia
  FUNGI: 5,        // Fungi
  BIRDS: 212,      // Aves
  MAMMALS: 359,    // Mammalia
  INSECTS: 216,    // Insecta
  REPTILES: 358,   // Reptilia
  AMPHIBIANS: 131, // Amphibia
};
