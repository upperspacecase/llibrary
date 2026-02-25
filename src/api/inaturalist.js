/**
 * iNaturalist — Community biodiversity observations
 * Free API, no key needed for read.
 * https://api.inaturalist.org/v1/docs/
 */

const BASE = 'https://api.inaturalist.org/v1';

export async function getObservations(lat, lng, radiusKm = 15, options = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusKm),
    per_page: String(options.limit || 200),
    order: 'desc',
    order_by: 'observed_on',
    quality_grade: options.quality || 'research',
    locale: options.locale || 'en',
  });
  if (options.taxon_id) params.set('taxon_id', String(options.taxon_id));
  if (options.iconic_taxa) params.set('iconic_taxa', options.iconic_taxa);
  if (options.d1) params.set('d1', options.d1);
  if (options.d2) params.set('d2', options.d2);
  if (options.threatened) params.set('threatened', 'true');
  if (options.endemic) params.set('endemic', 'true');
  if (options.introduced) params.set('introduced', 'true');

  const res = await fetch(`${BASE}/observations?${params}`);
  if (!res.ok) throw new Error(`iNaturalist observations error: ${res.status}`);
  return res.json();
}

export async function getSpeciesCounts(lat, lng, radiusKm = 15, options = {}) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radiusKm),
    per_page: String(options.limit || 500),
    quality_grade: 'research',
    locale: options.locale || 'en',
  });
  if (options.iconic_taxa) params.set('iconic_taxa', options.iconic_taxa);
  if (options.threatened) params.set('threatened', 'true');

  const res = await fetch(`${BASE}/observations/species_counts?${params}`);
  if (!res.ok) throw new Error(`iNaturalist species counts error: ${res.status}`);
  return res.json();
}

export async function getThreatenedSpecies(lat, lng, radiusKm = 25) {
  return getSpeciesCounts(lat, lng, radiusKm, { threatened: true });
}

export async function getTaxonDetail(taxonId) {
  const res = await fetch(`${BASE}/taxa/${taxonId}?locale=en`);
  if (!res.ok) throw new Error(`iNaturalist taxon error: ${res.status}`);
  return res.json();
}

export async function getPlaces(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    per_page: '10',
  });
  const res = await fetch(`${BASE}/places/nearby?${params}`);
  if (!res.ok) throw new Error(`iNaturalist places error: ${res.status}`);
  return res.json();
}

export function summarizeSpeciesCounts(data) {
  if (!data || !data.results) return { total: 0, groups: {}, species: [] };

  const groups = {};
  const species = data.results.map(r => {
    const taxon = r.taxon || {};
    const group = taxon.iconic_taxon_name || 'Other';
    groups[group] = (groups[group] || 0) + 1;
    return {
      id: taxon.id,
      name: taxon.preferred_common_name || taxon.name,
      scientificName: taxon.name,
      group,
      observationCount: r.count,
      threatened: taxon.threatened || false,
      endemic: taxon.endemic || false,
      introduced: taxon.introduced || false,
      photoUrl: taxon.default_photo ? taxon.default_photo.square_url : null,
      wikipediaUrl: taxon.wikipedia_url,
      conservationStatus: taxon.conservation_status,
    };
  });

  return {
    total: data.total_results || species.length,
    groups,
    species: species.sort((a, b) => b.observationCount - a.observationCount),
  };
}

export const ICONIC_TAXA = {
  PLANTAE: 'Plantae',
  AVES: 'Aves',
  MAMMALIA: 'Mammalia',
  INSECTA: 'Insecta',
  REPTILIA: 'Reptilia',
  AMPHIBIA: 'Amphibia',
  FUNGI: 'Fungi',
  ACTINOPTERYGII: 'Actinopterygii',
  ARACHNIDA: 'Arachnida',
  MOLLUSCA: 'Mollusca',
};
