/**
 * Open-Meteo — Weather, Climate, Elevation
 * Free, no API key needed. Very generous rate limits.
 * https://open-meteo.com/en/docs
 */

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive';
const ELEVATION_BASE = 'https://api.open-meteo.com/v1/elevation';

export async function getForecast(lat, lng, days = 7) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: [
      'temperature_2m_max', 'temperature_2m_min',
      'precipitation_sum', 'wind_speed_10m_max',
      'weathercode', 'sunrise', 'sunset',
      'uv_index_max', 'et0_fao_evapotranspiration',
    ].join(','),
    current: [
      'temperature_2m', 'relative_humidity_2m',
      'wind_speed_10m', 'weathercode',
    ].join(','),
    timezone: 'auto',
    forecast_days: String(days),
  });
  const res = await fetch(`${FORECAST_BASE}?${params}`);
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
  const res = await fetch(`${ARCHIVE_BASE}?${params}`);
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
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
  });
  const res = await fetch(`${ARCHIVE_BASE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo climate error: ${res.status}`);
  const data = await res.json();

  // Compute monthly averages from 30 years of data
  if (!data.daily) return null;
  const months = Array.from({ length: 12 }, () => ({
    maxTemps: [], minTemps: [], precip: [],
  }));
  data.daily.time.forEach((dateStr, i) => {
    const m = new Date(dateStr).getMonth();
    if (data.daily.temperature_2m_max[i] != null) months[m].maxTemps.push(data.daily.temperature_2m_max[i]);
    if (data.daily.temperature_2m_min[i] != null) months[m].minTemps.push(data.daily.temperature_2m_min[i]);
    if (data.daily.precipitation_sum[i] != null) months[m].precip.push(data.daily.precipitation_sum[i]);
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const sum = arr => arr.length ? arr.reduce((a, b) => a + b, 0) : null;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return months.map((m, i) => ({
    month: monthNames[i],
    avgHigh: avg(m.maxTemps),
    avgLow: avg(m.minTemps),
    totalPrecip: sum(m.precip) / 30,
  }));
}

export async function getElevation(lat, lng) {
  const res = await fetch(`${ELEVATION_BASE}?latitude=${lat}&longitude=${lng}`);
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
