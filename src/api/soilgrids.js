/**
 * SoilGrids (ISRIC) — Global soil data via WMS GetFeatureInfo
 * Uses the stable WMS service at maps.isric.org instead of the flaky REST API.
 * Same 250m SoilGrids data, more reliable protocol.
 * https://www.isric.org/explore/soilgrids/faq-soilgrids
 */

const WMS_BASE = 'https://maps.isric.org/mapserv';

const SOIL_LAYERS = [
  { map: 'clay', layer: 'clay_0-5cm_mean', prop: 'clay' },
  { map: 'sand', layer: 'sand_0-5cm_mean', prop: 'sand' },
  { map: 'silt', layer: 'silt_0-5cm_mean', prop: 'silt' },
  { map: 'phh2o', layer: 'phh2o_0-5cm_mean', prop: 'phh2o' },
  { map: 'soc', layer: 'soc_0-5cm_mean', prop: 'soc' },
  { map: 'nitrogen', layer: 'nitrogen_0-5cm_mean', prop: 'nitrogen' },
  { map: 'cec', layer: 'cec_0-5cm_mean', prop: 'cec' },
  { map: 'bdod', layer: 'bdod_0-5cm_mean', prop: 'bdod' },
  { map: 'ocd', layer: 'ocd_0-5cm_mean', prop: 'ocd' },
];

const UNIT_MAP = {
  clay: 'g/kg', sand: 'g/kg', silt: 'g/kg',
  phh2o: 'pH*10', soc: 'dg/kg', nitrogen: 'cg/kg',
  cec: 'mmol(c)/kg', bdod: 'cg/cm³', ocd: 'hg/m³',
};

async function getFeatureInfo(lat, lng, mapName, layerName) {
  const d = 0.002; // ~250m bbox around the point
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const params = new URLSearchParams({
    map: `/map/${mapName}.map`,
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetFeatureInfo',
    LAYERS: layerName,
    QUERY_LAYERS: layerName,
    INFO_FORMAT: 'application/json',
    SRS: 'EPSG:4326',
    BBOX: bbox,
    WIDTH: '1',
    HEIGHT: '1',
    X: '0',
    Y: '0',
  });
  const res = await fetch(`${WMS_BASE}?${params}`);
  if (!res.ok) throw new Error(`SoilGrids WMS error: ${res.status}`);
  return res.json();
}

function extractValue(geoJson) {
  // WMS GetFeatureInfo returns GeoJSON with feature properties containing the value
  if (!geoJson || !geoJson.features || !geoJson.features.length) return null;
  const props = geoJson.features[0].properties;
  if (!props) return null;
  // The value key varies — take the first numeric property
  for (const [key, val] of Object.entries(props)) {
    if (typeof val === 'number') return val;
  }
  return null;
}

export async function getSoilProperties(lat, lng) {
  const results = await Promise.allSettled(
    SOIL_LAYERS.map(l => getFeatureInfo(lat, lng, l.map, l.layer))
  );

  // Build response in the same shape as the old REST API so parseSoilProperties() still works
  const layers = SOIL_LAYERS.map((l, i) => {
    const val = results[i].status === 'fulfilled' ? extractValue(results[i].value) : null;
    return {
      name: l.prop,
      unit_measure: { mapped_units: UNIT_MAP[l.prop] || '' },
      depths: [{
        label: '0-5cm',
        values: { mean: val },
      }],
    };
  });

  return { properties: { layers } };
}

export async function getSoilClassification(lat, lng) {
  try {
    const data = await getFeatureInfo(lat, lng, 'wrb', 'MostProbable');
    if (!data || !data.features || !data.features.length) return null;
    const props = data.features[0].properties || {};
    // WRB layer returns class number — map to name
    const classNum = props.value || props.MostProbable || null;
    const className = classNum != null ? WRB_CLASSES[classNum] || `Class ${classNum}` : null;
    return {
      wrb_class_name: className,
      wrb_class_probability: props.probability || null,
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
