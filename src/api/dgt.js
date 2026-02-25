/**
 * DGT — Direcção-Geral do Território (Portugal)
 * OGC API for administrative boundaries (CAOP), land cover (COS), cadastral data.
 * Free, no key needed.
 * https://ogcapi.dgterritorio.gov.pt/
 */

const OGC_BASE = 'https://ogcapi.dgterritorio.gov.pt';

/**
 * Get the administrative unit (freguesia/municipality/district) for a coordinate.
 * Uses the CAOP (Carta Administrativa Oficial de Portugal) collection.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object|null>} Administrative info
 */
export async function getAdminUnit(lat, lng) {
    // Query CAOP freguesias (parishes) using point-in-polygon via bbox filter
    const delta = 0.001; // ~100m
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

    try {
        const res = await fetch(
            `${OGC_BASE}/collections/caop-freguesias/items?bbox=${bbox}&limit=1&f=json`
        );
        if (!res.ok) throw new Error(`DGT CAOP error: ${res.status}`);
        const data = await res.json();

        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties || {};
            return {
                parish: props.Freguesia || props.freguesia || props.DTMNFR || null,
                municipality: props.Municipio || props.municipio || props.Concelho || null,
                district: props.Distrito || props.distrito || null,
                dicofre: props.DICOFRE || props.dicofre || null,
                area: props.Area_Ha || null,
            };
        }
    } catch (err) {
        console.warn('DGT CAOP query failed:', err.message);
    }

    // Fallback: try the municipalities collection
    try {
        const delta2 = 0.01;
        const bbox2 = `${lng - delta2},${lat - delta2},${lng + delta2},${lat + delta2}`;
        const res = await fetch(
            `${OGC_BASE}/collections/caop-municipios/items?bbox=${bbox2}&limit=1&f=json`
        );
        if (!res.ok) return null;
        const data = await res.json();

        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties || {};
            return {
                parish: null,
                municipality: props.Municipio || props.municipio || props.Concelho || null,
                district: props.Distrito || props.distrito || null,
                dicofre: null,
                area: props.Area_Ha || null,
            };
        }
    } catch (err) {
        console.warn('DGT municipality query failed:', err.message);
    }

    return null;
}

/**
 * Get available DGT collections.
 */
export async function getCollections() {
    const res = await fetch(`${OGC_BASE}/collections?f=json`);
    if (!res.ok) throw new Error(`DGT collections error: ${res.status}`);
    return res.json();
}

/**
 * DGT COS (Carta de Uso e Ocupação do Solo) WMS for land use visualization.
 * 83 classes, 1 ha MMU, 1:25,000 scale.
 */
export const COS_WMS = 'https://geo2.dgterritorio.gov.pt/geoserver/COS2018/wms';

export function getCosWmsParams() {
    return {
        layers: 'COS2018_v2',
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        crs: 'EPSG:4326',
    };
}

/**
 * Format admin unit for display.
 */
export function formatAdminUnit(admin) {
    if (!admin) return null;
    const parts = [];
    if (admin.parish) parts.push(admin.parish);
    if (admin.municipality) parts.push(admin.municipality);
    if (admin.district) parts.push(admin.district);
    return {
        label: parts.join(', '),
        parish: admin.parish,
        municipality: admin.municipality,
        district: admin.district,
        country: 'Portugal',
    };
}
