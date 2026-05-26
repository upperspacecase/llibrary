/**
 * Canonical reportData schema (Zod).
 *
 * This is the contract for what processRawData() produces. It's derived from
 * the real fixtures/baseline/facts.json output, not the design doc, so it
 * matches what's shipping today.
 *
 * Validation is non-throwing — call validateReportData() and inspect issues.
 * The orchestrator writes drift to pipeline_errors with code SCHEMA_DRIFT.
 *
 * Schemas use .passthrough() at every object level so additional fields
 * don't trip validation; they only catch missing required fields and
 * type changes. Tighten gradually as the canonical surface stabilises.
 */

import { z } from 'zod';

const num = z.number();
const numNullable = z.number().nullable();
const numOrString = z.union([z.number(), z.string()]).nullable();
const str = z.string();
const strNullable = z.string().nullable();

// ── Property ─────────────────────────────────────────────
const PropertySchema = z.object({
  name: strNullable,
  address: strNullable,
  coords: z.object({ lat: num, lng: num }).passthrough(),
  area: numNullable,
  boundary: z.array(z.tuple([num, num])).default([]),
  municipality: strNullable.optional(),
  parish: strNullable.optional(),
}).passthrough();

// ── Scores ───────────────────────────────────────────────
const DimensionSchema = z.object({
  label: str,
  score: numNullable,
  avg: numNullable,
  key: str,
}).passthrough();

const ScoresSchema = z.object({
  naturalCapital: numNullable,
  carbon: numNullable,
  biodiversity: numNullable,
  water: numNullable,
  soil: numNullable,
  pollination: numNullable.optional(),
  dimensions: z.array(DimensionSchema).default([]),
  regional: z.record(z.string(), numNullable).default({}),
}).passthrough();

// ── Climate ──────────────────────────────────────────────
const ForecastDaySchema = z.object({
  date: str,
  high: numNullable,
  low: numNullable,
  precip: numNullable,
  wind: numNullable,
  weatherCode: numNullable,
  uvIndex: numNullable,
}).passthrough();

const ClimateSchema = z.object({
  annualMeanTemp: numNullable,
  summerMean: numNullable,
  winterMean: numNullable,
  annualRainfall: numNullable,
  frostDays: numNullable,
  growingSeason: numNullable,
  zone: strNullable,
  monthlyAvgHigh: z.array(numNullable).default([]),
  monthlyAvgLow: z.array(numNullable).default([]),
  monthlyPrecip: z.array(numNullable).default([]),
  forecast: z.array(ForecastDaySchema).default([]),
  ipmaForecast: z.array(z.object({}).passthrough()).default([]),
  frostDates: z.object({
    lastFrost: strNullable,
    firstFrost: strNullable,
  }).nullable(),
}).passthrough();

// ── Terrain ──────────────────────────────────────────────
const TerrainSchema = z.object({
  elevation: numNullable,
  slope: numNullable,
  aspect: strNullable,
  profile: z.array(numNullable).default([]),
  min: numNullable,
  max: numNullable,
  range: numNullable,
}).passthrough();

// ── Soil ─────────────────────────────────────────────────
const SoilSchema = z.object({
  ph: numOrString,
  organicCarbon: numOrString,
  clay: numOrString,
  sand: numOrString,
  silt: numOrString,
  nitrogen: numOrString,
  cec: numOrString,
  bulkDensity: numOrString,
  classification: strNullable,
  texture: strNullable,
}).passthrough();

// ── Geology ──────────────────────────────────────────────
const GeologySchema = z.object({
  lithology: strNullable,
  environment: strNullable,
  period: strNullable,
  age: strNullable,
}).passthrough();

// ── Water ────────────────────────────────────────────────
const WaterFeatureSchema = z.object({
  kind: str,
  name: strNullable,
  distanceM: num,
}).passthrough();

