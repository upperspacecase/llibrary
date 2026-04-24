import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
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

function haversineM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const waterSensors = sensors.filter((s) => s.type === "water");
  const sensorReadings: Record<string, ReturnType<typeof latestReadingByMetric>> = {};
  for (const s of waterSensors) {
    const readings = await latestReadingsForSensor(s.id, 50);
    for (const metric of ["water_level", "water_flow", "water_turbidity"]) {
      const r = latestReadingByMetric(readings, metric);
      if (r && !sensorReadings[metric]) sensorReadings[metric] = r;
    }
  }

  const radius = 1500;
  const overpass = `[out:json][timeout:15];(
    node(around:${radius},${lat},${lng})[natural=spring];
    node(around:${radius},${lat},${lng})[man_made=water_well];
    way(around:${radius},${lat},${lng})[waterway];
    way(around:${radius},${lat},${lng})[natural=water];
  );out center tags;`;

  let features: WaterFeature[] = [];
  let errored = false;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(overpass)}`,
      next: { revalidate: 86400 },
    });
    if (res.ok) {
      const j = await res.json();
      for (const el of j.elements || []) {
        const elat = el.lat ?? el.center?.lat;
        const elng = el.lon ?? el.center?.lon;
        if (typeof elat !== "number" || typeof elng !== "number") continue;
        const tags = el.tags || {};
        const type = tags.waterway
          ? tags.waterway
          : tags.natural === "spring"
            ? "spring"
            : tags.natural === "water"
              ? tags.water || "water body"
              : tags.man_made === "water_well"
                ? "well"
                : "water";
        features.push({
          type,
          name: tags.name || null,
          distanceM: Math.round(haversineM(lat, lng, elat, elng)),
        });
      }
      features.sort((a, b) => a.distanceM - b.distanceM);
      features = features.slice(0, 20);
    } else {
      errored = true;
    }
  } catch {
    errored = true;
  }

  const data: WaterPanelData = {
    sensorLevel: fromSensorReading(sensorReadings.water_level, null),
    sensorFlow: fromSensorReading(sensorReadings.water_flow, null),
    features: features.length
      ? cv(features, 0.6, "OpenStreetMap", {
          sourceDetail: "Overpass 1.5km radius",
        })
      : errored
        ? empty<WaterFeature[]>("Overpass", "unavailable")
        : cv([], 0.6, "OpenStreetMap", { sourceDetail: "no features within 1.5km" }),
    featureCount: cv(features.length, 0.6, "OpenStreetMap", {
      sourceDetail: "hydrology features in 1.5km",
    }),
    nearestDistance: features[0]
      ? cv(features[0].distanceM, 0.6, "OpenStreetMap", {
          sourceDetail: `${features[0].type}${features[0].name ? ` (${features[0].name})` : ""}`,
          unit: "m",
        })
      : null,
  };

  return NextResponse.json({ ok: true, data });
}
