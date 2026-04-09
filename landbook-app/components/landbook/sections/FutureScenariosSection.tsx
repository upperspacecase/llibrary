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
  narratives?: Narratives["opportunities"];
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

      {narratives?.comparison && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.comparison}
        </p>
      )}

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
      <PlaceholderBox
        id="11.1"
        title="4-scenario framework: BAU, Climate Resilience, Conservation Restoration, Intensification"
        status="PARTIAL — 3 SCENARIOS EXIST (Conservative/Moderate/Optimized), 4TH FRAMEWORK IS NEW"
      />

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
        title="Management inputs, climate projections, price assumptions, risk exposure per scenario"
        status="NEW — AI-GENERATED ASSUMPTIONS TABLE NEEDED"
      />

      <Hairline />

      {/* 11.4 Pathway Details */}
      <SubsectionHeader id="11.4" title="Pathway Details" sources={["NEW"]} />
      <PlaceholderBox
        id="11.4"
        title="Investment requirements, timelines, milestones, phasing"
        status="ENTIRELY NEW — NO DATA OR COMPUTATION"
      />

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
        title="Uncertainty quantification, downside protection, optionality analysis"
        status="ENTIRELY NEW — NO COMPUTATION"
      />

      <Hairline />

      {/* 11.7 Decision Support */}
      <SubsectionHeader id="11.7" title="Decision Support" sources={["NEW"]} />
      <PlaceholderBox
        id="11.7"
        title="Multi-criteria analysis, preference weighting, sensitivity to price or risk"
        status="ENTIRELY NEW — NO COMPUTATION OR FRAMEWORK"
      />
    </section>
  );
}
