import type { Terrain, Soil, Geology, Water, Climate, RiskData, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Gauge, Hairline, PercentileCard, DataTable, RiskBadge,
  PullQuote, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function LandWaterSection({
  terrain,
  soil,
  geology,
  water,
  climate,
  drought,
  narratives,
}: {
  terrain: Terrain;
  soil: Soil;
  geology: Geology;
  water: Water;
  climate: Climate;
  drought: RiskData;
  narratives?: { terrain?: Narratives["terrain"]; water?: Narratives["water"] };
}) {
  return (
    <section id="land-water">
      <SectionTitle title="Land & Water" />

      {narratives?.terrain?.description && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.terrain.description}
        </p>
      )}

      {/* 4.1 Terrain Analysis */}
      <SubsectionHeader id="4.1" title="Terrain Analysis" sources={["Pipeline"]} />
      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={terrain.elevation} unit="m" label="Elevation" />
        <KPI value={terrain.slope} unit="%" label="Slope" />
        <KPI value={terrain.aspect} label="Aspect" />
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
      <PlaceholderBox
        id="4.1"
        title="Microtopography analysis"
        status="NEW — DETAILED MICRO-TERRAIN DATA NOT YET AVAILABLE"
      />

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
      <PlaceholderBox
        id="4.2"
        title="Stability assessment & seismic notes"
        status="NEW — SEISMIC DATA NOT IN PIPELINE"
      />

      <Hairline />

      {/* 4.3 Soil Characterization */}
      <SubsectionHeader id="4.3" title="Soil Characterization" sources={["Pipeline"]} />
      <DataTable
        headers={["Soil Property", "Value"]}
        rows={[
          ["Classification", fmt(soil.classification)],
          ["pH", soil.ph != null ? soil.ph.toFixed(1) : "\u2014"],
          ["Organic Carbon", soil.organicCarbon != null ? `${soil.organicCarbon} g/kg` : "\u2014"],
          ["Clay / Sand / Silt", `${fmt(soil.clay != null ? `${soil.clay}%` : null)} / ${fmt(soil.sand != null ? `${soil.sand}%` : null)} / ${fmt(soil.silt != null ? `${soil.silt}%` : null)}`],
          ["Nitrogen", fmt(soil.nitrogen)],
          ["CEC", fmt(soil.cec)],
          ["Bulk Density", fmt(soil.bulkDensity)],
        ]}
      />
      <PlaceholderBox
        id="4.3"
        title="Agricultural capability classes & data quality flag"
        status="NEW — AG CAPABILITY CLASSIFICATION NOT YET COMPUTED"
      />

      <Hairline />

      {/* 4.4 Water Resources Inventory */}
      <SubsectionHeader id="4.4" title="Water Resources Inventory" sources={["Pipeline"]} />
      {narratives?.water?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.water.narrative}
        </p>
      )}
      <div className="grid grid-cols-3 gap-8 mb-8">
        <KPI value={water.springs} label="Springs" />
        <KPI value={water.wells} label="Wells" />
        <KPI value={water.waterways} label="Waterways" />
      </div>
      <PlaceholderBox
        id="4.4"
        title="Spring yields, seasonality, legal water rights, abstraction constraints"
        status="NEW — YIELD & RIGHTS DATA NOT IN PIPELINE"
      />

      <Hairline />

      {/* 4.5 Hydrological Systems */}
      <SubsectionHeader id="4.5" title="Hydrological Systems" sources={["Pipeline"]} />
      <DataTable
        headers={["Metric", "Value"]}
        rows={[
          ["Water Bodies", fmt(water.waterBodies)],
          ["Flood Discharge", fmt(water.floodDischarge)],
          ["Flood Risk", <RiskBadge key="flood" level={water.floodRisk} />],
          ["Annual Rainfall", climate.annualRainfall != null ? `${Math.round(climate.annualRainfall)} mm` : "\u2014"],
        ]}
      />
      <PlaceholderBox
        id="4.5"
        title="Subsurface flow mapping, wetland delineation, flood-prone zone analysis"
        status="NEW — SUBSURFACE & WETLAND DATA NOT YET AVAILABLE"
      />

      <Hairline />

      {/* 4.6 Water Security Assessment */}
      <SubsectionHeader id="4.6" title="Water Security Assessment" sources={["Computed"]} />
      <div className="flex justify-center mb-6">
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security Index" />
      </div>
      <PlaceholderBox
        id="4.6"
        title="Drought resilience, storage capacity, recharge rates, water quality parameters"
        status="PARTIAL — INDEX EXISTS, DETAILED BREAKDOWN IS NEW"
      />

      <PullQuote text={narratives?.terrain?.pullQuote || narratives?.water?.pullQuote} />
    </section>
  );
}
