import { getCollection } from "@/lib/db";
import type {
  LandbookOverride,
  LandbookOverrideFields,
  ReportData,
} from "@/lib/types";

/**
 * Fetch the override row for a landbook (or null when none exists). Public —
 * the override values are what buyers see on the rendered report, so this is
 * looked up by landbookId alone (no ownership scoping at view time).
 */
export async function loadOverrideFields(
  landbookId: string
): Promise<LandbookOverrideFields | null> {
  const col = await getCollection<LandbookOverride>("landbook_overrides");
  const doc = await col.findOne({ landbookId });
  if (!doc?.fields) return null;
  return JSON.parse(JSON.stringify(doc.fields)) as LandbookOverrideFields;
}

function num(value: string | undefined): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[^\d.\-]/g, "");
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Apply agent overrides on top of ReportData. Returns a new object — does
 * not mutate the input. Each override field is parsed + scaled into the
 * underlying data model, so downstream section components keep reading
 * `data.property.area`, `data.economics.totalValue` etc. and just see the
 * agent's chosen value.
 *
 * Scaling cheat sheet (override is in display scale, data is in storage scale):
 *   - area:                   ha → ha (no conversion)
 *   - naturalCapital:         €   → €
 *   - longTermValue:          €   → €
 *   - waterSecurity:          0–10 → 0–10
 *   - biodiversityScore:      0–10 → ×10 → 0–100 (matches scores.biodiversity)
 *   - energyIndependence:     0–10 → ×10 → 0–100 (matches energy.independenceScore)
 *   - fireRisk / flood / drought: 1–5 → 1–5
 */
export function applyOverrides(
  data: ReportData,
  overrides: LandbookOverrideFields | null | undefined
): ReportData {
  if (!overrides) return data;

  // Deep-clone so caller's object isn't mutated. Cheap given the data size.
  const next = JSON.parse(JSON.stringify(data)) as ReportData;
  const f = overrides;

  if (typeof f.name === "string" && f.name.trim()) {
    next.property = { ...next.property, name: f.name.trim() };
  }

  const areaHa = num(f.area);
  if (areaHa != null) next.property = { ...next.property, area: areaHa };

  const totalValue = num(f.naturalCapital);
  if (totalValue != null) {
    next.economics = { ...next.economics, totalValue };
  }

  const ltv = num(f.longTermValue);
  if (ltv != null) {
    const existingNpv = next.economics?.npv || { thirtyYear: null, scenarios: [] };
    next.economics = {
      ...next.economics,
      npv: { ...existingNpv, thirtyYear: ltv },
    };
  }

  const waterSec = num(f.waterSecurity);
  if (waterSec != null) next.water = { ...next.water, securityIndex: waterSec };

  const bio = num(f.biodiversityScore);
  if (bio != null) {
    next.scores = { ...next.scores, biodiversity: bio * 10 };
  }

  const energy = num(f.energyIndependence);
  if (energy != null) {
    next.energy = { ...next.energy, independenceScore: energy * 10 };
  }

  const fire = num(f.fireRisk);
  if (fire != null) next.fire = { ...next.fire, riskScore: fire };

  const flood = num(f.floodRisk);
  if (flood != null) next.flood = { ...next.flood, riskScore: flood };

  const drought = num(f.droughtRisk);
  if (drought != null) next.drought = { ...next.drought, riskScore: drought };

  if (
    typeof f.narrativeIntro === "string" ||
    typeof f.narrativeCallout === "string"
  ) {
    const existing = next.narratives?.overview || {};
    const overview: Record<string, string | undefined> = { ...existing };
    if (typeof f.narrativeIntro === "string" && f.narrativeIntro.trim()) {
      overview.intro = f.narrativeIntro.trim();
    }
    if (typeof f.narrativeCallout === "string" && f.narrativeCallout.trim()) {
      overview.callout = f.narrativeCallout.trim();
    }
    next.narratives = { ...next.narratives, overview };
  }

  return next;
}
