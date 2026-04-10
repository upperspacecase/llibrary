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
  floodRisk: string | null;
}

export interface Species {
  total: number | null;
  threatened: number | null;
  gbifTotal: number | null;
  groups: Array<{ name?: string; group?: string; count?: number; value?: number }>;
  top10: Array<{ name: string; group: string; count: number }>;
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

export interface Economics {
  valuePerHa: number | null;
  totalValue: number | null;
  ecosystemServices: EcosystemServices;
  npv: {
    thirtyYear: number | null;
    scenarios: Array<{ name: string; npv: number; riskLevel?: string }>;
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

/** Canonical narrative shape — one slot per report section */
export interface Narratives {
  overview?: { intro?: string; callout?: string };
  regionEcosystem?: {
    intro?: string;
    callout?: string;
    slopeDesc?: string;
    slopeTip?: string;
    waterDesc?: string;
    waterTip?: string;
    solarDesc?: string;
    solarTip?: string;
    treeCoverDesc?: string;
  };
  landWater?: { intro?: string; callout?: string };
  biodiversity?: { intro?: string; callout?: string };
  climateSeasons?: { intro?: string; callout?: string };
  valueBenefits?: { intro?: string; callout?: string };
  landUse?: { intro?: string; callout?: string };
  historyTrends?: { intro?: string; callout?: string };
  risksResilience?: { intro?: string; callout?: string; recommendation?: string };
  futureScenarios?: { intro?: string; callout?: string };
  recommendations?: { intro?: string };
  sourcesMethodology?: { intro?: string; disclaimer?: string };
  /** Allow legacy v1 keys from old components still in the codebase */
  [key: string]: Record<string, string | undefined> | undefined;
}

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
  flood: RiskData;
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
}
