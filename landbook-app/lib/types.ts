export interface Coords {
  lat: number;
  lng: number;
}

export interface Property {
  name: string;
  address: string;
  area: number;
  coords: Coords;
  boundary: number[][];
  municipality?: string;
  parish?: string;
}

export interface Scores {
  naturalCapital: number;
  carbon: number;
  biodiversity: number;
  water: number;
  soil: number;
  pollination: number;
  regional: {
    carbon: number;
    biodiversity: number;
    water: number;
    soil: number;
    pollination: number;
  };
}

export interface Climate {
  annualMeanTemp: number | null;
  summerMean: number | null;
  winterMean: number | null;
  annualRainfall: number | null;
  growingSeason: number | null;
  zone: string | null;
  frostDays: number | null;
  monthlyAvgHigh: number[];
  monthlyAvgLow: number[];
  monthlyPrecip: number[];
}

export interface Terrain {
  elevation: number | null;
  slope: number | null;
  aspect: string | null;
  range: number | null;
}

export interface Soil {
  classification: string | null;
  ph: number | null;
  organicCarbon: number | null;
  clay: number | null;
  sand: number | null;
  silt: number | null;
  nitrogen: string | null;
  cec: string | null;
  bulkDensity: string | null;
}

export interface Geology {
  lithology: string | null;
  environment: string | null;
  period: string | null;
  age: string | null;
}

export interface Water {
  securityIndex: number | null;
  springs: number | null;
  wells: number | null;
  waterways: number | null;
  waterBodies: number | null;
  floodDischarge: string | null;
  floodRisk?: string | null;
}

export interface Species {
  total: number | null;
  threatened: number | null;
  gbifTotal: number | null;
  groups: Array<{ name?: string; group?: string; count?: number; value?: number }>;
  top10: Array<{ name: string; group: string; count: number; photoUrl?: string | null }>;
  trends: { direction?: string };
}

export interface RiskData {
  riskScore: number | null;
  riskLevel: string | null;
}

export interface FireData extends RiskData {
  activeFires: number | null;
  historical: Array<{ year: string | number; count: number }>;
}

export interface FloodData extends RiskData {
  hand?: number | null;
  distanceToDrainageM?: number | null;
  drainageName?: string | null;
  drainageKind?: string | null;
}

export interface Energy {
  independenceScore: number | null;
  solar: Record<string, unknown>;
  wind: Record<string, unknown>;
  microHydro: Record<string, unknown>;
  biomass: Record<string, unknown>;
}

export interface EcosystemServices {
  water: number;
  food: number;
  carbon: number;
  regulation: number;
  soil: number;
  cultural: number;
  total?: number;
}

export interface RevenueScenarios {
  conservative: number | null;
  moderate: number | null;
  optimized: number | null;
  details?: Array<{ name?: string; label?: string; value?: number; estimate?: number }>;
}

export interface Premium {
  id: string;
  name: string;
  description?: string | null;
  source?: string | null;
  basis?: "per-hectare" | "benefit-cost-ratio" | string | null;
  confidence?: "high" | "medium" | "lower" | string | null;
  matchType?: "direct" | "analogue" | string | null;
  valueComposition?: string | null;
  annualLow?: number | null;
  annualMid?: number | null;
  annualHigh?: number | null;
  thirtyYearNpvLow?: number | null;
  thirtyYearNpvMid?: number | null;
  thirtyYearNpvHigh?: number | null;
  benefitCostRatio?: number | null;
}

export interface PremiumMethodology {
  source?: string;
  benefitTransferNote?: string;
  discountRate?: number;
  discountSource?: string;
  horizonYears?: number;
  annuityFactor?: number;
  formula?: string;
}

export interface Economics {
  valuePerHa: number | null;
  totalValue: number | null;
  ecosystemServices: EcosystemServices;
  premiums?: Premium[];
  premiumMethodology?: PremiumMethodology;
  npv: {
    thirtyYear: number | null;
    scenarios: Array<{
      name: string;
      npv: number;
      riskLevel?: string;
      intervention?: string | null;
      uplift30yr?: number | null;
      annualUplift?: number | null;
      assumptions?: string | null;
    }>;
  };
  revenueScenarios: RevenueScenarios;
  carbonStock: number | null;
  carbonAnnualSeq: number | null;
  carbonCreditValue: number | null;
}

