/**
 * Data Pipeline Health Check — tests all external data sources.
 * POST /api/admin/pipeline  { password }           → test all
 * POST /api/admin/pipeline  { password, source }    → test one by id
 */

// Test coordinate: Odemira, Portugal
const LAT = 37.5967;
const LNG = -8.6394;

const SOURCES = [
    {
        id: 'open-meteo-forecast',
        name: 'Open-Meteo Forecast',
        feeds: ['Climate tab', 'Dashboard weather', 'Report'],
        test: () => probe(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=temperature_2m_max&timezone=auto&forecast_days=1`),
    },
    {
        id: 'open-meteo-elevation',
        name: 'Open-Meteo Elevation',
        feeds: ['Terrain tab'],
        test: () => probe(`https://api.open-meteo.com/v1/elevation?latitude=${LAT}&longitude=${LNG}`),
    },
    {
        id: 'open-meteo-historical',
        name: 'Open-Meteo Historical',
        feeds: ['Climate averages', 'Report'],
        test: () => probe(`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LNG}&start_date=2025-01-01&end_date=2025-01-02&daily=temperature_2m_max`),
    },
    {
        id: 'open-meteo-flood',
        name: 'Open-Meteo Flood (GloFAS)',
        feeds: ['Flood discharge alert', 'Risk scores'],
        test: () => probe(`https://flood-api.open-meteo.com/v1/flood?latitude=${LAT}&longitude=${LNG}&daily=river_discharge&forecast_days=3`),
    },
    {
        id: 'risk-scores',
        name: 'Risk Scores (computed)',
        feeds: ['Dashboard risk cards', 'KPI scores'],
        test: () => probe(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&past_days=7&forecast_days=3&timezone=auto`),
    },
    {
        id: 'soilgrids',
        name: 'SoilGrids (ISRIC)',
        feeds: ['Terrain tab soil panel', 'Report'],
        test: () => probe(`https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${LAT}&lon=${LNG}&property=clay&depth=0-5cm&value=mean`),
    },
    {
        id: 'soilgrids-classification',
        name: 'SoilGrids Classification',
        feeds: ['Terrain tab WRB class'],
        test: () => probe(`https://rest.isric.org/soilgrids/v2.0/classification/query?lat=${LAT}&lon=${LNG}&number_classes=3`),
    },
    {
        id: 'macrostrat',
        name: 'Macrostrat Geology',
        feeds: ['Terrain tab geology', 'Report'],
        test: () => probe(`https://macrostrat.org/api/v2/geologic_units/map?lat=${LAT}&lng=${LNG}&response=long`),
    },
    {
        id: 'gbif',
        name: 'GBIF Biodiversity',
        feeds: ['Ecosystem tab occurrences', 'Report'],
        test: () => probe(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=37.4,37.8&decimalLongitude=-8.8,-8.4&limit=1&hasCoordinate=true`),
    },
    {
        id: 'inaturalist',
        name: 'iNaturalist',
        feeds: ['Ecosystem tab species', 'Threatened species', 'Report'],
        test: () => probe(`https://api.inaturalist.org/v1/observations?lat=${LAT}&lng=${LNG}&radius=15&per_page=1&quality_grade=research`),
    },
    {
        id: 'nominatim',
        name: 'Nominatim Geocoding',
        feeds: ['Wiki location search'],
        test: () => probe(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${LAT}&lon=${LNG}&zoom=16`, { 'User-Agent': 'Libraries/1.0 (bioregional-wiki)' }),
    },
    {
        id: 'overpass',
        name: 'Overpass API (OSM)',
        feeds: ['Water features', 'Infrastructure', 'Protected areas'],
        test: () => probePost('https://overpass-api.de/api/interpreter', 'data=[out:json][timeout:10];node["natural"="spring"](around:5000,37.5967,-8.6394);out 1;'),
    },
    {
        id: 'ipma-forecast',
        name: 'IPMA Forecast (Portugal)',
        feeds: ['Portuguese weather'],
        test: () => probe(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1081100.json`),
    },
    {
        id: 'ipma-observations',
        name: 'IPMA Observations',
        feeds: ['Station observations'],
        test: () => probe(`https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json`),
    },
    {
        id: 'ipma-drought',
        name: 'IPMA Drought Index',
        feeds: ['Drought monitoring'],
        test: () => probe(`https://api.ipma.pt/open-data/observation/climate/mpdsi/2/`),
    },
    {
        id: 'dgt',
        name: 'DGT Portugal (CAOP)',
        feeds: ['Admin boundaries', 'Parish/municipality lookup'],
        test: () => probe(`https://ogcapi.dgterritorio.gov.pt/collections/freguesias/items?bbox=-8.6404,37.5957,-8.6384,37.5977&limit=1&f=json`, {}, 15000),
    },
    {
        id: 'effis',
        name: 'EFFIS Fire Danger WMS',
        feeds: ['Fire danger map layer', 'Report'],
        test: () => probe(`https://maps.effis.emergency.copernicus.eu/effisgis/wms?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'corine',
        name: 'CORINE Land Cover WMS',
        feeds: ['Land cover map layer', 'Report'],
        test: () => probe(`https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'natura2000',
        name: 'Natura 2000 WMS',
        feeds: ['Protected areas map layer'],
        test: () => probe(`https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'worldcover',
        name: 'ESA WorldCover WMS',
        feeds: ['WorldCover map layer'],
        test: () => probe(`https://services.terrascope.be/wms/v2?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'global-land-cover',
        name: 'Global Land Cover WMS (VITO)',
        feeds: ['Deprecated — use WorldCover'],
        test: () => Promise.resolve({ ok: false, status: 0, ms: 0, error: 'Retired (domain offline)' }),
    },
    {
        id: 'sentinel2',
        name: 'Sentinel-2 Cloudless Tiles',
        feeds: ['Satellite basemap'],
        test: () => probe(`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/5/15/15.jpg`),
    },
    {
        id: 'nasa-firms',
        name: 'NASA FIRMS Active Fires',
        feeds: ['Active fire alerts', 'Dashboard'],
        needsKey: 'VITE_FIRMS_KEY',
        test: () => {
            const key = process.env.VITE_FIRMS_KEY;
            if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_FIRMS_KEY)' });
            return probe(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/-9,37,-8,38/1`);
        },
    },
    {
        id: 'openrouteservice',
        name: 'OpenRouteService',
        feeds: ['Distance calculations', 'Isochrones'],
        needsKey: 'VITE_ORS_KEY',
        test: () => {
            const key = process.env.VITE_ORS_KEY;
            if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_ORS_KEY)' });
            return probe(`https://api.openrouteservice.org/v2/directions/driving-car?api_key=${key}&start=-8.6394,37.5967&end=-8.64,37.60`);
        },
    },
];

async function probe(url, headers = {}, timeout = 10000) {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { ...headers },
        });
        clearTimeout(timer);
        return { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch (err) {
        clearTimeout(timer);
        const isTimeout = err.name === 'AbortError';
        return { ok: false, status: 0, ms: Date.now() - start, error: isTimeout ? 'Timeout' : err.message };
    }
}

async function probePost(url, body, timeout = 10000) {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(url, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal,
        });
        clearTimeout(timer);
        return { ok: res.ok, status: res.status, ms: Date.now() - start };
    } catch (err) {
        clearTimeout(timer);
        const isTimeout = err.name === 'AbortError';
        return { ok: false, status: 0, ms: Date.now() - start, error: isTimeout ? 'Timeout' : err.message };
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password, source } = req.body || {};
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Single source test
    if (source) {
        const entry = SOURCES.find(s => s.id === source);
        if (!entry) return res.status(404).json({ error: 'Unknown source' });
        const result = await entry.test();
        return res.json({ id: entry.id, name: entry.name, feeds: entry.feeds, needsKey: entry.needsKey || null, ...result });
    }

    // Test all — run in parallel
    const results = await Promise.all(
        SOURCES.map(async (entry) => {
            const result = await entry.test();
            return { id: entry.id, name: entry.name, feeds: entry.feeds, needsKey: entry.needsKey || null, ...result };
        })
    );

    return res.json({ sources: results, testedAt: new Date().toISOString() });
}
