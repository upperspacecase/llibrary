import type { Economics, Scores, Narratives, Meta } from "@/lib/types";
import {
  SectionTitle, HeroFigure, StackedBar, Hairline, DataTable, PullQuote,
  SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function ValueBenefitsSection({
  economics,
  scores,
  meta,
  narratives,
}: {
  economics: Economics;
  scores: Scores;
  meta: Meta;
  narratives?: Narratives["valueBenefits"];
}) {
  const es = economics.ecosystemServices || {} as Record<string, number>;
  const services = [
    { name: "Water", value: es.water || 0 },
    { name: "Food", value: es.food || 0 },
    { name: "Carbon", value: es.carbon || 0 },
    { name: "Regulation", value: es.regulation || 0 },
    { name: "Soil", value: es.soil || 0 },
    { name: "Cultural", value: es.cultural || 0 },
  ];
  const total = es.total || services.reduce((a, s) => a + s.value, 0);

  return (
    <section id="value-benefits">
      <SectionTitle title="Value & Benefits" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      {/* 7.1 Ecosystem Services Inventory */}
      <SubsectionHeader id="7.1" title="Ecosystem Services Inventory" sources={["Computed"]} />
      <StackedBar
        segments={services.filter((s) => s.value > 0)}
        totalLabel={`\u20ac${total.toLocaleString()}`}
        label="Valuation Composition"
      />

      <Hairline />

      {/* 7.2 Annual Flow Values */}
      <SubsectionHeader id="7.2" title="Annual Flow Values" sources={["Computed"]} />
      <DataTable
        headers={["Service", "Annual Value", "% of Total"]}
        rows={services.map((s) => [
          s.name,
          `\u20ac${s.value.toLocaleString()}`,
          total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : "0%",
        ])}
      />

      <Hairline />

      {/* 7.3 Asset Stock Valuation */}
      <SubsectionHeader id="7.3" title="Asset Stock Valuation" sources={["Computed"]} />
      <HeroFigure
        value={`\u20ac${fmt(economics.npv.thirtyYear?.toLocaleString())}`}
        label="Thirty-Year NPV"
      />
      {economics.npv?.scenarios?.length > 0 ? (
        <DataTable
          headers={["Scenario", "30-Year NPV", "Risk Level"]}
          rows={economics.npv.scenarios.map((s) => [
            fmt(s.name),
            `\u20ac${s.npv?.toLocaleString() ?? "\u2014"}`,
            fmt(s.riskLevel),
          ])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">Scenario NPV data not yet computed.</p>
      )}

      <Hairline />

      {/* 7.4 Value Composition Breakdown */}
      <SubsectionHeader id="7.4" title="Value Composition Breakdown" sources={["Computed"]} />
      <div className="space-y-3 mb-6">
        {services.filter((s) => s.value > 0).map((s) => (
          <div key={s.name} className="flex items-center gap-4">
            <div className="w-24 text-sm font-bold text-brand-forest">{s.name}</div>
            <div className="flex-1">
              <div className="h-2 bg-brand-sage/20 w-full">
                <div
                  className="h-full bg-brand-forest"
                  style={{ width: total > 0 ? `${(s.value / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <div className="w-16 text-right text-[10px] font-bold text-brand-sage">
              {total > 0 ? `${((s.value / total) * 100).toFixed(0)}%` : "0%"}
            </div>
          </div>
        ))}
      </div>

      <Hairline />

      {/* 7.5 Natural Capital Premium */}
      <SubsectionHeader id="7.5" title="Natural Capital Premium" sources={["NEW"]} />
      <PlaceholderBox
        id="7.5"
        title="Natural Capital Premium Estimates"
        status="DERIVED FROM ECOSYSTEM SERVICE VALUES"
        synthetic
      >
        {total > 0 && (
          <DataTable
            headers={["Intervention", "Estimated Uplift", "Annual Value"]}
            rows={[
              ["Active Stewardship", "+15\u201325%", `\u20ac${Math.round(total * 0.2).toLocaleString()}`],
              ["Ecological Restoration", "+20\u201340%", `\u20ac${Math.round(total * 0.3).toLocaleString()}`],
              ["Organic / FSC Certification", "+10\u201320%", `\u20ac${Math.round(total * 0.15).toLocaleString()}`],
              ["Agritourism / Branding", "+5\u201315%", `\u20ac${Math.round(total * 0.1).toLocaleString()}`],
            ]}
          />
        )}
      </PlaceholderBox>

      <Hairline />

      {/* 7.6 Valuation Methodology */}
      <SubsectionHeader id="7.6" title="Valuation Methodology" sources={["AI"]} />
      {/* Methodology text handled by static PlaceholderBox below */}
      <PlaceholderBox
        id="7.6"
        title="Valuation Methodology Detail"
        status="DERIVED FROM PIPELINE METHODOLOGY"
        synthetic
      >
        <div className="space-y-2 text-xs text-brand-charcoal/80">
          <p><span className="font-bold">Framework:</span> UN SEEA-EA (System of Environmental-Economic Accounting \u2014 Ecosystem Accounting)</p>
          <p><span className="font-bold">Transfer Protocol:</span> TEEB benefit-transfer rates by CORINE land cover class, adjusted to 2024 EUR</p>
          <p><span className="font-bold">Discount Rate:</span> 3.5% social discount rate (HM Treasury Green Book standard)</p>
          <p><span className="font-bold">Conservative Bias:</span> Lower-bound estimates used; excluded services without peer-reviewed valuation</p>
          <p><span className="font-bold">Carbon Pricing:</span> \u20ac65/tCO\u2082e reference (EU ETS shadow price)</p>
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 7.7 Value Confidence & Sensitivity */}
      <SubsectionHeader id="7.7" title="Value Confidence & Sensitivity" sources={["NEW"]} />
      {meta.uncertainty ? (
        <DataTable
          headers={["Metric", "Value"]}
          rows={[
            ["Confidence Level", `${meta.uncertainty.confidence}%`],
            ["Data Completeness", `${meta.uncertainty.completeness}%`],
            ["Uncertainty Interval", `\u00b1${meta.uncertainty.interval}%`],
            ["Quality Label", meta.uncertainty.label],
            ["APIs Reporting", `${meta.uncertainty.apisOk} of ${meta.uncertainty.apisTotal}`],
          ]}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">Uncertainty data not available.</p>
      )}

      {narratives?.callout && (
        <div className="border-l-[6px] border-brand-terracotta pl-8 py-4 my-8">
          <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
            &ldquo;{narratives.callout}&rdquo;
          </blockquote>
        </div>
      )}
    </section>
  );
}
