/**
 * SoilGrids (ISRIC) — Global soil data
 * Free REST API. No API key needed.
 * https://rest.isric.org/soilgrids/v2.0/docs
 */

const BASE = 'https://rest.isric.org/soilgrids/v2.0';

export async function getSoilProperties(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    property: ['clay', 'sand', 'silt', 'phh2o', 'soc', 'nitrogen', 'cec', 'ocd', 'bdod'].join(','),
    depth: ['0-5cm', '5-15cm', '15-30cm', '30-60cm'].join(','),
    value: 'mean',
  });
  const res = await fetch(`${BASE}/properties/query?${params}`);
  if (!res.ok) throw new Error(`SoilGrids properties error: ${res.status}`);
  return res.json();
}

export async function getSoilClassification(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    number_classes: '5',
  });
  const res = await fetch(`${BASE}/classification/query?${params}`);
  if (!res.ok) throw new Error(`SoilGrids classification error: ${res.status}`);
  return res.json();
}

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
