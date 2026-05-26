import type {
  Economics,
  Scores,
  Narratives,
  Meta,
  Property,
  ServiceBreakdownRow,
  ServiceSensitivity,
  ImplicitScenarioRow,
} from "@/lib/types";
import {
  SectionTitle, DataTable,
  Donut, PlaceholderBox,
  HorizontalStackedBar,
  VerticalStackedBars,
  CumulativeLineChart,
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
  property,
  economics,
  scores,
  meta,
  narratives,
}: {
  property: Property;
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

  const implicitScenarios: ImplicitScenarioRow[] = economics.implicitScenarios ?? [];

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
          {property.area > 0 && economics.totalValue != null && economics.valuePerHa != null && (
            <p className="text-[11px] text-brand-sage italic font-body mt-3">
              €{economics.totalValue.toLocaleString()} ÷ {property.area.toFixed(2)} ha = €{economics.valuePerHa.toLocaleString()}/ha
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

      {/* ── Natural Capital Premium Estimates ── */}
      <div className="mb-20">
        <h3 className="font-serif text-xl font-bold text-brand-forest mb-1">
          Natural Capital Premium Estimates
        </h3>
        <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-8">
          TEEB DE 2018 Benefit Transfer · Per-Hectare Annual Uplift
        </p>

        {economics.premiums && economics.premiums.length > 0 ? (
          <>
            <DataTable
              headers={["Intervention", "Annual €/ha (low–high)", "Annual Uplift", "30-Yr NPV Uplift", "Source"]}
              rows={economics.premiums.map((p) => {
                const nameCell = p.matchType === "analogue" ? `${p.name} *` : p.name;
                if (p.basis === "per-hectare" && p.annualMid != null) {
                  const lowHa = (p as { annualPerHa?: { low: number; high: number } }).annualPerHa?.low;
                  const highHa = (p as { annualPerHa?: { low: number; high: number } }).annualPerHa?.high;
                  return [
                    nameCell,
                    lowHa != null && highHa != null
                      ? `€${lowHa.toLocaleString()}–${highHa.toLocaleString()}`
                      : "—",
                    `€${(p.annualMid ?? 0).toLocaleString()}/yr`,
                    `€${(p.thirtyYearNpvMid ?? 0).toLocaleString()}`,
                    p.source ?? "—",
                  ];
                }
                return [
                  nameCell,
                  p.benefitCostRatio ? `${p.benefitCostRatio}:1 BCR` : "—",
                  "qualitative",
                  "qualitative",
                  p.source ?? "—",
                ];
              })}
            />

            {/* Notes for BCR-only rows */}
            {economics.premiums.some((p) => p.basis === "benefit-cost-ratio") && (
              <div className="mt-6 space-y-2">
                {economics.premiums
                  .filter((p) => p.basis === "benefit-cost-ratio")
                  .map((p) => (
                    <p key={p.id} className="text-[11px] text-brand-sage italic font-body leading-relaxed">
                      <strong className="text-brand-forest not-italic">{p.name}:</strong>{" "}
                      {p.valueComposition}
                    </p>
                  ))}
              </div>
            )}

            {/* Analogue note — when any row is an analogue match */}
            {economics.premiums.some((p) => p.matchType === "analogue") && (
              <p className="text-[11px] text-brand-sage italic font-body mt-4 leading-relaxed">
                <span className="not-italic">*</span> Analogue rows apply a TEEB DE intervention&rsquo;s per-hectare values to a biome outside the original case-study scope; treat the figures as benchmarks rather than direct estimates. See per-row notes below.
              </p>
            )}

            {/* Per-row analogue notes */}
            {economics.premiums.some((p) => p.matchType === "analogue") && (
              <div className="mt-3 space-y-2">
                {economics.premiums
                  .filter((p) => p.matchType === "analogue")
                  .map((p) => {
                    const note = p.valueComposition?.split("— Analogue note: ")[1];
                    if (!note) return null;
                    return (
                      <p key={p.id} className="text-[11px] text-brand-sage italic font-body leading-relaxed">
                        <strong className="text-brand-forest not-italic">{p.name}:</strong>{" "}
                        {note}
                      </p>
                    );
                  })}
              </div>
            )}

            {/* Confidence note for any "lower" confidence rows */}
            {economics.premiums.some((p) => p.confidence === "lower") && (
              <p className="text-[11px] text-brand-sage italic font-body mt-4 leading-relaxed">
                Lower-confidence rows derive from aggregate national values rather than per-site case studies; treat as indicative.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-brand-sage italic">
            Premium estimates not yet computed — re-run the pipeline to populate.
          </p>
        )}
      </div>

      {/* ── Calculation Explanation ── */}
      {economics.premiumMethodology && (
        <div className="mb-20 p-8 bg-white border-[0.5px] border-brand-sage/30">
          <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body mb-6">
            How These Numbers Are Calculated
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed text-brand-charcoal font-body">
            <div className="space-y-3">
              <p>
                <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Source:</strong>
                {economics.premiumMethodology.source}
              </p>
              <p>
                <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Discount rate:</strong>
                {((economics.premiumMethodology.discountRate ?? 0.035) * 100).toFixed(1)}%
                {" — "}{economics.premiumMethodology.discountSource}
              </p>
              <p>
                <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Horizon:</strong>
                {economics.premiumMethodology.horizonYears ?? 30} years
              </p>
              <p>
                <strong className="text-brand-forest font-bold uppercase tracking-tighter mr-2">Annuity factor:</strong>
                {(economics.premiumMethodology.annuityFactor ?? 18.392).toFixed(3)}
              </p>
            </div>
            <div className="space-y-3">
              <p className="font-mono text-[11px] bg-[#FAF7F2] p-3 border-l-2 border-brand-terracotta">
                {economics.premiumMethodology.formula}
              </p>
              <p className="text-[11px] italic text-brand-sage">
                {economics.premiumMethodology.benefitTransferNote}
              </p>
            </div>
          </div>

          {/* Worked example for first quantitative premium, if any */}
          {economics.premiums?.some((p) => p.basis === "per-hectare" && p.annualMid != null) && (() => {
            const ex = economics.premiums!.find((p) => p.basis === "per-hectare" && p.annualMid != null)!;
            const exHa = (ex as { annualPerHa?: { mid: number } }).annualPerHa?.mid ?? 0;
            const af = economics.premiumMethodology?.annuityFactor ?? 18.392;
            const eligibleHa = ex.annualMid && exHa ? Math.round((ex.annualMid / exHa) * 100) / 100 : property.area;
            return (
              <div className="mt-6 pt-6 border-t border-brand-sage/20 text-xs font-body text-brand-charcoal">
                <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-2">
                  Worked Example — {ex.name}
                </p>
                <p className="font-mono text-[11px]">
                  {eligibleHa} ha × €{exHa}/ha/yr = €{(ex.annualMid ?? 0).toLocaleString()}/yr annual uplift
                </p>
                <p className="font-mono text-[11px]">
                  €{(ex.annualMid ?? 0).toLocaleString()}/yr × {af.toFixed(2)} = €{(ex.thirtyYearNpvMid ?? 0).toLocaleString()} 30-year NPV uplift
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Long Term Value — implicit-only mirror of the Future Scenarios 4-block layout ── */}
      <div className="mb-20">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body mb-12">
          Long Term Value
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-2 font-body">
              Thirty-Year Implicit NPV
            </span>
            <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-4xl lg:text-[2.6rem]">
              {economics.npv.thirtyYear != null
                ? `€${economics.npv.thirtyYear.toLocaleString()}`
                : "—"}
            </h2>
            {total > 0 && economics.npv.thirtyYear != null && (
              <p className="text-xs mt-4 leading-relaxed text-brand-forest/70 font-body max-w-xs">
                The 30-year NPV of the implicit ecosystem services layer alone
                (€{Math.round(total).toLocaleString()}/yr discounted at 3.5%).{" "}
                <a href="#future-scenarios" className="underline decoration-brand-sage/40 underline-offset-2 hover:decoration-brand-forest">
                  Future Scenarios
                </a>{" "}
                extends this with realized and monetizable layers and shows
                scenarios where the implicit baseline itself grows.
              </p>
            )}
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

        {(() => {
          // Five-class color palette — same tonal progression used in the
          // Future Scenarios donuts so the eye recognises the implicit cluster.
          const ES_FILLS = {
            regulating: "#1B3A2F",
            food:       "#2E5A47",
            cultural:   "#5B7A6E",
            soil:       "#8B9A7E",
            water:      "#A8B8AB",
          };
          const segmentKeys = [
            { key: "regulating", label: "Regulating",        fill: ES_FILLS.regulating },
            { key: "food",       label: "Food provisioning", fill: ES_FILLS.food },
            { key: "cultural",   label: "Cultural",          fill: ES_FILLS.cultural },
            { key: "soil",       label: "Soil",              fill: ES_FILLS.soil },
            { key: "water",      label: "Water",             fill: ES_FILLS.water },
          ];

          const byKey = (key: string) => implicitScenarios.find((r) => r.key === key);
          const bauRow = byKey("bau");
          const optRow = byKey("optimized");
          const bauTotal = bauRow?.total ?? 0;
          const optTotal = optRow?.total ?? 0;

          if (!bauRow || implicitScenarios.length === 0) {
            return (
              <p className="text-sm text-brand-sage italic">
                Implicit scenario data not yet computed — re-run the pipeline to populate.
              </p>
            );
          }

          const todaySegments = segmentKeys.map((sk) => ({
            key: sk.key,
            label: sk.label,
            value: bauRow.components[sk.key as keyof typeof bauRow.components] ?? 0,
            fill: sk.fill,
          }));

          const scenarioGroups = implicitScenarios.map((row) => ({
            key: row.key,
            label: row.name,
            segments: {
              regulating: row.components.regulating,
              food: row.components.food,
              cultural: row.components.cultural,
              soil: row.components.soil,
              water: row.components.water,
            },
            total: row.total,
          }));

          const donutScenarios = ["conservative", "moderate", "optimized"];
          const donutData = donutScenarios
            .map((k) => byKey(k))
            .filter((row): row is NonNullable<typeof row> => !!row)
            .map((row) => ({
              key: row.key,
              name: row.name,
              total: row.total,
              segments: segmentKeys.map((sk) => ({
                name: sk.label,
                value: row.components[sk.key as keyof typeof row.components] ?? 0,
                fill: sk.fill,
              })),
            }));

          const cumulativeSeries = implicitScenarios.map((row) => ({
            key: row.key,
            label: `${row.name} · €${Math.round(row.total * 30).toLocaleString()}`,
            annual: row.total,
            stroke:
              row.key === "bau" ? "#8B9A7E"
              : row.key === "conservative" ? "#A8B8AB"
              : row.key === "moderate" ? "#5B7A6E"
              : "#1B3A2F",
            dashed: row.key === "bau",
          }));

          return (
            <>
              {/* Block 1 — Today (implicit only) */}
              <div className="mb-12">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">Today</p>
                <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                  Ecosystem services deliver €{Math.round(bauTotal).toLocaleString()} this year
                </p>
                <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                  Five SEEA-EA classes: regulating, food, cultural, soil, water
                </p>
                <HorizontalStackedBar segments={todaySegments} />
              </div>

              {/* Block 2 — By scenario */}
              <div className="mb-12">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">By scenario</p>
                <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                  Stewardship grows that to €{Math.round(optTotal).toLocaleString()} under Optimized
                  {optTotal > bauTotal && (
                    <span className="text-brand-sage font-body font-medium text-lg"> &mdash; €{Math.round(optTotal - bauTotal).toLocaleString()} added to the implicit baseline</span>
                  )}
                </p>
                <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                  Same five classes, four management paths
                </p>
                <VerticalStackedBars
                  groups={scenarioGroups}
                  segmentKeys={segmentKeys}
                />
                <div className="mt-6">
                  <DataTable
                    headers={["Scenario", "Total implicit", "Uplift vs BAU", "Risk Level"]}
                    rows={implicitScenarios.map((row) => {
                      const uplift = row.total - bauTotal;
                      return [
                        row.name,
                        `€${Math.round(row.total).toLocaleString()}/yr`,
                        uplift > 0 ? `+€${Math.round(uplift).toLocaleString()}/yr` : "—",
                        row.key === "bau" ? "Low"
                          : row.key === "conservative" ? "Low"
                          : row.key === "moderate" ? "Medium"
                          : "Medium-High",
                      ];
                    })}
                  />
                </div>
              </div>

              {/* Block 3 — Components by scenario */}
              {donutData.length > 0 && (
                <div className="mb-12">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">Components by scenario</p>
                  <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-5">
                    Where the uplift lands
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {donutData.map((sc) => (
                      <div key={sc.key} className="flex flex-col">
                        <p className="text-[11px] font-bold tracking-widest uppercase text-brand-sage text-center mb-3 font-body">
                          {sc.name} · €{Math.round(sc.total).toLocaleString()}
                        </p>
                        <Donut segments={sc.segments.filter((s) => s.value > 0)} size={200} thickness={42} />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 justify-center">
                    {segmentKeys.map((sk) => (
                      <div key={sk.key} className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2" style={{ background: sk.fill }} aria-hidden="true" />
                        <span className="text-[10px] font-body text-brand-charcoal/80">{sk.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Block 4 — Over 30 years (implicit only, undiscounted) */}
              {cumulativeSeries.length > 0 && (() => {
                const bauCum = bauTotal * 30;
                const optCum = optTotal * 30;
                return (
                  <div className="mb-12">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">Over 30 years</p>
                    <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                      Compounds to €{Math.round(optCum).toLocaleString()} under Optimized
                      {bauCum > 0 && (
                        <span className="text-brand-sage font-body font-medium text-lg"> vs €{Math.round(bauCum).toLocaleString()} BAU</span>
                      )}
                    </p>
                    <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                      Cumulative undiscounted implicit value, constant annual rate. NPV reflected in the headline above uses the 3.5% discount rate.
                    </p>
                    <CumulativeLineChart series={cumulativeSeries} years={30} />
                  </div>
                );
              })()}
            </>
          );
        })()}

        <p className="text-[11px] text-brand-sage italic font-body mt-4 leading-relaxed">
          BAU holds the baseline; Conservative shows a small uplift from passive stewardship; Moderate and Optimized apply TEEB DE interventions at mid and high uplift respectively. Future Scenarios overlays realized and monetizable layers on this baseline.
        </p>
      </div>

      {/* ── Scenario Assumptions ── */}
      <div className="mb-20">
        <PlaceholderBox
          id="7.4"
          title="Scenario assumptions"
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
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body mb-8">
          Valuation Methodology
        </h3>
        <div className="space-y-4">
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
