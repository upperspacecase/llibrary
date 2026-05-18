/**
 * SoilGrids (ISRIC) — Global soil data via REST API.
 * Previously used the WMS GetFeatureInfo endpoint, which broke in two ways:
 *   (1) MapServer 8.0 now requires STYLES on every WMS call,
 *   (2) maprasterquery dropped INFO_FORMAT=application/json support.
 * REST is back and returns the exact shape parseSoilProperties already
 * expects, so this is the simpler, more durable surface.
 * https://www.isric.org/explore/soilgrids/faq-soilgrids
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

const REST_BASE = 'https://rest.isric.org/soilgrids/v2.0';

const SOIL_PROPS = ['clay', 'sand', 'silt', 'phh2o', 'soc', 'nitrogen', 'cec', 'bdod', 'ocd'];

export async function getSoilProperties(lat, lng) {
  const params = new URLSearchParams();
  for (const p of SOIL_PROPS) params.append('property', p);
  params.append('depth', '0-5cm');
  params.append('value', 'mean');
  params.append('lat', String(lat));
  params.append('lon', String(lng));

  const res = await fetchWithPolicy(`${REST_BASE}/properties/query?${params}`, {}, {
    source: 'soilgrids-rest', timeoutMs: 15000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`SoilGrids REST error: ${res.status}`);
  return res.json();
}

export async function getSoilClassification(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      number_classes: '1',
    });
    const res = await fetchWithPolicy(`${REST_BASE}/classification/query?${params}`, {}, {
      source: 'soilgrids-rest', timeoutMs: 15000, accept: 'application/json',
    });
    if (!res.ok) throw new Error(`SoilGrids classification HTTP ${res.status}`);
    const data = await res.json();
    const top = Array.isArray(data.wrb_class_probability) ? data.wrb_class_probability[0] : null;
    return {
      wrb_class_name: data.wrb_class_name || (top && top[0]) || null,
      wrb_class_probability: top ? top[1] : (data.wrb_class_value ?? null),
    };
  } catch {
    return null;
  }
}

// WRB soil class codes from ISRIC
const WRB_CLASSES = {
  1: 'Acrisol', 2: 'Albeluvisol', 3: 'Alisol', 4: 'Andosol', 5: 'Arenosol',
  6: 'Calcisol', 7: 'Cambisol', 8: 'Chernozem', 9: 'Cryosol', 10: 'Durisol',
  11: 'Ferralsol', 12: 'Fluvisol', 13: 'Gleysol', 14: 'Gypsisol', 15: 'Histosol',
  16: 'Kastanozem', 17: 'Leptosol', 18: 'Lixisol', 19: 'Luvisol', 20: 'Nitisol',
  21: 'Phaeozem', 22: 'Planosol', 23: 'Plinthosol', 24: 'Podzol', 25: 'Regosol',
  26: 'Solonchak', 27: 'Solonetz', 28: 'Stagnosol', 29: 'Umbrisol', 30: 'Vertisol',
};

export function parseSoilProperties(data) {
  if (!data || !data.properties || !data.properties.layers) return null;

  const result = {};
  data.properties.layers.forEach(layer => {
    const prop = layer.name;
    const topDepth = layer.depths && layer.depths[0];
    if (topDepth && topDepth.values && topDepth.values.mean != null) {
      result[prop] = {
        value: topDepth.values.mean,
        unit: layer.unit_measure ? layer.unit_measure.mapped_units : '',
        depth: topDepth.label,
      };
    }
  });

  // Convert to human-readable
  const parsed = {
    texture: getSoilTexture(result),
    ph: result.phh2o ? (result.phh2o.value / 10).toFixed(1) : null,
    organicCarbon: result.soc ? `${(result.soc.value / 10).toFixed(1)} g/kg` : null,
    nitrogen: result.nitrogen ? `${(result.nitrogen.value / 100).toFixed(2)} g/kg` : null,
    cec: result.cec ? `${(result.cec.value / 10).toFixed(1)} cmol/kg` : null,
    bulkDensity: result.bdod ? `${(result.bdod.value / 100).toFixed(2)} g/cm³` : null,
    clay: result.clay ? `${(result.clay.value / 10).toFixed(0)}%` : null,
    sand: result.sand ? `${(result.sand.value / 10).toFixed(0)}%` : null,
    silt: result.silt ? `${(result.silt.value / 10).toFixed(0)}%` : null,
  };

  return parsed;
}

function getSoilTexture(result) {
  if (!result.clay || !result.sand || !result.silt) return 'Unknown';
  const clay = result.clay.value / 10;
  const sand = result.sand.value / 10;

  if (clay >= 40) return 'Clay';
  if (sand >= 85) return 'Sand';
  if (clay < 15 && sand >= 70) return 'Loamy Sand';
  if (clay < 20 && sand >= 50) return 'Sandy Loam';
  if (clay >= 27 && clay < 40 && sand >= 20 && sand < 45) return 'Clay Loam';
  if (clay >= 27 && clay < 40 && sand < 20) return 'Silty Clay Loam';
  if (clay >= 20 && clay < 27) return 'Loam';
  if (clay < 15 && sand < 50) return 'Silt Loam';
  return 'Loam';
}

export function parseSoilClassification(data) {
  if (!data || !data.wrb_class_name) return null;
  return {
    primary: data.wrb_class_name,
    probability: data.wrb_class_probability,
    alternatives: data.wrb_class_name_alternative || [],
  };
}

export function getSoilDescription(texture) {
  const descriptions = {
    'Clay': 'Heavy soil that holds water well but drains slowly. Rich in nutrients. Can be difficult to work when wet.',
    'Sand': 'Light, free-draining soil that warms quickly in spring. Low in nutrients — needs organic matter.',
    'Loamy Sand': 'Mostly sandy with some silt/clay. Drains well but holds some moisture. Good for root vegetables.',
    'Sandy Loam': 'Well-balanced soil with good drainage and reasonable fertility. Excellent for most crops.',
    'Clay Loam': 'Fertile soil with good water retention. Moderate drainage. Works well for most agriculture.',
    'Silty Clay Loam': 'Fertile and moisture-retentive. Can become waterlogged. Good for grassland and crops.',
    'Loam': 'Ideal soil texture — balanced drainage, moisture retention, and fertility. The gold standard.',
    'Silt Loam': 'Smooth, fertile soil with good moisture retention. Susceptible to erosion if exposed.',
  };
  return descriptions[texture] || 'Soil characteristics vary. Consider a local soil test for detailed analysis.';
}

// WMS tile layer for soil type visualization
export function getSoilGridsWmsUrl(property = 'clay', depth = '0-5cm') {
  return `https://maps.isric.org/mapserv?map=/map/${property}.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${property}_${depth}_mean&SRS=EPSG:4326&TRANSPARENT=true`;
}