const WaterSchema = z.object({
  springs: numNullable,
  wells: numNullable,
  waterways: numNullable,
  waterBodies: numNullable,
  features: z.array(WaterFeatureSchema).default([]),
  nearestDistanceM: numNullable.optional(),
  securityIndex: numNullable,
  floodDischarge: numOrString,
  floodRisk: strNullable.optional(),
}).passthrough();

// ── Species ──────────────────────────────────────────────
const SpeciesGroupSchema = z.object({
  name: str,
  count: num,
}).passthrough();

const TopSpeciesSchema = z.object({
  name: str,
  scientificName: strNullable,
  group: strNullable,
  count: numNullable,
  photoUrl: strNullable,
}).passthrough();

const SpeciesTrendWindowSchema = z.object({
  label: str,
  count: numNullable,
}).passthrough();

const SpeciesSchema = z.object({
  total: numNullable,
  groups: z.array(SpeciesGroupSchema).default([]),
  top10: z.array(TopSpeciesSchema).default([]),
  threatened: numNullable,
  gbifTotal: numNullable,
  gbifKingdoms: z.array(SpeciesGroupSchema).default([]),
  trends: z.object({
    direction: strNullable,
    windows: z.array(SpeciesTrendWindowSchema).default([]),
  }).passthrough(),
}).passthrough();

// ── Fire / Flood / Drought ───────────────────────────────
const RiskSchema = z.object({
  riskScore: numNullable,
  riskLevel: strNullable,
}).passthrough();

const FireSchema = RiskSchema.extend({
  activeFires: numNullable,
  historical: z.array(z.object({
    year: numNullable,
    count: numNullable,
  }).passthrough()).default([]),
  peakYear: numNullable,
  seasonal: z.array(z.object({}).passthrough()).default([]),
}).passthrough();

// HAND-based flood risk fields (height above nearest drainage)
const FloodSchema = RiskSchema.extend({
  hand: numNullable.optional(),
  distanceToDrainageM: numNullable.optional(),
  drainageName: strNullable.optional(),
  drainageKind: strNullable.optional(),
}).passthrough();

// ── Energy ───────────────────────────────────────────────
const EnergyLevelSchema = z.object({
  level: strNullable,
  detail: strNullable,
  score: numNullable,
}).passthrough();

const EnergySchema = z.object({
  solar: EnergyLevelSchema,
  wind: EnergyLevelSchema,
  microHydro: EnergyLevelSchema,
  biomass: EnergyLevelSchema,
  independenceScore: numNullable,
}).passthrough();

// ── Economics ────────────────────────────────────────────
const EcosystemServiceSchema = z.object({
  name: str,
  value: numNullable,
  beneficiaries: strNullable.optional(),
}).passthrough();

const NPVScenarioSchema = z.object({
  name: str,
  npv: numNullable,
  assumptions: strNullable,
  riskLevel: strNullable,
  intervention: strNullable.optional(),
  uplift30yr: numNullable.optional(),
  annualUplift: numNullable.optional(),
}).passthrough();

const PremiumSchema = z.object({
  id: str,
  name: str,
  description: strNullable.optional(),
  source: strNullable.optional(),
  basis: strNullable.optional(),
  confidence: strNullable.optional(),
  matchType: strNullable.optional(),
  valueComposition: strNullable.optional(),
  annualLow: numNullable.optional(),
  annualMid: numNullable.optional(),
  annualHigh: numNullable.optional(),
  thirtyYearNpvLow: numNullable.optional(),
  thirtyYearNpvMid: numNullable.optional(),
  thirtyYearNpvHigh: numNullable.optional(),
  benefitCostRatio: numNullable.optional(),
}).passthrough();

const RevenueDetailSchema = z.object({
  scenario: str,
  systems: strNullable,
  annual: numNullable,
  investment: strNullable,
}).passthrough();

