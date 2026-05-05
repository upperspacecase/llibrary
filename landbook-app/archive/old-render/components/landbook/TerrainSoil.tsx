import type { Terrain, Soil, Geology, Narratives } from "@/lib/types";
import { SectionTitle, KPI, Hairline, PercentileCard, DataTable, PullQuote } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function TerrainSoil({
  terrain,
  soil,
  geology,
  narratives,
}: {
  terrain: Terrain;
  soil: Soil;
  geology: Geology;
  narratives?: Narratives["terrain"];
}) {
  return (
    <section id="terrain-soil">
      <SectionTitle title="Terrain & Soil" />

      {narratives?.description && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.description}
        </p>
      )}

      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={terrain.elevation} unit="m" label="Elevation" />
        <KPI value={terrain.slope} unit="%" label="Slope" />
        <KPI value={terrain.aspect} label="Aspect" />
        <KPI value={terrain.range} unit="m" label="Relief" />
      </div>

      <Hairline />

      {terrain.slope != null && (
        <>
          <PercentileCard
            icon="terrain"
            value={`${terrain.slope}%`}
            suffix="Slope grade"
            description="The slope profile influences water runoff patterns, erosion risk, and agricultural suitability."
          />
          <Hairline />
        </>
      )}

      <DataTable
        headers={["Soil Property", "Value"]}
        rows={[
          ["Classification", fmt(soil.classification)],
          ["pH", soil.ph != null ? soil.ph.toFixed(1) : "\u2014"],
          ["Organic Carbon", soil.organicCarbon != null ? `${soil.organicCarbon} g/kg` : "\u2014"],
          [
            "Clay / Sand / Silt",
            `${fmt(soil.clay != null ? `${soil.clay}%` : null)} / ${fmt(soil.sand != null ? `${soil.sand}%` : null)} / ${fmt(soil.silt != null ? `${soil.silt}%` : null)}`,
          ],
          ["Nitrogen", fmt(soil.nitrogen)],
          ["CEC", fmt(soil.cec)],
          ["Bulk Density", fmt(soil.bulkDensity)],
        ]}
      />

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

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
