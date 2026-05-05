import type { Terrain, Geology, Water, Climate, RiskData, FloodData, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, PercentileCard, DataTable, RiskBadge,
  SubsectionHeader, PlaceholderBox,
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
  flood,
  narratives,
}: {
  terrain: Terrain;
  geology: Geology;
  water: Water;
  climate: Climate;
  drought: RiskData;
  flood: FloodData;
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

      {/* 4.1 Terrain Analysis */}
      <SubsectionHeader id="4.1" title="Terrain Analysis" sources={["Pipeline"]} />
      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={terrain.elevation} unit="m" label="Elevation" />
        <KPI value={terrain.slope} unit="%" label="Slope" />
        <KPI value={aspectShort(terrain.aspect)} label="Aspect" />
        <KPI value={terrain.range} unit="m" label="Relief" />
      </div>
      {terrain.slope != null && (
        <PercentileCard
          icon="terrain"
          value={`${terrain.slope}%`}
          suffix="Slope grade"
          description="The slope profile influences water runoff patterns, erosion risk, and agricultural suitability."
        />
      )}
      {/* 4.1 Microtopography — COMMENTED OUT: no micro-DEM data
      <PlaceholderBox
        id="4.1"
        title="Microtopography analysis"
        status="NEW — DETAILED MICRO-TERRAIN DATA NOT YET AVAILABLE"
      />
      */}

      <Hairline />

      {/* 4.2 Geological Foundation */}
      <SubsectionHeader id="4.2" title="Geological Foundation" sources={["Pipeline"]} />
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
      <SubsectionHeader id="4.4" title="Water Resources Inventory" sources={["Pipeline"]} />
      {/* Water narrative removed — intro covers both terrain and water context */}
      <div className="grid grid-cols-3 gap-8 mb-8">
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

      {/* 4.5 Hydrological Systems */}
      <SubsectionHeader id="4.5" title="Hydrological Systems" sources={["Pipeline"]} />
      <DataTable
        headers={["Metric", "Value"]}
        rows={[
          ["Water Bodies", fmt(water.waterBodies)],
          ["Flood Discharge", fmt(water.floodDischarge)],
          ["Flood Risk", <RiskBadge key="flood" level={flood.riskLevel} />],
          ["Annual Rainfall", climate.annualRainfall != null ? `${Math.round(climate.annualRainfall)} mm` : "\u2014"],
        ]}
      />

      <Hairline />

      {/* 4.6 Water Security Assessment */}
      <SubsectionHeader id="4.6" title="Water Security Assessment" sources={["Computed"]} />
      <div className="mb-8 max-w-[280px]">
        <div className="flex justify-between items-end mb-2">
          <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase font-body">
            Water Security
          </p>
          <span className="text-xl font-bold font-serif text-brand-forest">
            {water.securityIndex != null ? water.securityIndex.toFixed(1) : "\u2014"}
          </span>
        </div>
        <div className="h-2 w-full bg-brand-sage/20">
          <div
            className="h-full bg-brand-forest"
            style={{ width: `${Math.min((water.securityIndex || 0) * 10, 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-brand-sage mt-3 italic font-body">Catchment Resilience</p>
      </div>
      <PlaceholderBox
        id="4.6"
        title="Water Security Breakdown"
        status="DERIVED FROM WATER INDEX + DROUGHT RISK + PRECIPITATION"
        variant="plausible"
      >
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
      </PlaceholderBox>
    </section>
  );
}