const RevenueLayerSchema = z.object({
  key: str,
  name: str,
  active: numNullable,
  realized: numNullable,
  monetizable: numNullable,
  carbonCredits: numNullable.optional(),
  premiumMarkets: numNullable.optional(),
  monetizableShare: numNullable,
  carbonShareOfMonetizable: numNullable.optional(),
}).passthrough();

const ImplicitScenarioSchema = z.object({
  key: str,
  name: str,
  total: numNullable,
  upliftVsBaseline: numNullable,
  components: z.object({
    regulating: numNullable,
    food: numNullable,
    cultural: numNullable,
    soil: numNullable,
    water: numNullable,
  }).passthrough(),
}).passthrough();

const LayerNpvRowSchema = z.object({
  key: str,
  name: str,
  realizedNpv: numNullable,
  monetizableNpv: numNullable,
  implicitNpv: numNullable,
  totalNpv: numNullable,
  upliftVsBau: numNullable,
}).passthrough();

const EconomicsSchema = z.object({
  valuePerHa: numNullable,
  totalValue: numNullable,
  ecosystemServices: z.object({
    total: numNullable,
    services: z.array(EcosystemServiceSchema).default([]),
  }).passthrough(),
  premiums: z.array(PremiumSchema).default([]).optional(),
  premiumMethodology: z.object({}).passthrough().optional(),
  npv: z.object({
    thirtyYear: numNullable,
    scenarios: z.array(NPVScenarioSchema).default([]),
    methodology: z.object({}).passthrough().optional(),
  }).passthrough(),
  revenueScenarios: z.object({
    conservative: numNullable,
    moderate: numNullable,
    optimized: numNullable,
    details: z.array(RevenueDetailSchema).default([]),
  }).passthrough(),
  revenueLayers: z.array(RevenueLayerSchema).default([]).optional(),
  implicitScenarios: z.array(ImplicitScenarioSchema).default([]).optional(),
  layerNpv: z.array(LayerNpvRowSchema).default([]).optional(),
  carbonStock: numNullable,
  carbonAnnualSeq: numNullable,
  carbonCreditValue: numNullable,
  carbonSeqRate: numNullable,
  carbonPriceEur: numNullable,
  carbonPriceDate: strNullable,
}).passthrough();

// ── Agriculture ──────────────────────────────────────────
const AgriSystemSchema = z.object({
  name: str,
  suitability: strNullable,
  description: strNullable,
}).passthrough();

const AgricultureSchema = z.object({
  landCover: strNullable,
  systems: z.array(AgriSystemSchema).default([]),
}).passthrough();

// ── Maps ─────────────────────────────────────────────────
const MapsSchema = z.object({
  satellite: strNullable,
  overview: strNullable,
  regional: strNullable,
  detail: strNullable,
}).passthrough();

// ── Regional ─────────────────────────────────────────────
const ProtectedAreaSchema = z.object({
  name: str,
  type: strNullable.optional(),
  designation: strNullable.optional(),
}).passthrough();

const RegionalSchema = z.object({
  protectedAreas: z.array(ProtectedAreaSchema).default([]),
  percentiles: z.record(z.string(), numNullable).default({}),
  averages: z.record(z.string(), numNullable).default({}),
  sampleCount: numNullable,
}).passthrough();

// ── Trends ───────────────────────────────────────────────
const FireProneDecadeSchema = z.object({
  decade: str,
  avgDays: numNullable,
}).passthrough();

const BioWindowSchema = z.object({
  label: str,
  d1: str,
  d2: str,
}).passthrough();

const GbifWindowSchema = z.object({
  label: str,
  yearStart: num,
  yearEnd: num,
}).passthrough();

const YearlyClimateSchema = z.object({
  year: num,
  meanTemp: numNullable,
  precip: numNullable,
}).passthrough();

const TrendsSchema = z.object({
  tempPerDecade: numNullable,
  precipPerDecade: numNullable,
  fireProneByDecade: z.array(FireProneDecadeSchema).default([]),
  yearly: z.array(YearlyClimateSchema).default([]),
  bioWindows: z.array(BioWindowSchema).default([]),
  gbifWindows: z.array(GbifWindowSchema).default([]),
}).passthrough();

