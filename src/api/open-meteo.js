/**
 * Open-Meteo — Weather, Climate, Elevation, Climate Projections
 * Free, no API key needed. Very generous rate limits.
 * https://open-meteo.com/en/docs
 */

import { fetchWithPolicy } from '../lib/fetch-policy.js';

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const ELEVATION_BASE = 'https://api.open-meteo.com/v1/elevation';
const CLIMATE_BASE = 'https://climate-api.open-meteo.com/v1/climate';

// Open-Meteo archive (archive-api.open-meteo.com) shares a rate-limit bucket
// across all requests from the same IP. Firing climate / climateTrends /
// solarWind / getRegionalClimateAverages in parallel triggers 429s.
// Serialise archive calls with a small spacer; forecast/elevation/climate
// projection endpoints are on different buckets and don't go through this.
// 1500ms matches the Overpass spacer; conservative against per-second
// rate limits. 3 archive calls per landbook refresh = ~3s queue depth.
const ARCHIVE_DELAY_MS = 1500;
let _archiveQueue = Promise.resolve();

function enqueueArchive(fn) {
  const task = _archiveQueue.catch(() => {}).then(() => fn());
  _archiveQueue = task
    .catch(() => {})
    .then(() => new Promise((r) => setTimeout(r, ARCHIVE_DELAY_MS)));
  return task;
}

