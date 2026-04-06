/**
 * Data Pipeline Health Check — tests all external data sources.
 * POST /api/admin/pipeline  { password }           → test all
 * POST /api/admin/pipeline  { password, source }    → test one by id
 */

import { getCollection } from '../_db.js';

// Test coordinate: Odemira, Portugal
const LAT = 37.5967;
const LNG = -8.6394;

const SOURCES = [
    {
        id: 'open-meteo-forecast',
        name: 'Open-Meteo Forecast',
        feeds: ['Climate tab', 'Dashboard weather', 'Report'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=temperature_2m_max&timezone=auto&forecast_days=1`),
    },
    {
        id: 'open-meteo-elevation',
        name: 'Open-Meteo Elevation',
        feeds: ['Terrain tab'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://api.open-meteo.com/v1/elevation?latitude=${LAT}&longitude=${LNG}`),
    },
    {
        id: 'open-meteo-historical',
        name: 'Open-Meteo Historical',
        feeds: ['Climate averages', 'Report'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LNG}&start_date=2025-01-01&end_date=2025-01-02&daily=temperature_2m_max`),
    },
    {
        id: 'open-meteo-flood',
        name: 'Open-Meteo Flood (GloFAS)',
        feeds: ['Flood discharge alert', 'Risk scores'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://flood-api.open-meteo.com/v1/flood?latitude=${LAT}&longitude=${LNG}&daily=river_discharge&forecast_days=3`),
    },
    {
        id: 'risk-scores',
        name: 'Risk Scores (computed)',
        feeds: ['Dashboard risk cards', 'KPI scores'],
        scope: 'global',
        auth: 'open',
        notes: 'Composite score derived from Open-Meteo forecast data',
        test: () => probe(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&daily=temperature_2m_max,precipitation_sum,wind_speed_10m_max&past_days=7&forecast_days=3&timezone=auto`),
    },
    {
        id: 'soilgrids',
        name: 'SoilGrids (ISRIC)',
        feeds: ['Terrain tab soil panel', 'Report'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${LAT}&lon=${LNG}&property=clay&depth=0-5cm&value=mean`),
    },
    {
        id: 'soilgrids-classification',
        name: 'SoilGrids Classification',
        feeds: ['Terrain tab WRB class'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://rest.isric.org/soilgrids/v2.0/classification/query?lat=${LAT}&lon=${LNG}&number_classes=3`),
    },
    {
        id: 'macrostrat',
        name: 'Macrostrat Geology',
        feeds: ['Terrain tab geology', 'Report'],
        scope: 'global',
        auth: 'open',
        notes: 'Fixed by switching to /v2 endpoint',
        test: () => probe(`https://macrostrat.org/api/v2/geologic_units/map?lat=${LAT}&lng=${LNG}&response=long`),
    },
    {
        id: 'gbif',
        name: 'GBIF Biodiversity',
        feeds: ['Ecosystem tab occurrences', 'Report'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://api.gbif.org/v1/occurrence/search?decimalLatitude=37.4,37.8&decimalLongitude=-8.8,-8.4&limit=1&hasCoordinate=true`),
    },
    {
        id: 'inaturalist',
        name: 'iNaturalist',
        feeds: ['Ecosystem tab species', 'Threatened species', 'Report'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://api.inaturalist.org/v1/observations?lat=${LAT}&lng=${LNG}&radius=15&per_page=1&quality_grade=research`),
    },
    {
        id: 'nominatim',
        name: 'Nominatim Geocoding',
        feeds: ['Wiki location search'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${LAT}&lon=${LNG}&zoom=16`, { 'User-Agent': 'Libraries/1.0 (bioregional-wiki)' }),
    },
    {
        id: 'overpass',
        name: 'Overpass API (OSM)',
        feeds: ['Water features', 'Infrastructure', 'Protected areas'],
        scope: 'global',
        auth: 'open',
        notes: '3 separate queries; parallel calls can hit 429 rate limits',
        subQueries: [
            { name: 'Water features', query: 'data=[out:json][timeout:10];node["natural"="spring"](around:5000,37.5967,-8.6394);out 1;' },
            { name: 'Infrastructure', query: 'data=[out:json][timeout:10];node["amenity"](around:5000,37.5967,-8.6394);out 1;' },
            { name: 'Protected areas', query: 'data=[out:json][timeout:10];relation["boundary"="protected_area"](around:10000,37.5967,-8.6394);out 1;' },
        ],
        test: async () => {
            const results = [];
            // Run sequentially to avoid 429
            for (const sq of SOURCES.find(s => s.id === 'overpass').subQueries) {
                results.push({ name: sq.name, ...(await probePost('https://overpass-api.de/api/interpreter', sq.query)) });
            }
            const allOk = results.every(r => r.ok);
            const someOk = results.some(r => r.ok);
            const maxMs = Math.max(...results.map(r => r.ms));
            const worstStatus = results.find(r => !r.ok)?.status || 200;
            return {
                ok: allOk,
                status: allOk ? 200 : worstStatus,
                ms: maxMs,
                error: allOk ? undefined : (someOk ? `Partial: ${results.filter(r => !r.ok).map(r => r.name).join(', ')} failing` : results[0].error),
                subResults: results,
            };
        },
    },
    {
        id: 'mapbox-geocode',
        name: 'Mapbox Geocode',
        feeds: ['Address search', 'Postcode lookup', 'Create landbook'],
        scope: 'global',
        auth: 'env',
        needsKey: 'VITE_MAPBOX_TOKEN',
        test: () => {
            const key = process.env.VITE_MAPBOX_TOKEN;
            if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_MAPBOX_TOKEN)' });
            return probe(`https://api.mapbox.com/geocoding/v5/mapbox.places/${LNG},${LAT}.json?access_token=${key}&types=place&limit=1`);
        },
    },
    {
        id: 'mapbox-static',
        name: 'Mapbox Static Maps',
        feeds: ['Report satellite maps', 'Report topography maps'],
        scope: 'global',
        auth: 'env',
        needsKey: 'VITE_MAPBOX_TOKEN',
        test: () => {
            const key = process.env.VITE_MAPBOX_TOKEN;
            if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_MAPBOX_TOKEN)' });
            return probe(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${LNG},${LAT},10,0/200x200@2x?access_token=${key}`);
        },
    },
    {
        id: 'ipma-forecast',
        name: 'IPMA Forecast (Portugal)',
        feeds: ['Portuguese weather'],
        scope: 'portugal',
        auth: 'open',
        test: () => probe(`https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/1081100.json`),
    },
    {
        id: 'ipma-observations',
        name: 'IPMA Observations',
        feeds: ['Station observations'],
        scope: 'portugal',
        auth: 'open',
        test: () => probe(`https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json`),
    },
    {
        id: 'ipma-drought',
        name: 'IPMA Drought Index',
        feeds: ['Drought monitoring'],
        scope: 'portugal',
        auth: 'open',
        test: () => probe(`https://api.ipma.pt/open-data/observation/climate/mpdsi/2/`),
    },
    {
        id: 'dgt',
        name: 'DGT Portugal (CAOP)',
        feeds: ['Admin boundaries', 'Parish/municipality lookup'],
        scope: 'portugal',
        auth: 'open',
        notes: 'Portugal-only; not used for non-PT properties',
        test: () => probe(`https://ogcapi.dgterritorio.gov.pt/collections/freguesias/items?bbox=-8.6404,37.5957,-8.6384,37.5977&limit=1&f=json`, {}, 15000),
    },
    {
        id: 'effis',
        name: 'EFFIS Fire Danger WMS',
        feeds: ['Fire danger map layer', 'Report'],
        scope: 'europe',
        auth: 'open',
        test: () => probe(`https://maps.effis.emergency.copernicus.eu/effisgis/wms?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'corine',
        name: 'CORINE Land Cover WMS',
        feeds: ['Land cover map layer', 'Report'],
        scope: 'europe',
        auth: 'open',
        test: () => probe(`https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'natura2000',
        name: 'Natura 2000 WMS',
        feeds: ['Protected areas map layer'],
        scope: 'europe',
        auth: 'open',
        test: () => probe(`https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'worldcover',
        name: 'ESA WorldCover WMS',
        feeds: ['WorldCover map layer'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://services.terrascope.be/wms/v2?SERVICE=WMS&REQUEST=GetCapabilities`),
    },
    {
        id: 'global-land-cover',
        name: 'Global Land Cover WMS (VITO)',
        feeds: ['Deprecated — use WorldCover'],
        scope: 'global',
        auth: 'open',
        notes: 'Retired — domain offline, replaced by ESA WorldCover',
        test: () => Promise.resolve({ ok: false, status: 0, ms: 0, error: 'Retired (domain offline)' }),
    },
    {
        id: 'sentinel2',
        name: 'Sentinel-2 Cloudless Tiles',
        feeds: ['Satellite basemap'],
        scope: 'global',
        auth: 'open',
        test: () => probe(`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/5/15/15.jpg`),
    },
    {
        id: 'nasa-firms',
        name: 'NASA FIRMS Active Fires',
        feeds: ['Active fire alerts', 'Dashboard'],
        scope: 'global',
        auth: 'api-key',
        needsKey: 'VITE_FIRMS_KEY',
        test: () => {
            const key = process.env.VITE_FIRMS_KEY;
            if (!key) return Promise.resolve({ ok: false, status: 0, ms: 0, error: 'No API key (VITE_FIRMS_KEY)' });
            return probe(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/-9,37,-8,38/1`);
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

function buildResult(entry, testResult) {
    return {
        id: entry.id,
        name: entry.name,
        feeds: entry.feeds,
        scope: entry.scope,
        auth: entry.auth,
        notes: entry.notes || null,
        needsKey: entry.needsKey || null,
        subQueries: entry.subQueries ? entry.subQueries.map(sq => sq.name) : null,
        ...testResult,
    };
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
        const result = buildResult(entry, await entry.test());

        // Persist single re-test
        try {
            const col = await getCollection('pipeline_results');
            await col.updateOne(
                { sourceId: result.id },
                { $set: { ...result, sourceId: result.id, testedAt: new Date().toISOString() } },
                { upsert: true },
            );
        } catch (err) {
            console.error('Pipeline persist error:', err);
        }

        return res.json(result);
    }

    // Test all — run in parallel
    const testedAt = new Date().toISOString();
    const results = await Promise.all(
        SOURCES.map(async (entry) => buildResult(entry, await entry.test()))
    );

    // Persist full run to DB
    try {
        const col = await getCollection('pipeline_results');
        const ops = results.map(r => ({
            updateOne: {
                filter: { sourceId: r.id },
                update: { $set: { ...r, sourceId: r.id, testedAt } },
                upsert: true,
            },
        }));
        await col.bulkWrite(ops);
    } catch (err) {
        console.error('Pipeline persist error:', err);
    }

    return res.json({ sources: results, testedAt });
}
