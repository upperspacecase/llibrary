/**
 * Open-Meteo Flood API — GloFAS River Discharge Forecasts
 * Free, no API key for non-commercial use.
 * https://open-meteo.com/en/docs/flood-api
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

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

    const res = await fetchWithPolicy(`${BASE}?${params}`, {}, {
        source: 'open-meteo-flood', timeoutMs: 8000, accept: 'application/json',
    });
    if (!res.ok) throw new Error(`Flood API error: ${res.status}`);
    return res.json();
}

/**
 * Get historical river discharge (past 210 days + 30-day forecast).
 */
export async function getFloodForecastWithHistory(lat, lng) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'river_discharge',
        past_days: '210',
        forecast_days: '30',
    });

    const res = await fetchWithPolicy(`${BASE}?${params}`, {}, {
        source: 'open-meteo-flood', timeoutMs: 8000, accept: 'application/json',
    });
    if (!res.ok) throw new Error(`Flood API error: ${res.status}`);
    return res.json();
}

/**
 * Sample GloFAS discharge at multiple basin stations and return the strongest
 * (highest mean-flow) signal as the basin reading. The Open-Meteo flood API
 * snaps to its ~10 km cell, so a centroid sample on farmland between rivers
 * reads 0 m³/s even when the basin's mainstem is active downstream. Picking
 * the station with the highest mean discharge surfaces the actual hydrologic
 * signal for the region.
 *
 * @param {{name: string, lat: number, lng: number}[]} stations
 * @returns {Promise<null | {basin: object, stations: object[]}>}
 */
export async function getFloodBasin(stations) {
    if (!Array.isArray(stations) || !stations.length) return null;
    const settled = await Promise.allSettled(
        stations.map(s => getFloodForecastWithHistory(s.lat, s.lng))
    );
    const readings = [];
    for (let i = 0; i < settled.length; i++) {
        if (settled[i].status !== 'fulfilled') continue;
        const a = analyzeFloodRisk(settled[i].value);
        if (a.current == null) continue;
        readings.push({
            name: stations[i].name,
            lat: stations[i].lat,
            lng: stations[i].lng,
            current: parseFloat(a.current),
            average: parseFloat(a.average),
            max: parseFloat(a.max),
            anomalyPct: a.anomalyPct,
            level: a.level,
        });
    }
    if (!readings.length) return null;
    // Highest mean-flow station — the mainstem signal for the basin.
    const ranked = readings.slice().sort((a, b) => b.average - a.average);
    return { basin: ranked[0], stations: readings };
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

    // Anomaly vs the trailing window's mean. The flood API returns ~8 months
    // of past discharge, so this is "vs trailing 8mo mean" rather than a 50-yr
    // climatology — honest about what we have.
    const anomalyPct = avg > 0 ? Math.round((current / avg - 1) * 100) : null;

    return {
        level,
        color,
        current: current.toFixed(1),
        average: avg.toFixed(1),
        max: max.toFixed(1),
        ratio: ratio.toFixed(2),
        anomalyPct,
        discharge: discharges,
        dates: data.daily.time,
    };
}
