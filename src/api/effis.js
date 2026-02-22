/**
 * EFFIS — European Forest Fire Information System
 * Free WMS services. No API key needed.
 * https://effis.jrc.ec.europa.eu/applications/data-and-services
 */

// EFFIS WMS base URL
export const EFFIS_WMS = 'https://maps.effis.emergency.copernicus.eu/wms';

// Available WMS layers
export const LAYERS = {
  // Current fire danger forecast (Fire Weather Index)
  FIRE_DANGER: 'ecmwf.fwi',
  // Burned areas (current year)
  BURNED_AREAS_CURRENT: 'modis.hs',
  // Burned areas (all years)
  BURNED_AREAS_ALL: 'firms.hs',
  // Fire danger forecast (next days)
  FIRE_FORECAST_D1: 'ecmwf.fwi.d1',
  FIRE_FORECAST_D2: 'ecmwf.fwi.d2',
  FIRE_FORECAST_D3: 'ecmwf.fwi.d3',
};

export function getFireDangerWmsParams(layer = LAYERS.FIRE_DANGER) {
  return {
    layers: layer,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
}

// Fire danger levels based on FWI (Fire Weather Index)
export const FIRE_DANGER_LEVELS = {
  VERY_LOW: { min: 0, max: 5.2, label: 'Very Low', color: '#008000' },
  LOW: { min: 5.2, max: 11.2, label: 'Low', color: '#FFFF00' },
  MODERATE: { min: 11.2, max: 21.3, label: 'Moderate', color: '#FFA500' },
  HIGH: { min: 21.3, max: 38.0, label: 'High', color: '#FF0000' },
  VERY_HIGH: { min: 38.0, max: 50.0, label: 'Very High', color: '#800000' },
  EXTREME: { min: 50.0, max: Infinity, label: 'Extreme', color: '#4B0082' },
};

export function getFireDangerLevel(fwi) {
  for (const [, level] of Object.entries(FIRE_DANGER_LEVELS)) {
    if (fwi >= level.min && fwi < level.max) return level;
  }
  return FIRE_DANGER_LEVELS.VERY_LOW;
}

// Estimate fire risk based on location, temperature, and recent precipitation
export function estimateFireRisk(lat, lng, tempMax, recentPrecip, month) {
  let risk = 0;

  // Mediterranean regions have higher base fire risk
  if (lat >= 35 && lat <= 45 && lng >= -10 && lng <= 35) risk += 2;

  // Temperature factor
  if (tempMax > 35) risk += 3;
  else if (tempMax > 30) risk += 2;
  else if (tempMax > 25) risk += 1;

  // Precipitation factor (last 7 days)
  if (recentPrecip < 1) risk += 3;
  else if (recentPrecip < 5) risk += 2;
  else if (recentPrecip < 15) risk += 1;

  // Seasonal factor (June-September = peak fire season in Mediterranean)
  if (month >= 5 && month <= 8) risk += 2;
  else if (month >= 4 && month <= 9) risk += 1;

  // Map to levels
  if (risk >= 9) return { level: 'Extreme', color: '#4B0082', score: risk };
  if (risk >= 7) return { level: 'Very High', color: '#800000', score: risk };
  if (risk >= 5) return { level: 'High', color: '#FF0000', score: risk };
  if (risk >= 3) return { level: 'Moderate', color: '#FFA500', score: risk };
  if (risk >= 1) return { level: 'Low', color: '#FFFF00', score: risk };
  return { level: 'Very Low', color: '#008000', score: risk };
}

// Historical fire data for Odemira region
export const ODEMIRA_FIRE_HISTORY = {
  majorEvents: [
    { year: 2003, description: 'Severe fire season across Portugal. Significant burned area in Alentejo.' },
    { year: 2012, description: 'Multiple fires in Odemira municipality affecting agricultural and forest land.' },
    { year: 2017, description: 'Catastrophic fire season in Portugal. Odemira affected by regional fires.' },
    { year: 2018, description: 'Fire near Monchique spread into southern Odemira municipality.' },
    { year: 2023, description: 'Post-fire flooding and erosion events following vegetation loss from previous fires.' },
  ],
  context: 'Fire risk in Odemira is shaped by Mediterranean summers (hot, dry), eucalyptus monoculture, and the proximity to Serra de Monchique. Post-fire flooding is an increasing concern as burnt hillsides lose their ability to absorb rainfall.',
};
