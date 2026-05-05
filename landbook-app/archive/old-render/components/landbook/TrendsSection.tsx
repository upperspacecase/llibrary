import type { Trends, Economics, Narratives } from "@/lib/types";
import { SectionTitle, Hairline, DataTable, RiskBadge } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function TrendsSection({
  trends,
  economics,
  narratives,
}: {
  trends: Trends;
  economics: Economics;
  narratives?: Narratives["temporal"];
}) {
  const npvScenarios = economics.npv?.scenarios || [];
  const fireDecades = trends.fireProneByDecade || [];

  return (
    <section id="trends">
      <SectionTitle title="Change Over Time" />

      {narratives?.dynamics && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.dynamics}
        </p>
      )}

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
            Temp Trend / Decade
          </div>
          <p className="text-[43px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.tempPerDecade != null
              ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}\u00b0C`
              : "\u2014"}
          </p>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
            Precip Trend / Decade
          </div>
          <p className="text-[43px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.precipPerDecade != null
              ? `${trends.precipPerDecade > 0 ? "+" : ""}${trends.precipPerDecade.toFixed(1)} mm`
              : "\u2014"}
          </p>
        </div>
      </div>

      {npvScenarios.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["NPV Scenario", "30-Year Value", "Risk"]}
            rows={npvScenarios.map((s) => [
              fmt(s.name),
              `\u20ac${s.npv?.toLocaleString() ?? "\u2014"}`,
              <RiskBadge key={s.name} level={s.riskLevel} />,
            ])}
          />
        </>
      )}

      {fireDecades.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Decade", "Fire-Prone Days"]}
            rows={fireDecades.map((t) => [
              fmt(t.decade || t.label),
              fmt(t.avgDays || t.days || t.value),
            ])}
          />
        </>
      )}
    </section>
  );
}
