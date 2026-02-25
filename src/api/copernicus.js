/**
 * Copernicus / EEA — Land cover, satellite data, environmental layers
 * WMS services are free and public. No API key for WMS layers.
 *
 * CORINE Land Cover: https://land.copernicus.eu/pan-european/corine-land-cover
 * Global Land Cover: https://lcviewer.vito.be/
 */

// CORINE Land Cover 2018 WMS (EEA)
export const CORINE_WMS = 'https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer';
export const CORINE_LAYER = '12'; // CLC 2018

// Copernicus Global Land Service — Land Cover
export const GLOBAL_LAND_COVER_WMS = 'https://viewer.globallandcover.vito.be/geoserver/wms';
export const GLOBAL_LAND_COVER_LAYER = 'cgls:lcv_landcover_euroasia_2019';

// Sentinel-2 cloudless mosaic (EOX)
export const SENTINEL2_TILES = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg';

// ESA WorldCover (10m land cover)
export const WORLDCOVER_WMS = 'https://services.terrascope.be/wms/v2';
export const WORLDCOVER_LAYER = 'WORLDCOVER_2021_MAP';

export function getCorineWmsParams() {
  return {
    layers: CORINE_LAYER,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
}

export function getWorldCoverWmsParams() {
  return {
    layers: WORLDCOVER_LAYER,
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: 'EPSG:4326',
  };
}

// CORINE Land Cover classes relevant to our region
export const CORINE_CLASSES = {
  111: { name: 'Continuous urban fabric', color: '#e6004d' },
  112: { name: 'Discontinuous urban fabric', color: '#ff0000' },
  121: { name: 'Industrial or commercial', color: '#cc4df2' },
  211: { name: 'Non-irrigated arable land', color: '#ffffa8' },
  212: { name: 'Permanently irrigated land', color: '#ffff00' },
  213: { name: 'Rice fields', color: '#e6e600' },
  221: { name: 'Vineyards', color: '#e68000' },
  222: { name: 'Fruit trees and berry plantations', color: '#f2a64d' },
  223: { name: 'Olive groves', color: '#e6a600' },
  231: { name: 'Pastures', color: '#e6e64d' },
  241: { name: 'Annual crops with permanent crops', color: '#ffe6a6' },
  242: { name: 'Complex cultivation patterns', color: '#ffe64d' },
  243: { name: 'Agriculture with natural vegetation', color: '#e6cc4d' },
  244: { name: 'Agro-forestry areas', color: '#f2cca6' },
  311: { name: 'Broad-leaved forest', color: '#80ff00' },
  312: { name: 'Coniferous forest', color: '#00a600' },
  313: { name: 'Mixed forest', color: '#4dff00' },
  321: { name: 'Natural grasslands', color: '#ccf24d' },
  322: { name: 'Moors and heathland', color: '#a6ff80' },
  323: { name: 'Sclerophyllous vegetation', color: '#a6e64d' },
  324: { name: 'Transitional woodland-shrub', color: '#a6f200' },
  331: { name: 'Beaches, dunes, sands', color: '#e6e6e6' },
  332: { name: 'Bare rocks', color: '#cccccc' },
  333: { name: 'Sparsely vegetated areas', color: '#ccffa6' },
  334: { name: 'Burnt areas', color: '#000000' },
  411: { name: 'Inland marshes', color: '#a6a6ff' },
  511: { name: 'Water courses', color: '#0000ff' },
  512: { name: 'Water bodies', color: '#0000ff' },
  521: { name: 'Coastal lagoons', color: '#00ccf2' },
  522: { name: 'Estuaries', color: '#a6c8ff' },
  523: { name: 'Sea and ocean', color: '#e6f2ff' },
};

// ESA WorldCover classes
export const WORLDCOVER_CLASSES = {
  10: { name: 'Tree cover', color: '#006400' },
  20: { name: 'Shrubland', color: '#ffbb22' },
  30: { name: 'Grassland', color: '#ffff4c' },
  40: { name: 'Cropland', color: '#f096ff' },
  50: { name: 'Built-up', color: '#fa0000' },
  60: { name: 'Bare / sparse vegetation', color: '#b4b4b4' },
  70: { name: 'Snow and ice', color: '#f0f0f0' },
  80: { name: 'Permanent water bodies', color: '#0064c8' },
  90: { name: 'Herbaceous wetland', color: '#0096a0' },
  95: { name: 'Mangroves', color: '#00cf75' },
  100: { name: 'Moss and lichen', color: '#fae6a0' },
};

// Satellite timelapse helper — Google Earth Engine Timelapse tiles
export function getEarthTimelapseUrl(lat, lng, zoom = 10) {
  return `https://earthengine.google.com/timelapse/#v=${lat},${lng},${zoom},latLng&t=0.03&ps=50&bt=19840101&et=20221231`;
}

// Copernicus Climate Data Store — requires registration, placeholder for when API key is available
export const CDS_API_BASE = 'https://cds.climate.copernicus.eu/api/v2';