// ── Compliance ───────────────────────────────────────────
const ComplianceItemSchema = z.object({
  name: str,
  description: strNullable,
  authority: strNullable,
  status: strNullable,
  notes: strNullable.optional(),
}).passthrough();

const ComplianceTimelineSchema = z.object({
  action: str,
  deadline: strNullable,
  priority: strNullable,
}).passthrough();

const ComplianceSchema = z.object({
  items: z.array(ComplianceItemSchema).default([]),
  timeline: z.array(ComplianceTimelineSchema).default([]),
  countryCode: strNullable,
}).passthrough();

// ── Actions ──────────────────────────────────────────────
const ActionSchema = z.object({
  action: str,
  category: strNullable,
  priority: strNullable,
  impact: strNullable,
}).passthrough();

const ActionsSchema = z.object({
  immediate: z.array(ActionSchema).default([]),
  shortTerm: z.array(ActionSchema).default([]),
  longTerm: z.array(ActionSchema).default([]),
}).passthrough();

// ── Meta ─────────────────────────────────────────────────
const MetaUncertaintySchema = z.object({
  interval: numNullable,
  confidence: numNullable,
  label: strNullable,
  completeness: numNullable,
  apisOk: numNullable,
  apisTotal: numNullable,
}).passthrough();

const MetaSchema = z.object({
  generatedAt: str,
  version: str,
  apiStatus: z.record(z.string(), str).default({}),
  missingFields: z.array(str).default([]),
  uncertainty: MetaUncertaintySchema,
}).passthrough();

// ── ReportData root ──────────────────────────────────────
export const ReportDataSchema = z.object({
  property: PropertySchema,
  scores: ScoresSchema,
  climate: ClimateSchema,
  terrain: TerrainSchema,
  soil: SoilSchema,
  geology: GeologySchema,
  water: WaterSchema,
  species: SpeciesSchema,
  fire: FireSchema,
  flood: FloodSchema,
  drought: RiskSchema,
  energy: EnergySchema,
  economics: EconomicsSchema,
  agriculture: AgricultureSchema,
  maps: MapsSchema,
  regional: RegionalSchema,
  trends: TrendsSchema,
  compliance: ComplianceSchema,
  actions: ActionsSchema,
  narratives: z.record(z.string(), z.unknown()).default({}),
  meta: MetaSchema,
}).passthrough();

/**
 * Validate a reportData object against the canonical schema.
 * Non-throwing — returns { ok, issues, data }.
 *
 * @param {unknown} data
 * @returns {{ ok: boolean, issues: Array<{ path: string, message: string }>, data?: import('zod').infer<typeof ReportDataSchema> }}
 */
export function validateReportData(data) {
  const result = ReportDataSchema.safeParse(data);
  if (result.success) {
    return { ok: true, issues: [], data: result.data };
  }
  const issues = result.error.issues.map((i) => ({
    path: i.path.map((p) => String(p)).join('.'),
    message: i.message,
  }));
  return { ok: false, issues };
}

/**
 * Per-domain validators — useful when you want to validate a single section
 * before assembling the whole reportData.
 */
export const DomainSchemas = {
  property: PropertySchema,
  scores: ScoresSchema,
  climate: ClimateSchema,
  terrain: TerrainSchema,
  soil: SoilSchema,
  geology: GeologySchema,
  water: WaterSchema,
  species: SpeciesSchema,
  fire: FireSchema,
  flood: FloodSchema,
  drought: RiskSchema,
  energy: EnergySchema,
  economics: EconomicsSchema,
  agriculture: AgricultureSchema,
  maps: MapsSchema,
  regional: RegionalSchema,
  trends: TrendsSchema,
  compliance: ComplianceSchema,
  actions: ActionsSchema,
  meta: MetaSchema,
};
