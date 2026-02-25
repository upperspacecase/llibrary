/**
 * IPMA — Instituto Português do Mar e da Atmosfera
 * Official Portuguese weather/climate API. Free, no key needed.
 * https://api.ipma.pt/
 */

const BASE = 'https://api.ipma.pt/open-data';

// Global IDs for Odemira-area forecast locations
const LOCATION_IDS = {
    BEJA: 1020500, // Beja district (covers Odemira)
    ODEMIRA: 1081100, // Odemira city
};

/**
 * Get 5-day forecast for a location.
 * @param {number} globalIdLocal - IPMA location ID (default: Odemira)
 */
export async function getForecast(globalIdLocal = LOCATION_IDS.ODEMIRA) {
    const res = await fetch(`${BASE}/forecast/meteorology/cities/daily/${globalIdLocal}.json`);
    if (!res.ok) throw new Error(`IPMA forecast error: ${res.status}`);
    const data = await res.json();
    return data.data || [];
}

/**
 * Get current weather observations from all stations.
 */
export async function getStationObservations() {
    const res = await fetch(`${BASE}/observation/meteorology/stations/observations.json`);
    if (!res.ok) throw new Error(`IPMA observations error: ${res.status}`);
    return res.json();
}

/**
 * Get PDSI drought index for a district.
 * @param {number} districtId - IPMA district ID
 */
export async function getDroughtIndex(districtId = 2) {
    // District 2 = Beja (covers Odemira area)
    const res = await fetch(`${BASE}/observation/climate/mpdsi/${districtId}/`);
    if (!res.ok) throw new Error(`IPMA drought error: ${res.status}`);
    return res.json();
}

/**
 * Get list of forecast locations to find the nearest to coordinates.
 */
export async function getForecastLocations() {
    const res = await fetch(`${BASE}/forecast/meteorology/cities/daily/hp-daily-forecast-day0.json`);
    if (!res.ok) throw new Error(`IPMA locations error: ${res.status}`);
    return res.json();
}

/**
 * Find nearest IPMA forecast location to coordinates.
 */
export async function getNearestForecastLocation(lat, lng) {
    const data = await getForecastLocations();
    if (!data || !data.data) return null;

    let nearest = null;
    let minDist = Infinity;

    data.data.forEach(loc => {
        if (!loc.latitude || !loc.longitude) return;
        const d = Math.sqrt(
            Math.pow(lat - loc.latitude, 2) +
            Math.pow(lng - loc.longitude, 2)
        );
        if (d < minDist) {
            minDist = d;
            nearest = loc;
        }
    });

    return nearest;
}

/**
 * Weather type descriptions (IPMA weather type IDs).
 */
export const WEATHER_TYPES = {
    1: 'Clear sky',
    2: 'Partly cloudy',
    3: 'Overcast',
    4: 'Cloudy',
    5: 'Light rain',
    6: 'Rain',
    7: 'Light rain showers',
    8: 'Rain showers',
    9: 'Heavy rain',
    10: 'Light drizzle',
    11: 'Drizzle',
    12: 'Heavy drizzle',
    13: 'Intermittent rain',
    14: 'Intermittent heavy rain',
    15: 'Fog',
    16: 'Mist',
    17: 'Snow',
    18: 'Thunder',
    19: 'Hail',
    20: 'Frost',
    21: 'Rain and thunder',
    22: 'Haze',
    23: 'Sleet',
    24: 'Snow showers',
    25: 'Very hot',
    26: 'Extreme cold',
    27: 'Gusty winds',
};

/**
 * PDSI drought severity interpretation.
 */
export function interpretDrought(pdsi) {
    if (pdsi == null) return { level: 'Unknown', color: '#999' };
    if (pdsi >= 4) return { level: 'Extremely Wet', color: '#0000FF' };
    if (pdsi >= 3) return { level: 'Very Wet', color: '#3399FF' };
    if (pdsi >= 2) return { level: 'Moderately Wet', color: '#66CCFF' };
    if (pdsi >= 1) return { level: 'Slightly Wet', color: '#99FFCC' };
    if (pdsi >= -1) return { level: 'Normal', color: '#00CC00' };
    if (pdsi >= -2) return { level: 'Mild Drought', color: '#FFCC00' };
    if (pdsi >= -3) return { level: 'Moderate Drought', color: '#FF9900' };
    if (pdsi >= -4) return { level: 'Severe Drought', color: '#FF3300' };
    return { level: 'Extreme Drought', color: '#CC0000' };
}

export { LOCATION_IDS };
