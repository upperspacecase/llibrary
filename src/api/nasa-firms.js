/**
 * NASA FIRMS — Active Fire Detections
 * Free with MAP_KEY registration. VIIRS 375m, ~3hr NRT.
 * https://firms.modaps.eosdis.nasa.gov/api/
 *
 * Note: For now we use the open CSV endpoint which doesn't need a key
 * for small area queries. For production, register for a MAP_KEY.
 */

const BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

/**
 * Get active fires within a bounding box for the last N days.
 * Uses the VIIRS SNPP sensor (375m resolution, from 2012).
 * @param {number[]} bbox - [south, west, north, east]
 * @param {number} days - Number of days to look back (1-10)
 * @returns {Promise<Object[]>} Array of fire detections
 */
export async function getActiveFires(bbox, days = 2) {
    const [south, west, north, east] = bbox;
    // Use the open NRT endpoint (no key, limited to recent data)
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/VIIRS_SNPP_NRT/${west},${south},${east},${north}/${days}`;

    const res = await fetch(url);
    if (!res.ok) {
        // Fallback: FIRMS may require MAP_KEY — return empty
        console.warn(`NASA FIRMS returned ${res.status}. Register for MAP_KEY for production use.`);
        return [];
    }

    const text = await res.text();
    return parseFiresCsv(text);
}

/**
 * Get active fires near a point.
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {number} days
 */
export async function getActiveFiresNearby(lat, lng, radiusKm = 25, days = 2) {
    const degOffset = radiusKm / 111;
    const lngOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
    const bbox = [
        lat - degOffset,
        lng - lngOffset,
        lat + degOffset,
        lng + lngOffset,
    ];
    return getActiveFires(bbox, days);
}

/**
 * Parse FIRMS CSV response into objects.
 */
function parseFiresCsv(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]?.trim(); });
        return {
            lat: parseFloat(obj.latitude),
            lng: parseFloat(obj.longitude),
            brightness: parseFloat(obj.bright_ti4 || obj.brightness),
            confidence: obj.confidence,
            frp: parseFloat(obj.frp), // Fire Radiative Power (MW)
            date: obj.acq_date,
            time: obj.acq_time,
            satellite: obj.satellite || 'VIIRS',
            dayNight: obj.daynight,
        };
    }).filter(f => !isNaN(f.lat) && !isNaN(f.lng));
}

/**
 * Summarize fire detections for display.
 */
export function summarizeFireDetections(fires) {
    if (!fires || fires.length === 0) {
        return { count: 0, nearest: null, maxBrightness: null, summary: 'No active fires detected nearby.' };
    }

    const maxFrp = Math.max(...fires.map(f => f.frp || 0));
    const maxBrightness = Math.max(...fires.map(f => f.brightness || 0));
    const dates = [...new Set(fires.map(f => f.date))].sort();

    return {
        count: fires.length,
        maxFrp: maxFrp.toFixed(1),
        maxBrightness: maxBrightness.toFixed(0),
        dates,
        highConfidence: fires.filter(f => f.confidence === 'high' || f.confidence === 'h').length,
        summary: `${fires.length} fire detection${fires.length > 1 ? 's' : ''} in the last 48 hours.`,
    };
}
