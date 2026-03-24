/**
 * risk-scores.js — Compute live risk scores from Open-Meteo weather data.
 *
 * Returns scores for Fire, Drought, and Flood (0–100).
 * Erosion is kept static (not yet backed by a live API).
 */

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';

/**
 * Fetch live risk scores for a given location.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{fire: number, drought: number, flood: number, fireLabel: string, droughtLabel: string, floodLabel: string}>}
 */
export async function fetchRiskScores(lat, lng) {
    // 1) Fetch current + past 90 days + 7-day forecast in one call
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'temperature_2m_max,precipitation_sum,wind_speed_10m_max',
        past_days: '90',
        forecast_days: '7',
        timezone: 'auto',
    });

    const res = await fetch(`${FORECAST_BASE}?${params}`);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();

    const daily = data.daily;
    const totalDays = daily.time.length;
    const forecastStart = totalDays - 7;

    // --- Fire Risk ---
    // Based on existing estimateFireRisk logic: temp, recent precip, season, location
    const recentTemps = daily.temperature_2m_max.slice(forecastStart - 7, forecastStart);
    const recentPrecip = daily.precipitation_sum.slice(forecastStart - 7, forecastStart);
    const maxTemp = Math.max(...recentTemps.filter(v => v != null));
    const totalRecentPrecip = recentPrecip.filter(v => v != null).reduce((a, b) => a + b, 0);
    const month = new Date().getMonth(); // 0-indexed

    let fireRaw = 0;
    // Mediterranean location bonus
    if (lat >= 35 && lat <= 45 && lng >= -10 && lng <= 35) fireRaw += 2;
    // Temperature
    if (maxTemp > 40) fireRaw += 4;
    else if (maxTemp > 35) fireRaw += 3;
    else if (maxTemp > 30) fireRaw += 2;
    else if (maxTemp > 25) fireRaw += 1;
    // Precipitation (last 7 days)
    if (totalRecentPrecip < 1) fireRaw += 3;
    else if (totalRecentPrecip < 5) fireRaw += 2;
    else if (totalRecentPrecip < 15) fireRaw += 1;
    // Season (June–September = peak)
    if (month >= 5 && month <= 8) fireRaw += 3;
    else if (month >= 4 && month <= 9) fireRaw += 1;
    // Wind
    const maxWind = Math.max(...daily.wind_speed_10m_max.slice(forecastStart - 7, forecastStart).filter(v => v != null));
    if (maxWind > 40) fireRaw += 2;
    else if (maxWind > 25) fireRaw += 1;

    const fire = Math.min(100, Math.round((fireRaw / 15) * 100));

    // --- Drought Risk ---
    // Compare recent 90-day precipitation to expected seasonal average
    const past90Precip = daily.precipitation_sum.slice(0, forecastStart);
    const actual90 = past90Precip.filter(v => v != null).reduce((a, b) => a + b, 0);

    // Odemira historical: ~600mm/year, with strong seasonal variation
    // Monthly averages (mm): Jan:80, Feb:65, Mar:50, Apr:55, May:30, Jun:8, Jul:2, Aug:3, Sep:20, Oct:60, Nov:90, Dec:95
    const monthlyExpected = [80, 65, 50, 55, 30, 8, 2, 3, 20, 60, 90, 95];
    // Sum expected precipitation for the past 3 months
    let expected90 = 0;
    for (let i = 0; i < 3; i++) {
        const m = (month - i + 12) % 12;
        expected90 += monthlyExpected[m];
    }
    // Avoid division by zero for dry summer months
    expected90 = Math.max(expected90, 15);

    const ratio = actual90 / expected90;
    // ratio < 0.3 = extreme drought (100), ratio > 1.5 = no drought (0)
    const drought = Math.min(100, Math.max(0, Math.round((1 - Math.min(ratio, 1.5) / 1.5) * 100)));

    // --- Flood Risk ---
    // Based on 7-day precipitation forecast + recent saturation
    const forecastPrecip = daily.precipitation_sum.slice(forecastStart);
    const maxDailyForecast = Math.max(...forecastPrecip.filter(v => v != null));
    const totalForecast7d = forecastPrecip.filter(v => v != null).reduce((a, b) => a + b, 0);
    // Check soil saturation: recent 14-day precip
    const recent14Precip = daily.precipitation_sum.slice(forecastStart - 14, forecastStart)
        .filter(v => v != null).reduce((a, b) => a + b, 0);

    let floodRaw = 0;
    // Heavy single-day rainfall
    if (maxDailyForecast > 50) floodRaw += 4;
    else if (maxDailyForecast > 30) floodRaw += 3;
    else if (maxDailyForecast > 15) floodRaw += 2;
    else if (maxDailyForecast > 5) floodRaw += 1;
    // Sustained rainfall over forecast period
    if (totalForecast7d > 100) floodRaw += 3;
    else if (totalForecast7d > 50) floodRaw += 2;
    else if (totalForecast7d > 20) floodRaw += 1;
    // Soil saturation from recent rain
    if (recent14Precip > 100) floodRaw += 3;
    else if (recent14Precip > 50) floodRaw += 2;
    else if (recent14Precip > 20) floodRaw += 1;

    const flood = Math.min(100, Math.round((floodRaw / 10) * 100));

    return {
        fire,
        drought,
        flood,
        fireLabel: scoreToLabel(fire),
        droughtLabel: scoreToLabel(drought),
        floodLabel: scoreToLabel(flood),
    };
}

/**
 * Convert a 0–100 score to a human-readable label.
 */
function scoreToLabel(score) {
    if (score >= 80) return 'Extreme';
    if (score >= 60) return 'Severe';
    if (score >= 40) return 'High';
    if (score >= 20) return 'Moderate';
    if (score >= 10) return 'Low';
    return 'Very Low';
}

/**
 * Map a score to appropriate colors for the alert row.
 */
export function scoreToColors(score) {
    if (score >= 60) return { bgColor: '#fef2f2', textColor: '#dc2626', iconColor: '#dc2626' };
    if (score >= 40) return { bgColor: '#fff7ed', textColor: '#ea580c', iconColor: '#ea580c' };
    if (score >= 20) return { bgColor: '#fffbeb', textColor: '#d97706', iconColor: '#d97706' };
    return { bgColor: '#f0fdf4', textColor: '#16a34a', iconColor: '#16a34a' };
}