export interface Maps {
  satellite: string | null;
  overview: string | null;
  regional: string | null;
  detail: string | null;
}

export interface Regional {
  protectedAreas: Array<{ name: string; type?: string; designation?: string }>;
  percentiles: {
    soil?: number;
    carbon?: number;
    biodiversity?: number;
  };
}

export interface Trends {
  tempPerDecade: number | null;
  precipPerDecade: number | null;
  fireProneByDecade: Array<{ decade?: string; label?: string; avgDays?: number; days?: number; value?: number }>;
}

export interface Compliance {
  items: Array<{ name?: string; regulation?: string; status?: string; level?: string; description?: string; notes?: string; detail?: string }>;
  timeline: Array<{ deadline?: string; year?: string; date?: string; action?: string; event?: string; description?: string }>;
}

export interface Actions {
  immediate: ActionItem[];
  shortTerm: ActionItem[];
  longTerm: ActionItem[];
}

export interface ActionItem {
  action?: string;
  name?: string;
  description?: string;
  priority?: string;
  impact?: string;
}

import { NARRATIVE_SCHEMA } from "./narrative-schema.js";

/**
 * Canonical narrative shape — one slot per report section.
 * Derived from NARRATIVE_SCHEMA (the single source of truth).
 * To add/remove slots, edit landbook-app/lib/narrative-schema.js.
 *
 * The index signature allows unused V1-era section components to keep
 * compiling until they're deleted — real sections still get the precise
 * slot keys via the mapped type above.
 */
export type Narratives = {
  [K in keyof typeof NARRATIVE_SCHEMA]?: {
    [S in keyof (typeof NARRATIVE_SCHEMA)[K]]?: string;
  };
} & {
  [key: string]: Record<string, string | undefined> | undefined;
};

export interface Uncertainty {
  interval: number;
  confidence: number;
  label: string;
  completeness: number;
  apisOk: number;
  apisTotal: number;
}

export interface Meta {
  generatedAt: string | null;
  version: string | null;
  apiStatus: Record<string, string>;
  missingFields?: Array<{ field: string }>;
  uncertainty?: Uncertainty;
}

export interface Agriculture {
  landCover: string | null;
  systems: Array<{ name?: string; system?: string; description?: string; detail?: string; suitability?: string; rating?: string }>;
}

export interface ReportData {
  property: Property;
  scores: Scores;
  climate: Climate;
  terrain: Terrain;
  soil: Soil;
  geology: Geology;
  water: Water;
  species: Species;
  fire: FireData;
  flood: FloodData;
  drought: RiskData;
  energy: Energy;
  economics: Economics;
  maps: Maps;
  regional: Regional;
  trends: Trends;
  compliance: Compliance;
  actions: Actions;
  agriculture: Agriculture;
  narratives: Narratives;
  meta: Meta;
}

// ── 3-Layer Pipeline Types ────────────────────────────────

export interface FactField<T = number | string | null> {
  value: T;
  unit: string | null;
  confidence: "high" | "medium" | "low" | "missing";
  sourceRef: string | null;
  reason?: string;
}

export interface ObservationDoc {
  landbookId: string;
  source: string;
  fetchedAt: string;
  status: "ok" | "error";
  raw: unknown;
  error: string | null;
  confidence: "high" | "medium" | "low" | "missing";
  ttl: number;
  group: string | null;
  label: string;
}

export interface ReportDoc {
  landbookId: string;
  version: number;
  generatedAt: string;
  narratives: NarrativesV2;
  scores: Scores;
  factSnapshotVersion: number | null;
  model: string | null;
  promptVersion: string | null;
  cost: { inputTokens: number; outputTokens: number; model: string; estimatedUSD: number } | null;
}

/** @deprecated Use Narratives instead — kept for ReportDoc backward compat */
export type NarrativesV2 = Narratives;

