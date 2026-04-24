import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty, fromSensorReading, latestReadingByMetric } from "@/lib/confidence";
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

const SOILGRIDS_PROPS = [
  { key: "phh2o", depth: "0-5cm", field: "ph", unit: "pH", scale: 0.1 },
  { key: "soc", depth: "0-5cm", field: "organicCarbon", unit: "g/kg", scale: 0.1 },
  { key: "clay", depth: "0-5cm", field: "clay", unit: "%", scale: 0.1 },
  { key: "sand", depth: "0-5cm", field: "sand", unit: "%", scale: 0.1 },
  { key: "nitrogen", depth: "0-5cm", field: "nitrogen", unit: "cg/kg", scale: 0.01 },
  { key: "cec", depth: "0-5cm", field: "cec", unit: "mmol(c)/kg", scale: 0.1 },
] as const;

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
  const soilSensors = sensors.filter((s) => s.type === "soil");
  const sensorReadings: Record<string, ReturnType<typeof latestReadingByMetric>> = {};
  for (const s of soilSensors) {
    const readings = await latestReadingsForSensor(s.id, 50);
    for (const metric of ["soil_moisture", "soil_temperature", "soil_ph"]) {
      const r = latestReadingByMetric(readings, metric);
      if (r && !sensorReadings[metric]) sensorReadings[metric] = r;
    }
  }

  const propsQuery = SOILGRIDS_PROPS.map((p) => `property=${p.key}`).join("&");
  const soilGridsUrl = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng}&lat=${lat}&${propsQuery}&depth=0-5cm&value=mean`;

  const soilGrids: Record<string, number | null> = {};
  let errored = false;
  try {
    const res = await fetch(soilGridsUrl, { next: { revalidate: 86400 } });
    if (res.ok) {
      const j = await res.json();
      const layers = j?.properties?.layers || [];
      for (const prop of SOILGRIDS_PROPS) {
        const layer = layers.find((l: { name: string }) => l.name === prop.key);
        const mean = layer?.depths?.[0]?.values?.mean;
        soilGrids[prop.field] =
          typeof mean === "number" ? mean * prop.scale : null;
      }
    } else {
      errored = true;
    }
  } catch {
    errored = true;
  }

  const data: SoilPanelData = {
    moisture: fromSensorReading(
      sensorReadings.soil_moisture,
      empty("SoilGrids", "no moisture layer at this point")
    ),
    temperature: fromSensorReading(sensorReadings.soil_temperature, null),
    ph: fromSensorReading(
      sensorReadings.soil_ph,
      soilGrids.ph !== null && soilGrids.ph !== undefined
        ? cv(Number(soilGrids.ph.toFixed(1)), 0.4, "SoilGrids", {
            sourceDetail: "250m model, 0-5cm",
          })
        : errored
          ? empty("SoilGrids", "unavailable")
          : null
    ),
    organicCarbon:
      soilGrids.organicCarbon !== null && soilGrids.organicCarbon !== undefined
        ? cv(Number(soilGrids.organicCarbon.toFixed(1)), 0.4, "SoilGrids", {
            sourceDetail: "0-5cm mean",
            unit: "g/kg",
          })
        : empty("SoilGrids", errored ? "unavailable" : "no data"),
    clay:
      soilGrids.clay !== null && soilGrids.clay !== undefined
        ? cv(Number(soilGrids.clay.toFixed(1)), 0.4, "SoilGrids", {
            sourceDetail: "0-5cm mean",
            unit: "%",
          })
        : null,
    sand:
      soilGrids.sand !== null && soilGrids.sand !== undefined
        ? cv(Number(soilGrids.sand.toFixed(1)), 0.4, "SoilGrids", {
            sourceDetail: "0-5cm mean",
            unit: "%",
          })
        : null,
    nitrogen:
      soilGrids.nitrogen !== null && soilGrids.nitrogen !== undefined
        ? cv(Number(soilGrids.nitrogen.toFixed(2)), 0.4, "SoilGrids", {
            sourceDetail: "0-5cm mean",
            unit: "cg/kg",
          })
        : null,
    cec:
      soilGrids.cec !== null && soilGrids.cec !== undefined
        ? cv(Number(soilGrids.cec.toFixed(1)), 0.4, "SoilGrids", {
            sourceDetail: "0-5cm mean",
            unit: "mmol(c)/kg",
          })
        : null,
  };

  return NextResponse.json({ ok: true, data });
}
