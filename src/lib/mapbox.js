/**
 * Shared MapBox GL JS helpers.
 * Centralises token config, map creation, and common layer operations
 * so all pages use a consistent setup.
 */

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set access token once
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Re-export for pages that need direct access
export { mapboxgl };

// ---- Map creation ----

/**
 * Create a MapBox GL map in the given container.
 * @param {string} containerId - DOM element ID
 * @param {object} opts
 * @param {[number, number]} opts.center - [lng, lat] (MapBox uses lng,lat order)
 * @param {number} opts.zoom - initial zoom level
 * @param {string} opts.style - map style URL
 * @param {boolean} opts.satellite - use satellite style instead of streets
 * @param {boolean} opts.scrollZoom - enable scroll zoom (default true)
 * @returns {mapboxgl.Map}
 */
export function createMap(containerId, opts = {}) {
    const {
        center = [-8.6400, 37.5967], // Odemira default [lng, lat]
        zoom = 10,
        style = null,
        satellite = false,
        scrollZoom = true,
    } = opts;

    const mapStyle = style
        || (satellite
            ? 'mapbox://styles/mapbox/satellite-streets-v12'
            : 'mapbox://styles/mapbox/outdoors-v12');

    const map = new mapboxgl.Map({
        container: containerId,
        style: mapStyle,
        center,
        zoom,
        scrollZoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return map;
}

// ---- Marker helpers ----

/**
 * Add a simple marker to the map.
 * @param {mapboxgl.Map} map
 * @param {[number, number]} lngLat - [lng, lat]
 * @param {object} opts
 * @param {string} opts.color - marker color
 * @param {boolean} opts.draggable
 * @param {string} opts.popupHtml - HTML for popup
 * @returns {mapboxgl.Marker}
 */
export function addMarker(map, lngLat, opts = {}) {
    const { color = '#2d6a4f', draggable = false, popupHtml = null } = opts;

    const marker = new mapboxgl.Marker({ color, draggable })
        .setLngLat(lngLat)
        .addTo(map);

    if (popupHtml) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);
        marker.setPopup(popup);
    }

    return marker;
}

// ---- GeoJSON source/layer helpers ----

let _sourceCounter = 0;
function uniqueId(prefix) {
    return `${prefix}-${++_sourceCounter}`;
}

/**
 * Add or update a GeoJSON source on the map.
 * @param {mapboxgl.Map} map
 * @param {string} sourceId
 * @param {object} geojson - valid GeoJSON
 */
export function setGeoJSONSource(map, sourceId, geojson) {
    const existing = map.getSource(sourceId);
    if (existing) {
        existing.setData(geojson);
    } else {
        map.addSource(sourceId, { type: 'geojson', data: geojson });
    }
}

/**
 * Add a polygon (fill + outline) from an array of [lat, lng] points.
 * @param {mapboxgl.Map} map
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @param {object} opts
 * @param {string} opts.sourceId
 * @param {string} opts.fillColor
 * @param {number} opts.fillOpacity
 * @param {string} opts.lineColor
 * @param {number} opts.lineWidth
 * @returns {{ sourceId: string, fillLayerId: string, lineLayerId: string }}
 */
export function addPolygon(map, coords, opts = {}) {
    const {
        sourceId = uniqueId('polygon'),
        fillColor = '#52b788',
        fillOpacity = 0.3,
        lineColor = '#2d6a4f',
        lineWidth = 2,
    } = opts;

    // Convert [lat, lng] to GeoJSON [lng, lat] ring
    const ring = coords.map(([lat, lng]) => [lng, lat]);
    // Close the ring if not already closed
    if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
        ring.push([...ring[0]]);
    }

    const geojson = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {},
    };

    setGeoJSONSource(map, sourceId, geojson);

    const fillLayerId = `${sourceId}-fill`;
    const lineLayerId = `${sourceId}-line`;

    if (!map.getLayer(fillLayerId)) {
        map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: sourceId,
            paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity },
        });
    }

    if (!map.getLayer(lineLayerId)) {
        map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: { 'line-color': lineColor, 'line-width': lineWidth },
        });
    }

    return { sourceId, fillLayerId, lineLayerId };
}

/**
 * Add a polyline from an array of [lat, lng] points.
 */
