export const CONFIDENCE_TIERS = {
  MEASURED: 1.0,
  PROXIMATE: 0.7,
  SATELLITE: 0.6,
  MODELED: 0.4,
  ESTIMATED: 0.2,
} as const;

export type ConfidenceScore = 1.0 | 0.7 | 0.6 | 0.4 | 0.2;

export type ConfidenceTier =
  | "measured"
  | "proximate"
  | "satellite"
  | "modeled"
  | "estimated";

export function tierFromScore(score: ConfidenceScore): ConfidenceTier {
  if (score === 1.0) return "measured";
  if (score === 0.7) return "proximate";
  if (score === 0.6) return "satellite";
  if (score === 0.4) return "modeled";
  return "estimated";
}

export interface ConfidenceValue<T = number | string | null> {
  value: T;
  confidence: ConfidenceScore;
  source: string;
  sourceDetail?: string;
  timestamp?: string;
  unit?: string;
}

export type SensorType = "weather" | "water" | "soil" | "audio";

export type SensorStatus = "online" | "offline" | "stale" | "pending";

export interface Sensor {
  id: string;
  landbookId: string;
  type: SensorType;
  label: string;
  hardwareId: string;
  position: { lat: number; lng: number };
  installedAt: string;
  lastSeenAt: string | null;
  status: SensorStatus;
  metadata?: Record<string, unknown>;
}

export interface SensorReading {
  sensorId: string;
  landbookId: string;
  hardwareId: string;
  metric: string;
  value: number;
  unit?: string;
  timestamp: string;
  receivedAt: string;
}

export interface SensorIngestPayload {
  hardwareId: string;
  readings: Array<{
    metric: string;
    value: number;
    unit?: string;
    timestamp: string;
  }>;
}

export interface DashboardPanel<T = unknown> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface RecommendedAction {
  panel: string;
  field: string;
  tier: ConfidenceTier;
  sensorType: SensorType | null;
  message: string;
}
