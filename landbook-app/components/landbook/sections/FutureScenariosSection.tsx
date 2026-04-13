import type { Economics, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, StackedBar, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function FutureScenariosSection({
  economics,
  narratives,
}: {
  economics: Economics;
  narratives?: Narratives["futureScenarios"];
}) {
  const rev = economics.revenueScenarios || {} as Record<string, unknown>;
  const details = (rev.details as Array<{ name?: string; label?: string; value?: number; estimate?: number }>) || [];
  const scenarios = [
    { name: "Conservative", value: rev.conservative as number || 0 },
    { name: "Moderate", value: rev.moderate as number || 0 },
    { name: "Optimized", value: rev.optimized as number || 0 },
  ].filter((s) => s.value > 0);
  const npvScenarios = economics.npv?.scenarios || [];

  return (
    <section id="future-scenarios">
      <SectionTitle title="Future Scenarios" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-sage/30 italic">
            Revenue scenario comparison, investment-return logic, and carbon credit opportunity will appear here once narratives are generated.
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
              &ldquo;Scenario narrative pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* 11.1 Scenario Framework */}
      <SubsectionHeader id="11.1" title="Scenario Framework" sources={["Computed"]} />
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
      {(() => {
        const bau = Math.round(((rev.conservative as number) || 0) * 0.5);
        const allScenarios = [
          { name: "Business as Usual", value: bau, description: "No new investment; current trajectory maintained" },
          { name: "Conservative", value: (rev.conservative as number) || 0, description: "Low-risk improvements with minimal capital" },
          { name: "Moderate", value: (rev.moderate as number) || 0, description: "Balanced investment across diversified streams" },
          { name: "Optimized", value: (rev.optimized as number) || 0, description: "Full potential with significant upfront investment" },
        ].filter((s) => s.value > 0);
        return allScenarios.length > 0 ? (
          <DataTable
            headers={["Scenario", "Annual Revenue", "Description"]}
            rows={allScenarios.map((s) => [
              s.name,
              `€${s.value.toLocaleString()}`,
              s.description,
            ])}
          />
        ) : null;
      })()}

      <Hairline />

      {/* 11.2 30-Year NPV Comparison */}
      <SubsectionHeader id="11.2" title="30-Year NPV Comparison" sources={["Computed"]} />
      {npvScenarios.length > 0 ? (
        <DataTable
          headers={["Scenario", "30-Year NPV", "Risk Level"]}
          rows={npvScenarios.map((s) => [
            fmt(s.name),
            `\u20ac${s.npv?.toLocaleString() ?? "\u2014"}`,
            fmt(s.riskLevel),
          ])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">NPV scenario data not yet computed.</p>
      )}

      <Hairline />

      {/* 11.3 Scenario Assumptions */}
      <SubsectionHeader id="11.3" title="Scenario Assumptions" sources={["NEW"]} />
      <PlaceholderBox
        id="11.3"
        title="Scenario assumptions"
        status="DERIVED FROM revenue scenarios, NPV data, carbon values"
        synthetic
      >
        <DataTable
          headers={["Assumption", "Conservative", "Moderate", "Optimized"]}
          rows={[
            [
              "Annual revenue growth",
              "0–1%",
              "2–3%",
              "4–6%",
            ],
            [
              "Carbon price (€/tCO₂)",
              economics.carbonCreditValue && economics.carbonStock
                ? `€${Math.round((economics.carbonCreditValue / Math.max(1, economics.carbonStock * 0.05)) * 0.7)}`
                : "€25",
              economics.carbonCreditValue && economics.carbonStock
                ? `€${Math.round((economics.carbonCreditValue / Math.max(1, economics.carbonStock * 0.05)))}`
                : "€35",
              economics.carbonCreditValue && economics.carbonStock
                ? `€${Math.round((economics.carbonCreditValue / Math.max(1, economics.carbonStock * 0.05)) * 1.4)}`
                : "€50",
            ],
            ["Discount rate", "8%", "6%", "4%"],
            ["Management intensity", "Minimal", "Moderate", "High"],
            ["Climate risk adjustment", "None", "Partial hedge", "Full adaptation"],
          ]}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 11.4 Pathway Details */}
      <SubsectionHeader id="11.4" title="Pathway Details" sources={["NEW"]} />
      <PlaceholderBox
        id="11.4"
        title="Investment requirements and phasing"
        status="DERIVED FROM revenue scenarios (est. 1–3× annual revenue)"
        synthetic
      >
        {(() => {
          const cons = (rev.conservative as number) || 0;
          const mod = (rev.moderate as number) || 0;
          const opt = (rev.optimized as number) || 0;
          return (
            <DataTable
              headers={["Phase", "Timeline", "Est. Investment", "Target Scenario"]}
              rows={[
                [
                  "Phase 1 — Quick Wins",
                  "Year 1",
                  cons > 0 ? `€${Math.round(cons * 0.5).toLocaleString()}` : "—",
                  "Conservative baseline",
                ],
                [
                  "Phase 2 — Core Development",
                  "Years 2–3",
                  mod > 0 ? `€${Math.round((mod - cons) * 1.5).toLocaleString()}` : "—",
                  "Moderate diversification",
                ],
                [
                  "Phase 3 — Full Optimization",
                  "Years 3–5",
                  opt > 0 ? `€${Math.round((opt - mod) * 2).toLocaleString()}` : "—",
                  "Optimized potential",
                ],
              ]}
            />
          );
        })()}
      </PlaceholderBox>

      <Hairline />

      {/* 11.5 Revenue Opportunities */}
      <SubsectionHeader id="11.5" title="Revenue Opportunities" sources={["Computed"]} />
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
        <DataTable
          headers={["Revenue Stream", "Estimate"]}
          rows={details.map((item) => [
            fmt(item.name || item.label),
            `\u20ac${(item.value || item.estimate || 0).toLocaleString()}`,
          ])}
        />
      )}

      <Hairline />

      {/* 11.6 Scenario Risk Profiles */}
      <SubsectionHeader id="11.6" title="Scenario Risk Profiles" sources={["NEW"]} />
      <PlaceholderBox
        id="11.6"
        title="Uncertainty quantification and scenario spread"
        status="DERIVED FROM scenario range (conservative to optimized)"
        synthetic
      >
        {(() => {
          const cons = (rev.conservative as number) || 0;
          const mod = (rev.moderate as number) || 0;
          const opt = (rev.optimized as number) || 0;
          const spread = opt - cons;
          const spreadPct = cons > 0 ? Math.round((spread / cons) * 100) : 0;
          const downside = Math.round(cons * 0.5);
          return (
            <div className="space-y-3 text-sm text-brand-charcoal">
              <DataTable
                headers={["Metric", "Value"]}
                rows={[
                  ["Scenario spread (Optimized − Conservative)", spread > 0 ? `€${spread.toLocaleString()} (${spreadPct}% range)` : "—"],
                  ["Downside floor (BAU baseline)", downside > 0 ? `€${downside.toLocaleString()}/yr` : "—"],
                  ["Upside potential vs BAU", opt > 0 && downside > 0 ? `${Math.round(((opt - downside) / downside) * 100)}% improvement` : "—"],
                  ["Confidence band", spread > 0 ? `±${Math.round(spread / 2).toLocaleString()} around moderate (€${mod.toLocaleString()})` : "—"],
                ]}
              />
              {spread > 0 && (
                <p className="text-brand-sage text-xs">
                  Wider scenario spread indicates higher sensitivity to management decisions and investment levels.
                </p>
              )}
            </div>
          );
        })()}
      </PlaceholderBox>

    </section>
  );
}
