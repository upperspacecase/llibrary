import type {
  Economics,
  Scores,
  Narratives,
  Meta,
  ServiceBreakdownRow,
  ServiceSensitivity,
} from "@/lib/types";
import {
  SectionTitle, DataTable,
  Donut, PlaceholderBox,
} from "@/components/river";

const ES_LABELS: Record<string, { label: string; description: string }> = {
  regulating: { label: "Regulating", description: "Carbon storage, climate and flood regulation" },
  food:       { label: "Food",       description: "Forage, fruit, game and crop provision" },
  cultural:   { label: "Cultural",   description: "Recreation, amenity and landscape value" },
  soil:       { label: "Soil",       description: "Erosion control and nutrient cycling" },
  water:      { label: "Water",      description: "Supply, filtration and aquifer recharge" },
};

const ES_FILLS: Record<string, string> = {
  regulating: "#C4705A",
  food:       "#1B3A2F",
  cultural:   "rgba(27,58,47,0.55)",
  soil:       "#D4A574",
  water:      "#8B9A7E",
};

const FALLBACK_SENSITIVITY: Record<string, ServiceSensitivity> = {
  regulating: { tier: "High",   note: "Stewardship grows biomass and soil carbon" },
  food:       { tier: "High",   note: "Improved systems lift productivity" },
  cultural:   { tier: "Low",    note: "Stable across scenarios" },
  soil:       { tier: "Medium", note: "Responds to land management" },
  water:      { tier: "Medium", note: "Responds to buffer planting and infiltration work" },
};

function sensitivityFor(esClass: string, fromData: ServiceSensitivity | undefined, waterSecurity10: number | null): ServiceSensitivity {
  if (fromData) return fromData;
  if (esClass === "water" && waterSecurity10 != null && waterSecurity10 >= 9) {
    return { tier: "Low", note: `Already at site maximum (Water Security ${waterSecurity10.toFixed(1)}/10)` };
  }
  return FALLBACK_SENSITIVITY[esClass] ?? { tier: "—", note: "" };
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
  const es = economics.ecosystemServices || ({} as Record<string, number>);

  // Raw service values
  const water = es.water || 0;
  const food = es.food || 0;
  const carbon = es.carbon || 0;
  const regulation = es.regulation || 0;
  const soil = es.soil || 0;
  const cultural = es.cultural || 0;
  const computedTotal = water + food + carbon + regulation + soil + cultural;
  const total = es.total || computedTotal;

  // Service breakdown: prefer pipeline-built breakdown so sensitivity comes
  // from the same code path. Fall back to computing it from raw keyed values.
  const waterSecurity10 = scores.water != null ? scores.water / 10 : null;

  const breakdown: ServiceBreakdownRow[] = (() => {
    const fromPipeline = (economics.ecosystemServices as { breakdown?: ServiceBreakdownRow[] }).breakdown;
    if (fromPipeline && fromPipeline.length > 0) return fromPipeline;
    const order = ["regulating", "food", "cultural", "soil", "water"] as const;
    const values: Record<string, number> = {
      regulating: regulation + carbon,
      food,
      cultural,
      soil,
      water,
    };
    return order.map((key) => ({
      key,
      label: ES_LABELS[key].label,
      value: values[key],
      description: ES_LABELS[key].description,
      sensitivity: sensitivityFor(key, undefined, waterSecurity10),
    }));
  })();

  const donutSegments = breakdown.map((b) => ({
    name: b.label,
    value: b.value,
    fill: ES_FILLS[b.key] ?? "#8B9A7E",
  }));

  return (
    <section id="value-benefits">
      <SectionTitle title="Value & Benefits" />

      {/* ── Key Metrics (2-col) ── */}
      <div className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div>
          <span className="text-sm font-body text-brand-forest/70 mb-2 block">
            Annual Natural Capital
          </span>
          <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-5xl mb-8">
            {economics.totalValue != null
              ? `€${economics.totalValue.toLocaleString()}`
              : "—"}
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-brand-forest/80 font-body max-w-2xl">
            {narratives?.intro && <p>{narratives.intro}</p>}
            {total > 0 && (
              <p>
                This €{Math.round(total).toLocaleString()}/yr forms the implicit baseline layer of the property&rsquo;s total value stack &mdash; services delivered regardless of monetization.{" "}
                <a href="#future-scenarios" className="text-brand-forest underline decoration-brand-sage/40 underline-offset-2 hover:decoration-brand-forest">
                  Future Scenarios
                </a>{" "}
                shows how interventions can both enhance this baseline and unlock additional realized and monetizable layers on top.
              </p>
            )}
          </div>
        </div>
        {narratives?.callout && (
          <div className="border-l-4 border-brand-terracotta pl-6 py-2">
            <blockquote className="font-serif italic text-lg text-brand-forest leading-relaxed">
              &ldquo;{narratives.callout}&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* ── Value of Services (Donut) ── */}
      <div className="mb-20">
        <h4 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">
          Value of Services
        </h4>
        <Donut
          segments={donutSegments}
          centerLabel="Annual"
          centerValue={total > 0 ? `€${Math.round(total).toLocaleString()}` : undefined}
        />

        {total > 0 && (
          <>
            <p className="text-xs leading-relaxed text-brand-forest/80 font-body max-w-2xl mt-8 mb-6">
              Annual Natural Capital is split across five SEEA-EA service classes. The ring above is sized to each share of the total; the table below lists the same values plus the dynamic vs. static sensitivity each class shows under stewardship.
            </p>
            <DataTable
              headers={["Service Class", "What It Covers", "% Share", "Annual Value", "Intervention Sensitivity"]}
              rows={breakdown
                .filter((b) => b.value > 0)
                .sort((a, b) => b.value - a.value)
                .map((b) => {
                  const sens = sensitivityFor(b.key, b.sensitivity, waterSecurity10);
                  return [
                    b.label,
                    b.description,
                    `${Math.round((b.value / total) * 100)}%`,
                    `€${Math.round(b.value).toLocaleString()}`,
                    `${sens.tier} — ${sens.note}`,
                  ];
                })}
            />
          </>
        )}
      </div>

      {/* ── Scenario Assumptions ── */}
      <div className="mb-20">
        <h2 className="font-serif text-[1.8525rem] font-bold text-brand-forest leading-tight mb-2">
          Scenario assumptions
        </h2>
        <PlaceholderBox
          id="7.4"
          title=""
          status="DERIVED FROM revenue scenarios, NPV data, carbon values"
          variant="mixed"
          note="Carbon prices are computed from real economics data when available, with €25/€35/€50 fallbacks. Growth rates (0–6%), discount rates (4–8%), management intensity and climate-risk levels are hardcoded scenario labels."
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
      </div>

      {/* ── 7.6 Valuation Methodology ── */}
      <div className="mb-20">
        <h2 className="font-serif text-[1.8525rem] font-bold text-brand-forest leading-tight mb-2">
          Valuation Methodology
        </h2>
        <div className="space-y-4">
          <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase pb-4 border-b border-brand-sage/20">
            Derived from the following frameworks
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
      {meta.uncertainty && (
      <div className="mb-20">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase font-body mb-12">
          Valuation Confidence &amp; Sensitivity
        </h3>

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
      </div>
      )}

    </section>
  );
}
