import { NextResponse } from "next/server";
import {
  latestReadingsForSensor,
  listSensorsForLandbook,
  newSensorId,
  sensorsCollection,
} from "@/lib/sensors";
import type { Sensor, SensorType } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

const VALID_TYPES: SensorType[] = ["weather", "water", "soil", "audio"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  if (!landbookId) {
    return NextResponse.json(
      { ok: false, error: "landbookId required" },
      { status: 400 }
    );
  }

  const sensors = await listSensorsForLandbook(landbookId);
  const withReadings = await Promise.all(
    sensors.map(async (s) => ({
      ...s,
      latestReadings: await latestReadingsForSensor(s.id, 20),
    }))
  );

  return NextResponse.json({ ok: true, sensors: withReadings });
}

export async function POST(request: Request) {
  const adminKey = process.env.SENSOR_ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { ok: false, error: "SENSOR_ADMIN_KEY not configured" },
      { status: 500 }
    );
  }
  if (request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: Partial<Sensor>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 }
    );
  }

  if (
    !body.landbookId ||
    !body.type ||
    !VALID_TYPES.includes(body.type as SensorType) ||
    !body.hardwareId ||
    !body.position?.lat ||
    !body.position?.lng
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "landbookId, type, hardwareId, position{lat,lng} required",
      },
      { status: 400 }
    );
  }

  const col = await sensorsCollection();
  const existing = await col.findOne({ hardwareId: body.hardwareId });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "hardwareId already registered" },
      { status: 409 }
    );
  }

  const sensor: Sensor = {
    id: newSensorId(),
    landbookId: body.landbookId,
    type: body.type as SensorType,
    label: body.label || `${body.type} sensor`,
    hardwareId: body.hardwareId,
    position: body.position,
    installedAt: new Date().toISOString(),
    lastSeenAt: null,
    status: "pending",
    metadata: body.metadata,
  };

  await col.insertOne(sensor);
  return NextResponse.json({ ok: true, sensor });
}
