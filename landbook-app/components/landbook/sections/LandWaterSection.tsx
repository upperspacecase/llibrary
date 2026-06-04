import type { Terrain, Geology, Water, Climate, RiskData, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, DataTable,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const ASPECT_SHORTHAND: Record<string, string> = {
  "north-facing": "N.",
  "northeast-facing": "N.E.",
  "east-facing": "E.",
  "southeast-facing": "S.E.",
  "south-facing": "S.",
  "southwest-facing": "S.W.",
  "west-facing": "W.",
  "northwest-facing": "N.W.",
};

function aspectShort(value: string | null): string | null {
  if (!value) return value;
  return ASPECT_SHORTHAND[value.toLowerCase()] ?? value;
}

export function LandWaterSection({
  terrain,
  geology,
  water,
  climate,
  drought,
  narratives,
}: {
  terrain: Terrain;
  geology: Geology;
  water: Water;
  climate: Climate;
  drought: RiskData;
  narratives?: Narratives["landWater"];
}) {
  return (
    <section id="land-water">
      <SectionTitle title="Land & Water" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-sage/30 italic">
            Terrain, geology, and water resource analysis will appear here once narratives are generated.
          </p>
        )}

        {narratives?.callout ? (
          <div className="border-l-[6px] border-brand-terracotta pl-6">
            <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
              &ldquo;{narratives.callout}&rdquo;
            </blockquote>
          </div>
        ) : (
          <div className="border-l-[6px] border-brand-sage/20 pl-6">
            <blockquote className="text-brand-sage/30 leading-tight text-2xl font-serif italic">
              &ldquo;Land &amp; water narrative pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      <h2 className="font-serif text-[1.8525rem] font-bold text-brand-forest leading-tight mt-10 mb-6">
        Land
      </h2>
      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={terrain.elevation} unit="m" label="Elevation" />
        <KPI value={terrain.slope} unit="%" label="Slope" />
        <KPI value={aspectShort(terrain.aspect)} label="Aspect" />
        <KPI value={terrain.range} unit="m" label="Relief" />
      </div>
      {/* Slope icon + description removed — slope grade already shown on Region & Ecosystem */}
      {/* 4.1 Microtopography — COMMENTED OUT: no micro-DEM data
      <PlaceholderBox
        id="4.1"
        title="Microtopography analysis"
        status="NEW — DETAILED MICRO-TERRAIN DATA NOT YET AVAILABLE"
      />
      */}

      <Hairline />

      <DataTable
        headers={["Geology", "Value"]}
        rows={[
          ["Lithology", fmt(geology.lithology)],
          ["Environment", fmt(geology.environment)],
          ["Period", fmt(geology.period)],
          ["Age", fmt(geology.age)],
        ]}
      />
      {/* 4.2 Seismic — COMMENTED OUT: no seismic data in pipeline
      <PlaceholderBox
        id="4.2"
        title="Stability assessment & seismic notes"
        status="NEW — SEISMIC DATA NOT IN PIPELINE"
      />
      */}

      <Hairline />

      {/* 4.4 Water Resources Inventory */}
      <h2 className="font-serif text-[1.8525rem] font-bold text-brand-forest leading-tight mt-10 mb-2">
        Water
      </h2>
      <p className="text-[10px] font-bold tracking-[0.15em] text-brand-sage uppercase mb-6">
        DERIVED FROM WATER INDEX + DROUGHT RISK + PRECIPITATION
      </p>
      {/* Water narrative removed — intro covers both terrain and water context */}
      <div className="grid grid-cols-5 gap-8 mb-8">
        <KPI
          value={water.securityIndex != null ? water.securityIndex.toFixed(1).replace(/\.0$/, "") : "—"}
          unit="/10"
          label="Water Security"
        />
        <KPI
          value={climate.annualRainfall != null ? Math.round(climate.annualRainfall) : "—"}
          unit="mm"
          label="Annual Rainfall"
        />
        <KPI value={water.springs} label="Springs" />
        <KPI value={water.wells} label="Wells" />
        <KPI value={water.waterways} label="Waterways" />
      </div>
      {/* 4.4 Water rights — COMMENTED OUT: no yield/rights data in pipeline
      <PlaceholderBox
        id="4.4"
        title="Spring yields, seasonality, legal water rights, abstraction constraints"
        status="NEW — YIELD & RIGHTS DATA NOT IN PIPELINE"
      />
      */}

      <Hairline />

      <DataTable
        headers={["Component", "Indicator", "Assessment"]}
        rows={[
          ["Drought Resilience", drought.riskLevel ?? "\u2014", drought.riskScore != null && drought.riskScore <= 2 ? "Good" : "At risk"],
          ["Surface Water", `${water.waterways ?? 0} waterways, ${water.waterBodies ?? 0} bodies`, (water.waterways ?? 0) + (water.waterBodies ?? 0) > 2 ? "Adequate" : "Limited"],
          ["Groundwater Access", `${water.springs ?? 0} springs, ${water.wells ?? 0} wells`, (water.springs ?? 0) + (water.wells ?? 0) > 0 ? "Available" : "Unknown"],
          ["Annual Recharge", climate.annualRainfall != null ? `${Math.round(climate.annualRainfall)} mm/yr` : "\u2014",
            climate.annualRainfall != null ? (climate.annualRainfall > 600 ? "Good" : climate.annualRainfall > 400 ? "Moderate" : "Low") : "\u2014"],
        ]}
      />
    </section>
  );
}
