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
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-12">
          {narratives.terrain.description}
        </p>
      )}

      {/* 4.1 Terrain Analysis */}
      <SubsectionHeader id="4.1" title="Terrain Analysis" sources={["Pipeline"]} />
      <div className="grid grid-cols-4 gap-12 mb-12">
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
        title="Agricultural Capability Classification"
        status="DERIVED FROM SOIL TEXTURE + PH + SLOPE"
        synthetic
      >
        {(() => {
          const slopeClass = terrain.slope != null
            ? terrain.slope < 5 ? "I\u2013II" : terrain.slope < 15 ? "III\u2013IV" : terrain.slope < 30 ? "V\u2013VI" : "VII\u2013VIII"
            : null;
          const phClass = soil.ph != null
            ? soil.ph >= 5.5 && soil.ph <= 7.5 ? "Optimal" : soil.ph >= 4.5 ? "Marginal" : "Limiting"
            : null;
          const ocClass = soil.organicCarbon != null
            ? soil.organicCarbon > 20 ? "High fertility" : soil.organicCarbon > 10 ? "Moderate" : "Low \u2014 amendment needed"
            : null;
          return (
            <DataTable
              headers={["Factor", "Value", "Class"]}
              rows={[
                ["Slope", terrain.slope != null ? `${terrain.slope}%` : "\u2014", slopeClass ?? "\u2014"],
                ["Soil pH", soil.ph != null ? soil.ph.toFixed(1) : "\u2014", phClass ?? "\u2014"],
                ["Organic Carbon", soil.organicCarbon != null ? `${soil.organicCarbon} g/kg` : "\u2014", ocClass ?? "\u2014"],
                ["Texture", soil.clay != null ? `Clay ${soil.clay}% / Sand ${soil.sand}%` : "\u2014",
                  soil.clay != null ? (soil.clay > 40 ? "Heavy" : soil.clay > 25 ? "Medium" : "Light") : "\u2014"],
              ]}
            />
          );
        })()}
      </PlaceholderBox>

      <Hairline />

      {/* 4.4 Water Resources Inventory */}
      <SubsectionHeader id="4.4" title="Water Resources Inventory" sources={["Pipeline"]} />
      {narratives?.water?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8">
          {narratives.water.narrative}
        </p>
      )}
      <div className="grid grid-cols-3 gap-12 mb-12">
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
          ["Flood Risk", <RiskBadge key="flood" level={water.floodRisk} />],
          ["Annual Rainfall", climate.annualRainfall != null ? `${Math.round(climate.annualRainfall)} mm` : "\u2014"],
        ]}
      />

      <Hairline />

      {/* 4.6 Water Security Assessment */}
      <SubsectionHeader id="4.6" title="Water Security Assessment" sources={["Computed"]} />
      <div className="flex justify-center mb-8">
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security Index" />
      </div>
      <PlaceholderBox
        id="4.6"
        title="Water Security Breakdown"
        status="DERIVED FROM WATER INDEX + DROUGHT RISK + PRECIPITATION"
        synthetic
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

      <PullQuote text={narratives?.terrain?.pullQuote || narratives?.water?.pullQuote} />
    </section>
  );
}
