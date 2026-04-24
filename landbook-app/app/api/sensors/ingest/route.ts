import { NextResponse } from "next/server";
import {
  readingsCollection,
  sensorsCollection,
  verifySignature,
} from "@/lib/sensors";
import type { SensorIngestPayload, SensorReading } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.SENSOR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "SENSOR_WEBHOOK_SECRET not configured" },
      { status: 500 }
    );
  }

  const raw = await request.text();
  const signature = request.headers.get("x-sensor-signature");
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: "invalid signature" },
      { status: 401 }
    );
  }

  let payload: SensorIngestPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 }
    );
  }

  if (!payload?.hardwareId || !Array.isArray(payload.readings)) {
    return NextResponse.json(
      { ok: false, error: "hardwareId and readings[] required" },
      { status: 400 }
    );
  }

  const sensors = await sensorsCollection();
  const sensor = await sensors.findOne({ hardwareId: payload.hardwareId });
  if (!sensor) {
    return NextResponse.json(
      { ok: false, error: "unknown hardwareId" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const rows: SensorReading[] = [];
  for (const r of payload.readings) {
    if (!r?.metric || typeof r.value !== "number" || !r.timestamp) continue;
    rows.push({
      sensorId: sensor.id,
      landbookId: sensor.landbookId,
      hardwareId: sensor.hardwareId,
      metric: r.metric,
      value: r.value,
      unit: r.unit,
      timestamp: r.timestamp,
      receivedAt: now,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no valid readings" },
      { status: 400 }
    );
  }

  const readings = await readingsCollection();
  await readings.insertMany(rows);
  await sensors.updateOne(
    { id: sensor.id },
    { $set: { lastSeenAt: now, status: "online" } }
  );

  return NextResponse.json({ ok: true, accepted: rows.length });
}
