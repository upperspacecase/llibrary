import { randomUUID, createHmac, timingSafeEqual } from "crypto";
import { getCollection } from "./db";
import type {
  Sensor,
  SensorReading,
  SensorStatus,
  SensorType,
} from "./dashboard-types";

const STALE_MS = 1000 * 60 * 60 * 6;

export async function sensorsCollection() {
  return getCollection<Sensor>("sensors");
}

export async function readingsCollection() {
  return getCollection<SensorReading>("sensor_readings");
}

export async function listSensorsForLandbook(landbookId: string): Promise<Sensor[]> {
  const col = await sensorsCollection();
  const docs = await col.find({ landbookId }).toArray();
  return docs.map((doc) => deriveStatus(JSON.parse(JSON.stringify(doc))));
}

export async function latestReadingsForSensor(
  sensorId: string,
  limit = 100
): Promise<SensorReading[]> {
  const col = await readingsCollection();
  const docs = await col
    .find({ sensorId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => JSON.parse(JSON.stringify(d)) as SensorReading);
}

export async function latestReadingsForLandbook(
  landbookId: string,
  perSensorLimit = 10
): Promise<Record<string, SensorReading[]>> {
  const sensors = await listSensorsForLandbook(landbookId);
  const out: Record<string, SensorReading[]> = {};
  for (const sensor of sensors) {
    out[sensor.id] = await latestReadingsForSensor(sensor.id, perSensorLimit);
  }
  return out;
}

export function deriveStatus(sensor: Sensor): Sensor {
  if (!sensor.lastSeenAt) {
    return { ...sensor, status: "pending" };
  }
  const last = new Date(sensor.lastSeenAt).getTime();
  if (Number.isNaN(last)) return { ...sensor, status: "pending" };
  const age = Date.now() - last;
  const status: SensorStatus = age > STALE_MS ? "stale" : "online";
  return { ...sensor, status };
}

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function newSensorId(): string {
  return `sen_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export const SENSOR_TYPES: readonly SensorType[] = [
  "weather",
  "water",
  "soil",
  "audio",
] as const;
