import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
import { getFactsDoc, factsFreshness } from "@/lib/facts-source";
import type { ConfidenceValue } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

interface WaterFeature {
  type: string;
  name: string | null;
  distanceM: number;
}

interface WaterPanelData {
  sensorLevel: ConfidenceValue | null;
  sensorFlow: ConfidenceValue | null;
  features: ConfidenceValue<WaterFeature[]> | null;
  featureCount: ConfidenceValue | null;
  nearestDistance: ConfidenceValue | null;
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

  const sensors = await listSensorsForLandbook(landbookId);
  const waterSensors = sensors.filter((s) => s.type === "water");
  const sensorReadings: Record<string, ReturnType<typeof latestReadingByMetric>> = {};
  for (const s of waterSensors) {
    const readings = await latestReadingsForSensor(s.id, 50);
    for (const metric of ["water_level", "water_flow", "water_turbidity"]) {
      const r = latestReadingByMetric(readings, metric);
      if (r && !sensorReadings[metric]) sensorReadings[metric] = r;
    }
  }

  const water = doc?.water ? (doc.water as Record<string, unknown>) : null;
  const rawFeatures = water ? (unwrap(water.features) as Array<{
    kind: string;
    name: string | null;
    distanceM: number;
  }> | null) : null;
  const nearestDistanceM = water ? (unwrap(water.nearestDistanceM) as number | null) : null;

  const features: WaterFeature[] = (rawFeatures || []).map((f) => ({
    type: f.kind,
    name: f.name,
    distanceM: f.distanceM,
  }));

  const detail = "Pipeline canonical (Overpass 1.5km)";
  const ts = freshness.updatedAt || undefined;

  const data: WaterPanelData = {
    sensorLevel: fromSensorReading(sensorReadings.water_level, null),
    sensorFlow: fromSensorReading(sensorReadings.water_flow, null),
    features: features.length
      ? cv(features, 0.6, "Pipeline canonical", { sourceDetail: detail, timestamp: ts })
      : doc
        ? cv([], 0.6, "Pipeline canonical", { sourceDetail: "no features within radius", timestamp: ts })
        : empty<WaterFeature[]>("Pipeline canonical", "no facts on file"),
    featureCount: cv(features.length, 0.6, "Pipeline canonical", {
      sourceDetail: "hydrology features in radius",
      timestamp: ts,
    }),
    nearestDistance: features[0]
      ? cv(features[0].distanceM, 0.6, "Pipeline canonical", {
          sourceDetail: `${features[0].type}${features[0].name ? ` (${features[0].name})` : ""}`,
          unit: "m",
          timestamp: ts,
        })
      : nearestDistanceM != null
        ? cv(nearestDistanceM, 0.6, "Pipeline canonical", { sourceDetail: detail, unit: "m", timestamp: ts })
        : null,
  };

  return NextResponse.json({ ok: true, data, freshness });
}
