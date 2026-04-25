import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
import { getFactsDoc, factsFreshness } from "@/lib/facts-source";
import type { ConfidenceValue } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

interface SoilPanelData {
  moisture: ConfidenceValue | null;
  temperature: ConfidenceValue | null;
  ph: ConfidenceValue | null;
  organicCarbon: ConfidenceValue | null;
  clay: ConfidenceValue | null;
  sand: ConfidenceValue | null;
  nitrogen: ConfidenceValue | null;
  cec: ConfidenceValue | null;
}

const unwrap = (field: unknown): unknown => {
  if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
    return (field as Record<string, unknown>).value;
  }
  return field ?? null;
};

const numFromAny = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  if (!landbookId) {
    return NextResponse.json({ ok: false, error: "landbookId required" }, { status: 400 });
  }

  const doc = await getFactsDoc(landbookId);
  const freshness = factsFreshness(doc);

  const sensors = await listSensorsForLandbook(landbookId);
  const soilSensors = sensors.filter((s) => s.type === "soil");
  const sensorReadings: Record<string, ReturnType<typeof latestReadingByMetric>> = {};
  for (const s of soilSensors) {
    const readings = await latestReadingsForSensor(s.id, 50);
    for (const metric of ["soil_moisture", "soil_temperature", "soil_ph"]) {
      const r = latestReadingByMetric(readings, metric);
      if (r && !sensorReadings[metric]) sensorReadings[metric] = r;
    }
  }

  const soil = doc?.soil ? (doc.soil as Record<string, unknown>) : null;
  const ph = soil ? numFromAny(unwrap(soil.ph)) : null;
  const organicCarbon = soil ? numFromAny(unwrap(soil.organicCarbon)) : null;
  const clay = soil ? numFromAny(unwrap(soil.clay)) : null;
  const sand = soil ? numFromAny(unwrap(soil.sand)) : null;
  const nitrogen = soil ? numFromAny(unwrap(soil.nitrogen)) : null;
  const cec = soil ? numFromAny(unwrap(soil.cec)) : null;

  const detail = "Pipeline canonical (SoilGrids 0-5cm)";
  const ts = freshness.updatedAt || undefined;

  const data: SoilPanelData = {
    moisture: fromSensorReading(
      sensorReadings.soil_moisture,
      empty("Pipeline canonical", "no moisture layer in canonical")
    ),
    temperature: fromSensorReading(sensorReadings.soil_temperature, null),
    ph: fromSensorReading(
      sensorReadings.soil_ph,
      ph != null
        ? cv(Number(ph.toFixed(1)), 0.4, "Pipeline canonical", { sourceDetail: detail, timestamp: ts })
        : empty("Pipeline canonical", "no pH on file")
    ),
    organicCarbon:
      organicCarbon != null
        ? cv(Number(organicCarbon.toFixed(1)), 0.4, "Pipeline canonical", { sourceDetail: detail, unit: "g/kg", timestamp: ts })
        : empty("Pipeline canonical", "no organic carbon on file"),
    clay:
      clay != null
        ? cv(Number(clay.toFixed(1)), 0.4, "Pipeline canonical", { sourceDetail: detail, unit: "%", timestamp: ts })
        : null,
    sand:
      sand != null
        ? cv(Number(sand.toFixed(1)), 0.4, "Pipeline canonical", { sourceDetail: detail, unit: "%", timestamp: ts })
        : null,
    nitrogen:
      nitrogen != null
        ? cv(Number(nitrogen.toFixed(2)), 0.4, "Pipeline canonical", { sourceDetail: detail, unit: "g/kg", timestamp: ts })
        : null,
    cec:
      cec != null
        ? cv(Number(cec.toFixed(1)), 0.4, "Pipeline canonical", { sourceDetail: detail, unit: "cmol/kg", timestamp: ts })
        : null,
  };

  return NextResponse.json({ ok: true, data, freshness });
}
