import type { Energy, Narratives } from "@/lib/types";
import { SectionTitle, Gauge, Hairline, DataTable, RecommendationBox } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function ResilienceSection({
  energy,
  narratives,
}: {
  energy: Energy;
  narratives?: Narratives["resilience"];
}) {
  const sources = [
    { label: "Solar", data: energy.solar || {} },
    { label: "Wind", data: energy.wind || {} },
    { label: "Micro-Hydro", data: energy.microHydro || {} },
    { label: "Biomass", data: energy.biomass || {} },
  ];

  return (
    <section id="resilience">
      <SectionTitle title="Resilience" />

      {narratives?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.narrative}
        </p>
      )}

      <div className="flex justify-center mb-8">
        <Gauge value={energy.independenceScore} max={10} color="forest" label="Energy Independence" />
      </div>

      <Hairline />

      <DataTable
        headers={["Energy Source", "Potential", "Detail"]}
        rows={sources.map((s) => {
          const d = s.data as Record<string, unknown>;
          return [
            s.label,
            fmt(d.level || d.score || d),
            fmt(d.detail || ""),
          ];
        })}
      />

      <RecommendationBox label="RECOMMENDATION" text={narratives?.recommendation} />
    </section>
  );
}
