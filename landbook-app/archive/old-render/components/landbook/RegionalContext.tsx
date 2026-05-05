import type { Regional, Narratives } from "@/lib/types";
import { SectionTitle, PercentileCard, Hairline, DataTable } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function RegionalContext({
  regional,
  narratives,
}: {
  regional: Regional;
  narratives?: Narratives["context"];
}) {
  const pctls = regional.percentiles || {};
  const areas = regional.protectedAreas || [];

  return (
    <section id="regional-context">
      <SectionTitle title="Regional Context" />

      {narratives?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.narrative}
        </p>
      )}

      <div className="space-y-8 mb-8">
        {pctls.soil != null && (
          <>
            <PercentileCard
              icon="landscape"
              value={`${pctls.soil}%`}
              suffix={pctls.soil > 50 ? "Above regional median" : "Below regional median"}
              description="Soil quality compared to properties within 15km radius."
            />
            <div className="hairline" />
          </>
        )}
        {pctls.carbon != null && (
          <>
            <PercentileCard
              icon="co2"
              value={`${pctls.carbon}%`}
              suffix={pctls.carbon > 50 ? "Above regional median" : "Below regional median"}
              description="Carbon sequestration capacity relative to neighboring land."
            />
            <div className="hairline" />
          </>
        )}
        {pctls.biodiversity != null && (
          <PercentileCard
            icon="forest"
            value={`${pctls.biodiversity}%`}
            suffix={pctls.biodiversity > 50 ? "Above regional median" : "Below regional median"}
            description="Species diversity compared to the surrounding bioregion."
          />
        )}
      </div>

      {areas.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Protected Area", "Type", "Designation"]}
            rows={areas.map((a) => [a.name, fmt(a.type), fmt(a.designation)])}
          />
        </>
      )}
    </section>
  );
}
