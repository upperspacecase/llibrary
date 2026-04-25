import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
import { getFactsDoc, factsFreshness } from "@/lib/facts-source";
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

const unwrap = (field: unknown): unknown => {
  if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
    return (field as Record<string, unknown>).value;
  }
  return field ?? null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  if (!landbookId) {
    return NextResponse.json({ ok: false, error: "landbookId required" }, { status: 400 });
  }

  const doc = await getFactsDoc(landbookId);
  const freshness = factsFreshness(doc);

  // Sensor layer (parallel — kept until sensor-as-source migration)
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

  // Canonical: facts.climate
  const climate = doc?.climate ? (doc.climate as Record<string, unknown>) : null;
  const annualMeanTemp = climate ? (unwrap(climate.annualMeanTemp) as number | null) : null;
  const annualRainfall = climate ? (unwrap(climate.annualRainfall) as number | null) : null;
  const monthlyAvgHigh = (climate ? (unwrap(climate.monthlyAvgHigh) as (number | null)[] | null) : null) || [];
  const monthlyAvgLow = (climate ? (unwrap(climate.monthlyAvgLow) as (number | null)[] | null) : null) || [];
  const monthlyPrecip = (climate ? (unwrap(climate.monthlyPrecip) as (number | null)[] | null) : null) || [];

  const monthlyMeanTemp = monthlyAvgHigh.map((hi, i) => {
    const lo = monthlyAvgLow[i];
    if (typeof hi !== "number" || typeof lo !== "number") return { month: i, value: 0 };
    return { month: i, value: (hi + lo) / 2 };
  });

  const archiveDetail = "Pipeline canonical (Open-Meteo 30-yr)";

  // Sensors give us "now"; canonical gives us pipeline-time forecast snapshot.
  // For current, prefer sensor → fall back to first forecast day if available.
  const forecast = (climate ? (unwrap(climate.forecast) as Array<Record<string, unknown>> | null) : null) || [];
  const today = forecast[0] || null;
  const todayHigh = today ? (today.high as number | null) : null;
  const todayPrecip = today ? (today.precip as number | null) : null;
  const todayWind = today ? (today.wind as number | null) : null;

  const data: WeatherPanelData = {
    temperature: fromSensorReading(
      latestByMetric.temperature,
      typeof todayHigh === "number"
        ? cv(todayHigh, 0.4, "Pipeline canonical", { sourceDetail: "today's forecast high", unit: "°C" })
        : empty("Pipeline canonical", "no forecast on file")
    ),
    humidity: fromSensorReading(latestByMetric.humidity, null),
    windSpeed: fromSensorReading(
      latestByMetric.wind_speed,
      typeof todayWind === "number"
        ? cv(todayWind, 0.4, "Pipeline canonical", { sourceDetail: "today's max wind", unit: "km/h" })
        : null
    ),
    precipitation: fromSensorReading(
      latestByMetric.precipitation,
      typeof todayPrecip === "number"
        ? cv(todayPrecip, 0.4, "Pipeline canonical", { sourceDetail: "today's precip", unit: "mm" })
        : null
    ),
    annualMeanTemp:
      typeof annualMeanTemp === "number"
        ? cv(Number(annualMeanTemp.toFixed(1)), 0.4, "Pipeline canonical", {
            sourceDetail: archiveDetail,
            unit: "°C",
            timestamp: freshness.updatedAt || undefined,
          })
        : empty("Pipeline canonical", "no historical data"),
    annualRainfall:
      typeof annualRainfall === "number"
        ? cv(Math.round(annualRainfall), 0.4, "Pipeline canonical", {
            sourceDetail: archiveDetail,
            unit: "mm",
            timestamp: freshness.updatedAt || undefined,
          })
        : empty("Pipeline canonical", "no historical data"),
    monthlyMeanTemp,
    monthlyPrecip: monthlyPrecip.map((p, i) => ({ month: i, value: typeof p === "number" ? p : 0 })),
  };

  return NextResponse.json({ ok: true, data, freshness });
}
