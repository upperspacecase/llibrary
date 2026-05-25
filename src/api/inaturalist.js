/**
 * iNaturalist — Community biodiversity observations
 * Free API, no key needed for read.
 * https://api.inaturalist.org/v1/docs/
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

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

  const res = await fetchWithPolicy(`${BASE}/observations?${params}`, {}, {
    source: 'inaturalist-observations', timeoutMs: 10000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`iNaturalist observations error: ${res.status}`);
  return res.json();
}

export async function getSpeciesCounts(lat, lng, radiusKm = 15, options = {}) {
  const params = new URLSearchParams({
    per_page: String(options.limit || 500),
    quality_grade: 'research',
    locale: options.locale || 'en',
  });

  // Prefer bbox when supplied; otherwise fall back to point + radius. The
  // pipeline passes a bbox for whole-region aggregation (e.g. an entire
  // municipality), and a point + radius for parcel-scale lookups.
  // bbox shape: { swLat, swLng, neLat, neLng }
  if (options.bbox
      && typeof options.bbox.swLat === 'number'
      && typeof options.bbox.swLng === 'number'
      && typeof options.bbox.neLat === 'number'
      && typeof options.bbox.neLng === 'number') {
    params.set('swlat', String(options.bbox.swLat));
    params.set('swlng', String(options.bbox.swLng));
    params.set('nelat', String(options.bbox.neLat));
    params.set('nelng', String(options.bbox.neLng));
  } else {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
    params.set('radius', String(radiusKm));
  }

  if (options.iconic_taxa) params.set('iconic_taxa', options.iconic_taxa);
  if (options.threatened) params.set('threatened', 'true');
  if (options.d1) params.set('d1', options.d1);
  if (options.d2) params.set('d2', options.d2);

  const res = await fetchWithPolicy(`${BASE}/observations/species_counts?${params}`, {}, {
    source: 'inaturalist-species-counts', timeoutMs: 15000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`iNaturalist species counts error: ${res.status}`);
  return res.json();
}

export async function getThreatenedSpecies(lat, lng, radiusKm = 25, options = {}) {
  return getSpeciesCounts(lat, lng, radiusKm, { ...options, threatened: true });
}

export async function getTaxonDetail(taxonId) {
  const res = await fetchWithPolicy(`${BASE}/taxa/${taxonId}?locale=en`, {}, {
    source: 'inaturalist-taxon', timeoutMs: 8000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`iNaturalist taxon error: ${res.status}`);
  return res.json();
}

export async function getPlaces(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    per_page: '10',
  });
  const res = await fetchWithPolicy(`${BASE}/places/nearby?${params}`, {}, {
    source: 'inaturalist-places', timeoutMs: 8000, accept: 'application/json',
  });
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
