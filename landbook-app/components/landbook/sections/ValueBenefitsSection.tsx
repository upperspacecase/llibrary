import type { Economics, Scores, Narratives } from "@/lib/types";
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
  narratives,
}: {
  economics: Economics;
  scores: Scores;
  narratives?: { ecosystemServices?: Narratives["ecosystemServices"]; methodology?: Narratives["methodology"] };
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

      {narratives?.ecosystemServices?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.ecosystemServices.intro}
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
      <PlaceholderBox
        id="7.3"
        title="3-scenario NPV (Conservative / Baseline / Optimistic)"
        status="PARTIAL — SINGLE NPV EXISTS, 3-SCENARIO BREAKDOWN IS NEW"
      />

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
        title="Estimated uplift from stewardship, restoration, certifications, and branding"
        status="ENTIRELY NEW — NO COMPUTATION YET"
      />

      <Hairline />

      {/* 7.6 Valuation Methodology */}
      <SubsectionHeader id="7.6" title="Valuation Methodology" sources={["AI"]} />
      {narratives?.methodology?.text ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.methodology.text}
        </p>
      ) : (
        <p className="text-sm text-brand-sage mb-6">Methodology narrative not yet generated.</p>
      )}
      <PlaceholderBox
        id="7.6"
        title="UN SEEA-EA alignment detail, benefit-transfer protocols, conservative assumptions"
        status="PARTIAL — GENERAL METHODOLOGY TEXT EXISTS, SEEA-EA DETAIL IS NEW"
      />

      <Hairline />

      {/* 7.7 Value Confidence & Sensitivity */}
      <SubsectionHeader id="7.7" title="Value Confidence & Sensitivity" sources={["NEW"]} />
      <PlaceholderBox
        id="7.7"
        title="Data quality by component, uncertainty ranges, key sensitivity drivers"
        status="ENTIRELY NEW — NO COMPUTATION YET"
      />

      <PullQuote text={narratives?.ecosystemServices?.pullQuote} />
    </section>
  );
}
