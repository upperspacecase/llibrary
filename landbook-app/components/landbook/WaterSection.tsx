import type { Water, Climate, Narratives } from "@/lib/types";
import { SectionTitle, Gauge, KPI, Hairline, DataTable, RiskBadge, PullQuote } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function WaterSection({
  water,
  climate,
  narratives,
}: {
  water: Water;
  climate: Climate;
  narratives?: Narratives["water"];
}) {
  return (
    <section id="water">
      <SectionTitle title="Water" />

      {narratives?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.narrative}
        </p>
      )}

      <div className="flex justify-center mb-8">
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security Index" />
      </div>

      <Hairline />

      <div className="grid grid-cols-3 gap-8 mb-8">
        <KPI value={water.springs} label="Springs" />
        <KPI value={water.wells} label="Wells" />
        <KPI value={water.waterways} label="Waterways" />
      </div>

      <Hairline />

      <DataTable
        headers={["Metric", "Value"]}
        rows={[
          ["Water Bodies", fmt(water.waterBodies)],
          ["Flood Discharge", fmt(water.floodDischarge)],
          ["Flood Risk", <RiskBadge key="flood" level={water.floodRisk} />],
          [
            "Annual Rainfall",
            climate.annualRainfall != null ? `${Math.round(climate.annualRainfall)} mm` : "\u2014",
          ],
        ]}
      />

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
