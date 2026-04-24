import type {
  ConfidenceScore,
  ConfidenceValue,
  SensorReading,
} from "./dashboard-types";

export function cv<T = number | string | null>(
  value: T,
  confidence: ConfidenceScore,
  source: string,
  opts: { sourceDetail?: string; timestamp?: string; unit?: string } = {}
): ConfidenceValue<T> {
  return {
    value,
    confidence,
    source,
    sourceDetail: opts.sourceDetail,
    timestamp: opts.timestamp,
    unit: opts.unit,
  };
}

export function empty<T = null>(source: string, reason: string): ConfidenceValue<T> {
  return {
    value: null as unknown as T,
    confidence: 0.2,
    source,
    sourceDetail: reason,
  };
}

export function fromSensorReading(
  reading: SensorReading | undefined,
  fallback: ConfidenceValue | null
): ConfidenceValue | null {
  if (!reading) return fallback;
  return {
    value: reading.value,
    confidence: 1.0,
    source: `Sensor ${reading.sensorId}`,
    timestamp: reading.timestamp,
    unit: reading.unit,
  };
}

export function latestReadingByMetric(
  readings: SensorReading[],
  metric: string
): SensorReading | undefined {
  return readings.find((r) => r.metric === metric);
}
