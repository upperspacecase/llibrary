import type { Economics, Narratives } from "@/lib/types";
import { SectionTitle, KPI, StackedBar, Hairline, DataTable } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function OpportunitiesSection({
  economics,
  narratives,
}: {
  economics: Economics;
  narratives?: Narratives["opportunities"];
}) {
  const rev = economics.revenueScenarios || {} as Record<string, unknown>;
  const details = (rev.details as Array<{ name?: string; label?: string; value?: number; estimate?: number }>) || [];
  const scenarios = [
    { name: "Conservative", value: rev.conservative as number || 0 },
    { name: "Moderate", value: rev.moderate as number || 0 },
    { name: "Optimized", value: rev.optimized as number || 0 },
  ].filter((s) => s.value > 0);

  return (
    <section id="opportunities">
      <SectionTitle title="Opportunities" />

      {narratives?.comparison && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.comparison}
        </p>
      )}

      <div className="grid grid-cols-3 gap-8 mb-8">
        <KPI
          value={rev.conservative != null ? `\u20ac${(rev.conservative as number).toLocaleString()}` : null}
          unit="/yr"
          label="Conservative"
        />
        <KPI
          value={rev.moderate != null ? `\u20ac${(rev.moderate as number).toLocaleString()}` : null}
          unit="/yr"
          label="Moderate"
        />
        <KPI
          value={rev.optimized != null ? `\u20ac${(rev.optimized as number).toLocaleString()}` : null}
          unit="/yr"
          label="Optimized"
        />
      </div>

      {scenarios.length > 0 && <StackedBar segments={scenarios} label="Revenue Scenario Comparison" />}

      <Hairline />

      <div className="grid grid-cols-2 gap-8 mb-6">
        <KPI
          value={economics.carbonStock ? `${economics.carbonStock.toLocaleString()} tC` : null}
          label="Carbon Stock"
        />
        <KPI
          value={economics.carbonCreditValue ? `\u20ac${economics.carbonCreditValue.toLocaleString()}` : null}
          unit="/yr"
          label="Carbon Credit Value"
        />
      </div>

      {details.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Revenue Stream", "Estimate"]}
            rows={details.map((item) => [
              fmt(item.name || item.label),
              `\u20ac${(item.value || item.estimate || 0).toLocaleString()}`,
            ])}
          />
        </>
      )}
    </section>
  );
}