// ── Existing Types ────────────────────────────────────────

export interface Landbook {
  id: string;
  ownerId?: string;
  name?: string;
  clientName?: string;
  cadastralRef?: string;
  boundary: number[][];
  center: Coords;
  area: number;
  perimeter: number;
  address: string;
  email?: string;
  data: ReportData | null;
  dataUpdated?: string;
  created: string;
  updated?: string;
  agentNotes?: string;
}

export interface LandbookOverride {
  landbookId: string;
  ownerId: string;
  fields: LandbookOverrideFields;
  updatedAt: string;
}

/**
 * Override values mirror the fields actually shown on the public Overview
 * section. Each is stored as the raw string the agent typed; merging logic
 * parses + scales when assembling the rendered ReportData (see
 * lib/landbook-overrides.ts).
 *
 * Display scales:
 *   - area: hectares
 *   - naturalCapital / longTermValue: euros
 *   - waterSecurity / biodiversityScore / energyIndependence: 0–10
 *   - fireRisk / floodRisk / droughtRisk: 1–5
 */
export interface LandbookOverrideFields {
  name?: string;
  narrativeIntro?: string;
  narrativeCallout?: string;
  area?: string;
  naturalCapital?: string;
  longTermValue?: string;
  waterSecurity?: string;
  biodiversityScore?: string;
  energyIndependence?: string;
  fireRisk?: string;
  floodRisk?: string;
  droughtRisk?: string;
}

export interface ShareRecipient {
  name: string;
  email: string;
  role?: string;
  sentAt?: string;
  viewedAt?: string;
}

export interface ShareActivity {
  kind:
    | "created"
    | "recipient_added"
    | "viewed"
    | "downloaded"
    | "expires_updated";
  at: string;
  meta?: Record<string, string | number | null>;
}

export interface LandbookShare {
  landbookId: string;
  ownerId: string;
  token: string;
  createdAt: string;
  expiresAt?: string | null;
  emailGate: boolean;
  recipients: ShareRecipient[];
  activity: ShareActivity[];
}

export interface AgentSettings {
  ownerId: string;
  agencyName?: string;
  leadAgent?: string;
  license?: string;
  phone?: string;
  publicEmail?: string;
  tagline?: string;
  accentColor?: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface LandbookFile {
  landbookId: string;
  ownerId: string;
  name: string;
  kind: string;
  size: number;
  downloadUrl: string;
  uploadedAt: string;
  agentNote?: string;
}

export interface AgentStripe {
  ownerId: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  planPriceId?: string;
  status?: string;
  currentPeriodEnd?: number;
  lastPaymentStatus?: "paid" | "failed";
  lastPaymentAt?: string;
  updatedAt: string;
}

export interface LandbookPayment {
  landbookId: string;
  ownerId: string;
  sessionId: string;
  amount: number;
  currency: string;
  paidAt: string;
}

export interface Submission {
  id: string;
  ownerId?: string;
  boundary: number[][];
  center: Coords | null;
  /** Area in m². If areaOverride is set, this equals areaOverride·10000. */
  area: number | null;
  /** Auto-computed area in m² (kept even when agent overrides). */
  areaComputed?: number | null;
  /** Agent-supplied override in hectares, when present. */
  areaOverride?: number | null;
  perimeter: number | null;
  postcode: string;
  address?: string;
  name: string;
  contactMethod: string;
  contact: string;
  propertyName?: string;
  clientName?: string;
  cadastralRef?: string;
  landCondition?: string[];
  landUse?: string[];
  zoning?: string[];
  waterReliability?: string;
  waterSource?: string[];
  challenges?: string[];
  landGoals?: string[];
  helpNeeded?: string[];
  notes?: string;
  files?: Array<{ name: string; size: number; type: string; url: string }>;
  created: string;
  updated?: string;
  landbookId?: string;
  // Populated by v1's /api/landbooks/[id]/refresh pipeline when it writes
  // back to the submissions collection (no landbook exists yet for this id).
  data?: ReportData | null;
  dataUpdated?: string;
  agentNotes?: string;
}
