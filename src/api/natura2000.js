/**
 * Natura 2000 & Protected Areas
 * WMS services free and public. No API key needed.
 * https://www.eea.europa.eu/data-and-maps/data/natura-14
 *
 * Dynamic queries via Overpass API for protected areas near any coordinate.
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

/**
 * Dynamically fetch protected areas near a coordinate using Overpass API.
 * Queries: nature_reserve, national_park, protected_area, natural parks.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @returns {Promise<Object[]>} Array of protected area objects
 */
export async function getProtectedAreas(lat, lng, radiusKm = 25) {
  const radiusM = radiusKm * 1000;
  const query = `
    [out:json][timeout:20];
    (
      way["boundary"="protected_area"](around:${radiusM},${lat},${lng});
      relation["boundary"="protected_area"](around:${radiusM},${lat},${lng});
      way["leisure"="nature_reserve"](around:${radiusM},${lat},${lng});
      relation["leisure"="nature_reserve"](around:${radiusM},${lat},${lng});
      way["boundary"="national_park"](around:${radiusM},${lat},${lng});
      relation["boundary"="national_park"](around:${radiusM},${lat},${lng});
    );
    out tags;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    const data = await res.json();

    const seen = new Set();
    return (data.elements || [])
      .filter(el => {
        const name = el.tags?.name || el.tags?.['name:en'];
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .map(el => ({
        name: el.tags?.name || 'Unnamed',
        nameEn: el.tags?.['name:en'] || el.tags?.name || 'Unnamed',
        type: classifyProtectedArea(el.tags),
        designation: el.tags?.designation || el.tags?.protect_class || '',
        protectClass: el.tags?.protect_class || '',
        operator: el.tags?.operator || '',
        website: el.tags?.website || el.tags?.url || '',
        wikidata: el.tags?.wikidata || '',
        description: buildProtectedDescription(el.tags),
      }))
      .slice(0, 10);
  } catch (err) {
    console.warn('Protected areas query failed:', err.message);
    return [];
  }
}

function classifyProtectedArea(tags) {
  if (!tags) return 'Protected Area';
  const pc = tags.protect_class || '';
  const type = tags.boundary || tags.leisure || '';
  const desig = (tags.designation || '').toLowerCase();

  if (desig.includes('natura 2000') || desig.includes('sac') || desig.includes('sci')) return 'Natura 2000 SCI';
  if (desig.includes('spa') || desig.includes('zpe')) return 'Natura 2000 SPA';
  if (type === 'national_park' || desig.includes('national park')) return 'National Park';
  if (type === 'nature_reserve' || desig.includes('nature reserve')) return 'Nature Reserve';
  if (desig.includes('natural park') || desig.includes('parque natural')) return 'Natural Park';
  if (pc === '1' || pc === '2') return 'Strict Reserve';
  if (pc === '5') return 'Protected Landscape';
  return 'Protected Area';
}

function buildProtectedDescription(tags) {
  if (!tags) return '';
  const parts = [];
  if (tags.designation) parts.push(tags.designation);
  if (tags.protect_class) parts.push(`IUCN Category ${tags.protect_class}`);
  if (tags.operator) parts.push(`Managed by ${tags.operator}`);
  return parts.join('. ') || 'Protected area.';
}

// Conservation status categories (static reference — not location-specific)
export const CONSERVATION_STATUS = {
  CR: { label: 'Critically Endangered', color: '#CC3333' },
  EN: { label: 'Endangered', color: '#CC6633' },
  VU: { label: 'Vulnerable', color: '#CC9900' },
  NT: { label: 'Near Threatened', color: '#99CC00' },
  LC: { label: 'Least Concern', color: '#006600' },
  DD: { label: 'Data Deficient', color: '#999999' },
  NE: { label: 'Not Evaluated', color: '#CCCCCC' },
};

// Zoning designations — static reference for Portuguese planning system (applies nationwide)
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
