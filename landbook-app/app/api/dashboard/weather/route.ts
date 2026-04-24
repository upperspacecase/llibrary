import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
import type { ConfidenceValue } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

interface WeatherPanelData {
  temperature: ConfidenceValue | null;
  humidity: ConfidenceValue | null;
  windSpeed: ConfidenceValue | null;
  precipitation: ConfidenceValue | null;
  annualMeanTemp: ConfidenceValue | null;
  annualRainfall: ConfidenceValue | null;
  monthlyMeanTemp: { month: number; value: number }[];
  monthlyPrecip: { month: number; value: number }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  if (!landbookId || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { ok: false, error: "landbookId, lat, lng required" },
      { status: 400 }
    );
  }

  const sensors = await listSensorsForLandbook(landbookId);
  const weatherSensors = sensors.filter((s) => s.type === "weather");
  const latestByMetric: Record<string, ReturnType<typeof latestReadingByMetric>> = {};
  for (const s of weatherSensors) {
    const readings = await latestReadingsForSensor(s.id, 50);
    for (const metric of ["temperature", "humidity", "wind_speed", "precipitation"]) {
      const r = latestReadingByMetric(readings, metric);
      if (r && !latestByMetric[metric]) latestByMetric[metric] = r;
    }
  }

  let current: Record<string, unknown> | null = null;
  let monthlyTemp: number[] = [];
  let monthlyPrecip: number[] = [];
  let annualTemp: number | null = null;
  let annualRain: number | null = null;
  let errored = false;

  try {
    const currentRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`,
      { next: { revalidate: 300 } }
    );
    if (currentRes.ok) {
      const j = await currentRes.json();
      current = j.current;
    } else {
      errored = true;
    }
  } catch {
    errored = true;
  }

  try {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 29;
    const archiveRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_mean,precipitation_sum&timezone=auto`,
      { next: { revalidate: 86400 } }
    );
    if (archiveRes.ok) {
      const j = await archiveRes.json();
      const daily = j.daily;
      if (daily?.time && daily.temperature_2m_mean && daily.precipitation_sum) {
        const sums = Array.from({ length: 12 }, () => ({ t: 0, p: 0, n: 0 }));
        for (let i = 0; i < daily.time.length; i++) {
          const m = new Date(daily.time[i]).getMonth();
          const t = daily.temperature_2m_mean[i];
          const p = daily.precipitation_sum[i];
          if (typeof t === "number" && typeof p === "number") {
            sums[m].t += t;
            sums[m].p += p;
            sums[m].n += 1;
          }
        }
        monthlyTemp = sums.map((s) => (s.n ? s.t / s.n : 0));
        const yearly: Record<string, { t: number; p: number; n: number }> = {};
        for (let i = 0; i < daily.time.length; i++) {
          const y = daily.time[i].slice(0, 4);
          if (!yearly[y]) yearly[y] = { t: 0, p: 0, n: 0 };
          const t = daily.temperature_2m_mean[i];
          const p = daily.precipitation_sum[i];
          if (typeof t === "number" && typeof p === "number") {
            yearly[y].t += t;
            yearly[y].p += p;
            yearly[y].n += 1;
          }
        }
        const years = Object.values(yearly).filter((y) => y.n > 300);
        if (years.length) {
          annualTemp =
            years.reduce((sum, y) => sum + y.t / y.n, 0) / years.length;
          annualRain =
            years.reduce((sum, y) => sum + y.p, 0) / years.length;
        }
        const daysPerMonth = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        monthlyPrecip = sums.map(
          (s, i) => (s.n ? (s.p / s.n) * daysPerMonth[i] : 0)
        );
      }
    } else {
      errored = true;
    }
  } catch {
    errored = true;
  }

  const archiveDetail = "Open-Meteo 30-yr archive";

  const data: WeatherPanelData = {
    temperature: fromSensorReading(
      latestByMetric.temperature,
      current && typeof current.temperature_2m === "number"
        ? cv(
            current.temperature_2m as number,
            0.4,
            "Open-Meteo",
            { sourceDetail: "current forecast", unit: "°C" }
          )
        : errored
          ? empty("Open-Meteo", "unavailable")
          : null
    ),
    humidity: fromSensorReading(
      latestByMetric.humidity,
      current && typeof current.relative_humidity_2m === "number"
        ? cv(
            current.relative_humidity_2m as number,
            0.4,
            "Open-Meteo",
            { sourceDetail: "current forecast", unit: "%" }
          )
        : null
    ),
    windSpeed: fromSensorReading(
      latestByMetric.wind_speed,
      current && typeof current.wind_speed_10m === "number"
        ? cv(
            current.wind_speed_10m as number,
            0.4,
            "Open-Meteo",
            { sourceDetail: "current forecast", unit: "km/h" }
          )
        : null
    ),
    precipitation: fromSensorReading(
      latestByMetric.precipitation,
      current && typeof current.precipitation === "number"
        ? cv(
            current.precipitation as number,
            0.4,
            "Open-Meteo",
            { sourceDetail: "current forecast", unit: "mm" }
          )
        : null
    ),
    annualMeanTemp:
      annualTemp !== null
        ? cv(Number(annualTemp.toFixed(1)), 0.4, "Open-Meteo", {
            sourceDetail: archiveDetail,
            unit: "°C",
          })
        : empty("Open-Meteo archive", "no historical data"),
    annualRainfall:
      annualRain !== null
        ? cv(Math.round(annualRain), 0.4, "Open-Meteo", {
            sourceDetail: archiveDetail,
            unit: "mm",
          })
        : empty("Open-Meteo archive", "no historical data"),
    monthlyMeanTemp: monthlyTemp.map((value, month) => ({ month, value })),
    monthlyPrecip: monthlyPrecip.map((value, month) => ({ month, value })),
  };

  return NextResponse.json({ ok: true, data });
}