export async function getForecast(lat, lng, days = 7) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'wind_speed_10m_max',
      'weathercode', 'sunrise', 'sunset',
      'uv_index_max', 'et0_fao_evapotranspiration',
      'sunshine_duration',
    ].join(','),
    current: [
      'temperature_2m', 'relative_humidity_2m',
      'wind_speed_10m', 'weathercode',
    ].join(','),
    hourly: [
      'soil_moisture_0_to_7cm', 'soil_moisture_7_to_28cm',
      'soil_moisture_28_to_100cm', 'soil_moisture_100_to_255cm',
    ].join(','),
    timezone: 'auto',
    forecast_days: String(days),
  });
  const res = await fetchWithPolicy(`${FORECAST_BASE}?${params}`, {}, {
    source: 'open-meteo-forecast', timeoutMs: 8000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Open-Meteo forecast error: ${res.status}`);
  return res.json();
}

export async function getHistoricalWeather(lat, lng, startDate, endDate) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: startDate,
    end_date: endDate,
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
  });
  const res = await enqueueArchive(() => fetchWithPolicy(`${ARCHIVE_BASE}?${params}`, {}, {
    source: 'open-meteo-archive', timeoutMs: 30000, accept: 'application/json',
  }));
  if (!res.ok) throw new Error(`Open-Meteo archive error: ${res.status}`);
  return res.json();
}

export async function getClimateAverages(lat, lng) {
  const endYear = new Date().getFullYear() - 1;
  const startYear = endYear - 29;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: `${startYear}-01-01`,
    end_date: `${endYear}-12-31`,
    daily: [
      'temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
      'sunshine_duration', 'et0_fao_evapotranspiration', 'wind_speed_10m_max',
    ].join(','),
    timezone: 'auto',
  });
  const res = await enqueueArchive(() => fetchWithPolicy(`${ARCHIVE_BASE}?${params}`, {}, {
    source: 'open-meteo-climate', timeoutMs: 20000, accept: 'application/json',
  }));
  if (!res.ok) throw new Error(`Open-Meteo climate error: ${res.status}`);
  const data = await res.json();

  // Compute monthly averages from 30 years of data
  if (!data.daily) throw new Error('Open-Meteo climate: response missing daily data');
  const months = Array.from({ length: 12 }, () => ({
    maxTemps: [], minTemps: [], precip: [], sunshine: [], et0: [], wind: [],
  }));
  data.daily.time.forEach((dateStr, i) => {
    const m = new Date(dateStr).getMonth();
    if (data.daily.temperature_2m_max[i] != null) months[m].maxTemps.push(data.daily.temperature_2m_max[i]);
    if (data.daily.temperature_2m_min[i] != null) months[m].minTemps.push(data.daily.temperature_2m_min[i]);
    if (data.daily.precipitation_sum[i] != null) months[m].precip.push(data.daily.precipitation_sum[i]);
    if (data.daily.sunshine_duration?.[i] != null) months[m].sunshine.push(data.daily.sunshine_duration[i]);
    if (data.daily.et0_fao_evapotranspiration?.[i] != null) months[m].et0.push(data.daily.et0_fao_evapotranspiration[i]);
    if (data.daily.wind_speed_10m_max?.[i] != null) months[m].wind.push(data.daily.wind_speed_10m_max[i]);
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sum = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : null;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return months.map((m, i) => ({
    month: monthNames[i],
    avgHigh: avg(m.maxTemps),
    avgLow: avg(m.minTemps),
    totalPrecip: sum(m.precip) / 30,
    avgSunshine: avg(m.sunshine) != null ? avg(m.sunshine) / 3600 : null, // seconds → hours
    avgET0: avg(m.et0),
    totalET0: sum(m.et0) != null ? sum(m.et0) / 30 : null,
    avgWind: avg(m.wind),
  }));
}

export async function getRegionalClimateAverages(lat, lng, radiusKm = 25) {
  const offset = radiusKm / 111; // approx degrees per km
  const points = [
    [lat + offset, lng],
    [lat - offset, lng],
    [lat, lng + offset],
    [lat, lng - offset],
  ];
  const results = await Promise.allSettled(
    points.map(([la, lo]) => getClimateAverages(la, lo))
  );

  const valid = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  if (valid.length === 0) return null;

  // Average across all valid points
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames.map((name, i) => {
    const vals = valid.map(v => v[i]).filter(Boolean);
    const avgField = (field) => {
      const nums = vals.map(v => v[field]).filter(v => v != null);
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    };
    return {
      month: name,
      avgHigh: avgField('avgHigh'),
      avgLow: avgField('avgLow'),
      totalPrecip: avgField('totalPrecip'),
      avgSunshine: avgField('avgSunshine'),
      avgET0: avgField('avgET0'),
      totalET0: avgField('totalET0'),
      avgWind: avgField('avgWind'),
    };
  });
}

export async function getClimateProjections(lat, lng) {
  const models = ['CMCC_CM2_SR5', 'MRI_ESM2_0', 'EC_Earth3P_HR'];
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: '2040-01-01',
    end_date: '2060-12-31',
    models: models.join(','),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  });
  const res = await fetchWithPolicy(`${CLIMATE_BASE}?${params}`, {}, {
    source: 'open-meteo-projections', timeoutMs: 30000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Open-Meteo climate projection error: ${res.status}`);
  const data = await res.json();

  // The API may return data per-model or aggregated — handle both cases
  // Each model's data is under data.daily (single model) or we iterate models
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const allMonthly = [];

  // Try per-model keys first, fall back to flat daily
  const modelSources = [];
  for (const model of models) {
    const key = model.toLowerCase();
    if (data[key]?.daily) {
      modelSources.push(data[key].daily);
    }
  }
  if (modelSources.length === 0 && data.daily) {
    modelSources.push(data.daily);
  }

  for (const daily of modelSources) {
    if (!daily.time) continue;
    const months = Array.from({ length: 12 }, () => ({
      maxTemps: [], minTemps: [], precip: [],
    }));
    daily.time.forEach((dateStr, i) => {
      const m = new Date(dateStr).getMonth();
      if (daily.temperature_2m_max?.[i] != null) months[m].maxTemps.push(daily.temperature_2m_max[i]);
      if (daily.temperature_2m_min?.[i] != null) months[m].minTemps.push(daily.temperature_2m_min[i]);
      if (daily.precipitation_sum?.[i] != null) months[m].precip.push(daily.precipitation_sum[i]);
    });
    allMonthly.push(months);
  }

  if (allMonthly.length === 0) return null;

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sum = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : null;

  return monthNames.map((name, i) => {
    const highs = allMonthly.map(m => avg(m[i].maxTemps)).filter(v => v != null);
    const lows = allMonthly.map(m => avg(m[i].minTemps)).filter(v => v != null);
    const precips = allMonthly.map(m => sum(m[i].precip) / 20).filter(v => v != null); // 20 years
    return {
      month: name,
      projHigh: highs.length ? highs.reduce((a, b) => a + b, 0) / highs.length : null,
      projLow: lows.length ? lows.reduce((a, b) => a + b, 0) / lows.length : null,
      projPrecip: precips.length ? precips.reduce((a, b) => a + b, 0) / precips.length : null,
    };
  });
}

