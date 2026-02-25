/**
 * Open-Meteo Flood API — GloFAS River Discharge Forecasts
 * Free, no API key for non-commercial use.
 * https://open-meteo.com/en/docs/flood-api
 */

const BASE = 'https://flood-api.open-meteo.com/v1/flood';

/**
 * Get river discharge forecast for a location.
 * Returns daily river discharge (m³/s) for the nearest GloFAS grid cell.
 * @param {number} lat
 * @param {number} lng
 * @param {number} forecastDays - 1 to 210 days
 */
export async function getFloodForecast(lat, lng, forecastDays = 30) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'river_discharge',
        forecast_days: String(forecastDays),
    });

    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) throw new Error(`Flood API error: ${res.status}`);
    return res.json();
}

/**
 * Get historical river discharge (past 30 days + forecast).
 */
export async function getFloodForecastWithHistory(lat, lng) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'river_discharge',
        past_days: '30',
        forecast_days: '30',
    });

    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) throw new Error(`Flood API error: ${res.status}`);
    return res.json();
}

/**
 * Analyze flood risk from discharge data.
 * Compares current discharge against recent averages.
 */
export function analyzeFloodRisk(data) {
    if (!data || !data.daily || !data.daily.river_discharge) {
        return { level: 'Unknown', color: '#999', discharge: null };
    }

    const discharges = data.daily.river_discharge.filter(v => v != null);
    if (discharges.length === 0) {
        return { level: 'No Data', color: '#999', discharge: null };
    }

    const current = discharges[discharges.length - 1];
    const avg = discharges.reduce((a, b) => a + b, 0) / discharges.length;
    const max = Math.max(...discharges);
    const ratio = avg > 0 ? current / avg : 0;

    let level, color;
    if (ratio > 3) { level = 'High'; color = '#CC0000'; }
    else if (ratio > 2) { level = 'Elevated'; color = '#FF6600'; }
    else if (ratio > 1.5) { level = 'Above Normal'; color = '#FFCC00'; }
    else if (ratio > 0.5) { level = 'Normal'; color = '#00CC00'; }
    else { level = 'Low Flow'; color = '#6699CC'; }

    return {
        level,
        color,
        current: current.toFixed(1),
        average: avg.toFixed(1),
        max: max.toFixed(1),
        ratio: ratio.toFixed(2),
        discharge: discharges,
        dates: data.daily.time,
    };
}
