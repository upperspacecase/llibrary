import type { Economics, Scores, Narratives, Meta } from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, PullQuote,
  SubsectionHeader, Treemap,
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

  // Raw service values
  const water = es.water || 0;
  const food = es.food || 0;
  const carbon = es.carbon || 0;
  const regulation = es.regulation || 0;
  const soil = es.soil || 0;
  const cultural = es.cultural || 0;
  const total = es.total || (water + food + carbon + regulation + soil + cultural);

  // Treemap: fold carbon into regulating (5 blocks)
  const treemapSegments = [
    { name: "Food", value: food, color: "bg-brand-forest" },
    { name: "Water", value: water, color: "bg-brand-sage" },
    { name: "Regulating", value: regulation + carbon, color: "bg-brand-terracotta" },
    { name: "Soil", value: soil, color: "bg-brand-amber" },
    { name: "Cultural", value: cultural, color: "bg-brand-charcoal" },
  ];

  // Table: keep carbon separate with descriptive labels
  const tableServices = [
    { name: "Provisioning: Timber", value: food },
    { name: "Regulating: Carbon", value: carbon },
    { name: "Supporting: Soil Health", value: soil },
    { name: "Provisioning: Water", value: water },
    { name: "Other Services", value: regulation + cultural },
  ];

  return (
    <section id="value-benefits">
      <SectionTitle title="Value & Benefits" />

      {/* ── Key Metrics (2-col) ── */}
      <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div>
          <span className="text-sm font-body text-brand-forest/70 mb-2 block">
            Annual Natural Value
          </span>
          <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-5xl mb-8">
            {economics.totalValue != null
              ? `\u20ac${economics.totalValue.toLocaleString()}`
              : "\u2014"}
          </h2>
          {narratives?.intro && (
            <p className="text-sm leading-relaxed text-brand-forest/80 font-body max-w-2xl">
              {narratives.intro}
            </p>
          )}
        </div>
        {narratives?.callout && (
          <div className="border-l-4 border-brand-terracotta pl-6 py-2">
            <blockquote className="font-serif italic text-lg text-brand-forest leading-relaxed">
              &ldquo;{narratives.callout}&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* ── Composition of Services (Treemap) ── */}
      <h4 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">
        Composition of Services
      </h4>
      <Treemap segments={treemapSegments.filter((s) => s.value > 0)} />

      {/* ── Annual Flow Breakdown ── */}
      <div className="mb-20">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">
          Annual Flow Breakdown
        </h3>
        <DataTable
          headers={["Service Class", "Value (\u20ac)"]}
          rows={tableServices
            .filter((s) => s.value > 0)
            .map((s) => [
              s.name,
              s.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ])}
        />
      </div>

      {/* ── 7.3 Asset Stock Valuation ── */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-brand-sage font-body">7.3</span>
            <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body">
              Asset Stock Valuation
            </h3>
          </div>
          <span className="border border-brand-forest text-brand-forest text-[9px] font-bold px-1.5 py-0.5 tracking-widest uppercase">
            Computed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-2 font-body">
              Thirty-Year NPV
            </span>
            <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-4xl lg:text-[2.6rem]">
              {economics.npv.thirtyYear != null
                ? `\u20ac${economics.npv.thirtyYear.toLocaleString()}`
                : "\u2014"}
            </h2>
            <p className="text-xs mt-4 leading-relaxed text-brand-forest/70 font-body max-w-xs">
              Present value of all future ecosystem services discounted at 3.5% over a 30-year horizon.
            </p>
          </div>
          {narratives?.assetCallout && (
            <div className="flex items-center">
              <div className="border-l-4 border-brand-terracotta pl-8 py-4">
                <blockquote className="font-serif italic text-xl text-brand-forest leading-relaxed">
                  &ldquo;{narratives.assetCallout}&rdquo;
                </blockquote>
              </div>
            </div>
          )}
        </div>

        {economics.npv?.scenarios?.length > 0 ? (
          <table className="w-full text-left font-body text-sm">
            <thead>
              <tr className="border-b-[0.5px] border-brand-sage/40 pb-4 text-[9px] font-bold uppercase tracking-widest text-brand-sage">
                <th className="pb-4">Scenario</th>
                <th className="pb-4">30-Year NPV</th>
                <th className="pb-4 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-brand-sage/20">
              {economics.npv.scenarios.map((s) => (
                <tr key={s.name}>
                  <td className="py-6 font-bold text-brand-forest text-base">{fmt(s.name)}</td>
                  <td className="py-6 text-brand-charcoal text-base">
                    {s.npv != null ? `\u20ac${s.npv.toLocaleString()}` : "\u2014"}
                  </td>
                  <td className="py-6 text-right font-medium text-brand-forest">{fmt(s.riskLevel)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-brand-sage mb-6">Scenario NPV data not yet computed.</p>
        )}
      </div>

      {/* ── 7.5 Natural Capital Premium Estimates ── */}
      <div className="mb-20 p-8 bg-[#FAF7F2] border-[0.5px] border-brand-sage/20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-brand-terracotta font-body">7.5</span>
          <span className="bg-brand-terracotta/10 text-brand-terracotta text-[9px] font-bold px-2 py-0.5 tracking-widest uppercase">
            Synthetic Estimate
          </span>
        </div>
        <h3 className="font-serif text-xl font-bold text-brand-forest mb-1">
          Natural Capital Premium Estimates
        </h3>
        <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-8">
          Derived from Ecosystem Service Values
        </p>
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
      </div>

      {/* ── 7.6 Valuation Methodology ── */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-brand-sage font-body">7.6</span>
            <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body">
              Valuation Methodology
            </h3>
          </div>
          <span className="bg-brand-forest text-white text-[9px] font-bold px-1.5 py-0.5 tracking-widest uppercase">
            AI
          </span>
        </div>
        <div className="p-8 bg-[#FAF7F2] border-[0.5px] border-brand-sage/20 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-brand-terracotta font-body">7.6</span>
            <span className="bg-brand-terracotta/10 text-brand-terracotta text-[9px] font-bold px-2 py-0.5 tracking-widest uppercase">
              Synthetic Estimate
            </span>
          </div>
          <h4 className="font-serif text-lg font-bold text-brand-forest">
            Valuation Methodology Detail
          </h4>
          <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase pb-4 border-b border-brand-sage/20">
            Derived from Pipeline Methodology
          </p>
          <div className="space-y-4 pt-4 text-xs leading-relaxed text-on-surface">
            <p>
              <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Framework:</strong>
              UN SEEA-EA (System of Environmental-Economic Accounting &mdash; Ecosystem Accounting)
            </p>
            <p>
              <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Transfer Protocol:</strong>
              TEEB benefit-transfer rates by CORINE land cover class, adjusted to 2024 EUR
            </p>
            <p>
              <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Discount Rate:</strong>
              3.5% social discount rate (HM Treasury Green Book standard)
            </p>
            <p>
              <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Conservative Bias:</strong>
              Lower-bound estimates used; excluded services without peer-reviewed valuation
            </p>
            <p>
              <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Carbon Pricing:</strong>
              &euro;65/tCO&#x2082;e reference (EU ETS shadow price)
            </p>
          </div>
        </div>
      </div>

      {/* ── 7.7 Valuation Confidence & Sensitivity ── */}
      <div className="mb-20">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-brand-sage font-body">7.7</span>
            <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase font-body">
              Valuation Confidence &amp; Sensitivity
            </h3>
          </div>
          <span className="bg-brand-terracotta text-white text-[9px] font-bold px-1.5 py-0.5 tracking-widest uppercase">
            New
          </span>
        </div>

        {meta.uncertainty ? (
          <div className="w-full font-body text-brand-forest">
            {/* Header Row */}
            <div className="grid grid-cols-12 border-b-[0.5px] border-brand-sage/40 pb-4 text-[9px] font-bold uppercase tracking-widest text-brand-sage">
              <div className="col-span-4">Indicator</div>
              <div className="col-span-5 px-4">Confidence Level</div>
              <div className="col-span-3 text-right">Value</div>
            </div>

            {/* Overall Confidence */}
            <div className="grid grid-cols-12 items-center py-8 border-b-[0.5px] border-brand-sage/20">
              <div className="col-span-4">
                <h5 className="text-[11px] font-bold uppercase tracking-widest mb-1">Overall Confidence</h5>
                <span className="text-[11px] italic text-brand-sage/80">
                  {meta.uncertainty.confidence >= 80
                    ? "High Confidence"
                    : meta.uncertainty.confidence >= 50
                      ? "Medium Confidence"
                      : "Low Confidence"}
                </span>
              </div>
              <div className="col-span-5 px-4 flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-forest"
                    style={{ width: `${meta.uncertainty.confidence}%` }}
                  />
                </div>
                <span className="text-lg font-serif font-bold">{meta.uncertainty.confidence}%</span>
              </div>
              <div className="col-span-3 text-right font-bold">{meta.uncertainty.label}</div>
            </div>

            {/* Data Completeness */}
            <div className="grid grid-cols-12 items-center py-8 border-b-[0.5px] border-brand-sage/20">
              <div className="col-span-4">
                <h5 className="text-[11px] font-bold uppercase tracking-widest mb-1">Data Completeness</h5>
                <span className="text-[11px] italic text-brand-sage/80">
                  {meta.uncertainty.completeness >= 80
                    ? "High Completeness"
                    : meta.uncertainty.completeness >= 50
                      ? "Medium Completeness"
                      : "Low Completeness"}
                </span>
              </div>
              <div className="col-span-5 px-4 flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-forest"
                    style={{ width: `${meta.uncertainty.completeness}%` }}
                  />
                </div>
                <span className="text-lg font-serif font-bold">{meta.uncertainty.completeness}%</span>
              </div>
              <div className="col-span-3 text-right font-bold">
                {meta.uncertainty.apisOk} of {meta.uncertainty.apisTotal} APIs
              </div>
            </div>

            {/* Uncertainty Interval */}
            <div className="grid grid-cols-12 items-center py-8 border-b-[0.5px] border-brand-sage/20">
              <div className="col-span-4">
                <h5 className="text-[11px] font-bold uppercase tracking-widest mb-1">Uncertainty Interval</h5>
                <span className="text-[11px] italic text-brand-sage/80">
                  {meta.uncertainty.interval <= 10
                    ? "Narrow Range"
                    : meta.uncertainty.interval <= 25
                      ? "Moderate Range"
                      : "Wide Range"}
                </span>
              </div>
              <div className="col-span-5 px-4 flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-100 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-brand-forest"
                    style={{ width: `${Math.max(0, 100 - meta.uncertainty.interval * 2)}%` }}
                  />
                </div>
                <span className="text-lg font-serif font-bold">&plusmn;{meta.uncertainty.interval}%</span>
              </div>
              <div className="col-span-3 text-right font-bold">
                {meta.uncertainty.interval <= 10
                  ? "Low"
                  : meta.uncertainty.interval <= 25
                    ? "Medium"
                    : "High"}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-brand-sage mb-6">Uncertainty data not available.</p>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col items-center pb-10 mt-auto border-t-[0.5pt] border-brand-sage/50 pt-16">
        <div className="h-[0.5px] w-full max-w-[480px] bg-brand-sage my-4 opacity-50" />
        <div className="w-full max-w-[480px] space-y-4 mt-8 text-center">
          <p className="text-[11px] text-brand-sage leading-relaxed italic font-body">
            Valuations are updated quarterly based on regional biomass fluctuations and carbon market trends.
          </p>
        </div>
      </div>
    </section>
  );
}