export function processSoilMoisture(forecastData) {
  if (!forecastData || !forecastData.hourly) return null;
  const h = forecastData.hourly;
  const depths = ['soil_moisture_0_to_7cm', 'soil_moisture_7_to_28cm', 'soil_moisture_28_to_100cm', 'soil_moisture_100_to_255cm'];
  const depthKeys = ['depth0_7', 'depth7_28', 'depth28_100', 'depth100_255'];

  // Get latest non-null value for each depth
  const current = {};
  depthKeys.forEach((key, di) => {
    const arr = h[depths[di]] || [];
    let latest = null;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] != null) { latest = arr[i]; break; }
    }
    current[key] = latest;
  });

  // Daily averages for trend
  const times = h.time || [];
  const dailyMap = {};
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = [];
    const val = h[depths[0]]?.[i]; // use surface layer for trend
    if (val != null) dailyMap[day].push(val);
  });
  const daily = Object.entries(dailyMap).map(([date, vals]) => ({
    date,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));

  return { current, daily };
}

/**
 * Fetch annual solar irradiance and wind speed from historical archive.
 * Returns averages over the most recent full calendar year.
 */
export async function getSolarWind(lat, lng) {
  const lastYear = new Date().getFullYear() - 1;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    start_date: `${lastYear}-01-01`,
    end_date: `${lastYear}-12-31`,
    daily: 'shortwave_radiation_sum,wind_speed_10m_mean,wind_speed_10m_max,wind_speed_100m_mean',
    timezone: 'auto',
  });
  const res = await enqueueArchive(() => fetchWithPolicy(`${ARCHIVE_BASE}?${params}`, {}, {
    source: 'open-meteo-solar-wind', timeoutMs: 20000, accept: 'application/json',
  }));
  if (!res.ok) throw new Error(`Open-Meteo solar/wind error: ${res.status}`);
  const data = await res.json();
  const daily = data.daily || {};
  const rad = (daily.shortwave_radiation_sum || []).filter(v => v != null);
  const wind = (daily.wind_speed_10m_mean || []).filter(v => v != null);
  const windMax = (daily.wind_speed_10m_max || []).filter(v => v != null);
  const wind100 = (daily.wind_speed_100m_mean || []).filter(v => v != null);
  const meanOf = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const radDailyMJ = meanOf(rad);

  // Convert daily mean MJ/m² → annual kWh/m² (1 MJ = 0.2778 kWh, × 365 days)
  const annualKWh = radDailyMJ != null ? Math.round(radDailyMJ * 0.2778 * 365) : null;
  // Convert km/h @ 100m → m/s
  const windMs100 = wind100.length ? +(meanOf(wind100) / 3.6).toFixed(1) : null;

  return {
    solarIrradianceMJ: radDailyMJ != null ? +radDailyMJ.toFixed(1) : null,
    solarAnnualKWhPerM2: annualKWh,
    windSpeedMean: wind.length ? +meanOf(wind).toFixed(1) : null,
    windSpeedMax: windMax.length ? +meanOf(windMax).toFixed(1) : null,
    windSpeedMs100m: windMs100,
    year: lastYear,
  };
}

export async function getElevation(lat, lng) {
  const res = await fetchWithPolicy(`${ELEVATION_BASE}?latitude=${lat}&longitude=${lng}`, {}, {
    source: 'open-meteo-elevation', timeoutMs: 5000, accept: 'application/json',
  });
  if (!res.ok) throw new Error(`Open-Meteo elevation error: ${res.status}`);
  const data = await res.json();
  return data.elevation ? data.elevation[0] : null;
}

export function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  };
  return descriptions[code] || 'Unknown';
}

export function estimateFrostDates(monthlyAverages) {
  if (!monthlyAverages) return null;
  let lastFrost = null;
  let firstFrost = null;
  for (let i = 0; i < 12; i++) {
    if (monthlyAverages[i].avgLow != null && monthlyAverages[i].avgLow <= 0) {
      if (i < 6) lastFrost = monthlyAverages[i].month;
      if (i >= 6 && !firstFrost) firstFrost = monthlyAverages[i].month;
    }
  }
  return { lastFrost, firstFrost };
}