export function addPolyline(map, coords, opts = {}) {
    const {
        sourceId = uniqueId('line'),
        color = '#2d6a4f',
        width = 2,
        dasharray = null,
    } = opts;

    const lineCoords = coords.map(([lat, lng]) => [lng, lat]);

    const geojson = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: lineCoords },
        properties: {},
    };

    setGeoJSONSource(map, sourceId, geojson);

    const layerId = `${sourceId}-layer`;
    if (!map.getLayer(layerId)) {
        const paint = { 'line-color': color, 'line-width': width };
        if (dasharray) paint['line-dasharray'] = dasharray;
        map.addLayer({ id: layerId, type: 'line', source: sourceId, paint });
    }

    return { sourceId, layerId };
}

/**
 * Add circle markers from an array of point objects.
 * @param {mapboxgl.Map} map
 * @param {Array<{coords: [number, number], color?: string, popup?: string}>} points
 *   coords are [lat, lng]
 * @param {object} opts
 * @returns {{ sourceId: string, layerId: string }}
 */
export function addCirclePoints(map, points, opts = {}) {
    const {
        sourceId = uniqueId('circles'),
        color = '#52b788',
        radius = 6,
        strokeColor = '#2d6a4f',
        strokeWidth = 2,
    } = opts;

    const geojson = {
        type: 'FeatureCollection',
        features: points.map((pt, idx) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [pt.coords[1], pt.coords[0]], // [lng, lat]
            },
            properties: { idx, popup: pt.popup || '', color: pt.color || color },
        })),
    };

    setGeoJSONSource(map, sourceId, geojson);

    const layerId = `${sourceId}-layer`;
    if (!map.getLayer(layerId)) {
        map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
                'circle-radius': radius,
                'circle-color': ['get', 'color'],
                'circle-stroke-color': strokeColor,
                'circle-stroke-width': strokeWidth,
            },
        });
    }

    return { sourceId, layerId };
}

// ---- WMS raster layer helper ----

/**
 * Add a WMS tile layer as a raster source.
 * @param {mapboxgl.Map} map
 * @param {string} wmsUrl - base WMS URL
 * @param {object} wmsParams - WMS query parameters (layers, styles, format, etc.)
 * @param {object} opts
 * @returns {{ sourceId: string, layerId: string }}
 */
export function addWmsLayer(map, wmsUrl, wmsParams, opts = {}) {
    const {
        sourceId = uniqueId('wms'),
        opacity = 0.5,
        visible = false,
    } = opts;

    // Build WMS tile URL template
    const params = new URLSearchParams({
        service: 'WMS',
        request: 'GetMap',
        version: '1.1.1',
        format: wmsParams.format || 'image/png',
        transparent: 'true',
        srs: 'EPSG:3857',
        width: '256',
        height: '256',
        bbox: '{bbox-epsg-3857}',
        ...wmsParams,
    });

    const tileUrl = `${wmsUrl}?${params.toString()}`;

    if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
        });
    }

    const layerId = `${sourceId}-layer`;
    if (!map.getLayer(layerId)) {
        map.addLayer({
            id: layerId,
            type: 'raster',
            source: sourceId,
            paint: { 'raster-opacity': opacity },
            layout: { visibility: visible ? 'visible' : 'none' },
        });
    }

    return { sourceId, layerId };
}

// ---- Utility ----

/**
 * Fit the map to a bounding box from [lat, lng] points.
 * @param {mapboxgl.Map} map
 * @param {Array<[number, number]>} coords - Array of [lat, lng] pairs
 * @param {object} opts - padding options
 */
export function fitToCoords(map, coords, opts = {}) {
    const { padding = 40 } = opts;
    if (!coords || coords.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(([lat, lng]) => bounds.extend([lng, lat]));
    map.fitBounds(bounds, { padding });
}

/**
 * Convert [lat, lng] to MapBox [lng, lat] format.
 */
export function toLngLat(latLng) {
    return [latLng[1], latLng[0]];
}

/**
 * Convert MapBox [lng, lat] or LngLat to [lat, lng].
 */
export function toLatLng(lngLat) {
    if (lngLat.lat !== undefined) return [lngLat.lat, lngLat.lng];
    return [lngLat[1], lngLat[0]];
}

/**
 * Remove a source and its layers from the map.
 */
export function removeSourceAndLayers(map, sourceId) {
    // Remove all layers that use this source
    const style = map.getStyle();
    if (style && style.layers) {
        style.layers.forEach(layer => {
            if (layer.source === sourceId) {
                map.removeLayer(layer.id);
            }
        });
    }
    if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
    }
}
