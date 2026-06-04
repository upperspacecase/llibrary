import type {
  Economics,
  Narratives,
  RevenueLayer,
  ImplicitScenarioRow,
} from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
  Donut,
  HorizontalStackedBar,
  VerticalStackedBars,
  CumulativeLineChart,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

const SCENARIO_ORDER = ["bau", "conservative", "moderate", "optimized"] as const;
const SCENARIO_LABELS: Record<string, string> = {
  bau: "Do nothing",
  conservative: "Conservative",
  moderate: "Moderate",
  optimized: "Optimized",
};
const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  bau: "No new investment; current trajectory maintained",
  conservative: "Low-risk improvements with minimal capital",
  moderate: "Balanced investment across diversified streams",
  optimized: "Full potential with significant upfront investment",
};
const SCENARIO_RISK: Record<string, string> = {
  bau: "Low",
  conservative: "Low",
  moderate: "Medium",
  optimized: "Medium-High",
};

// Top-level 3-layer palette used in the Today + By-scenario stacked bars.
const LAYER_FILLS = {
  implicit: "#1B3A2F",
  realized: "#C4705A",
  monetizable: "#D4A574",
};

// Tonal palette for the 7-segment donut: implicit cluster reads as a green
// progression, active layers carry the warm tones, so the eye groups the
// segments by layer without needing labels to do that work.
const COMPONENT_FILLS = {
  regulating: "#1B3A2F",
  food:       "#2E5A47",
  cultural:   "#5B7A6E",
  soil:       "#8B9A7E",
  water:      "#A8B8AB",
  realized:   "#C4705A",
  carbon:     "#D4A574",
  premium:    "#E5C499",
};


export function FutureScenariosSection({
  economics,
  narratives,
}: {
  economics: Economics;
  narratives?: Narratives["futureScenarios"];
}) {
  const rev = economics.revenueScenarios || ({} as Record<string, unknown>);
  const details = (rev.details as Array<{ scenario?: string; systems?: string; annual?: number; investment?: string }>) || [];
  const cons = (rev.conservative as number) || 0;
  const mod = (rev.moderate as number) || 0;
  const opt = (rev.optimized as number) || 0;

  // Layered scenarios — pulled from pipeline. Fall back to a local derivation
  // for older landbooks that pre-date the layered fields.
  const revenueLayers: RevenueLayer[] = economics.revenueLayers && economics.revenueLayers.length > 0
    ? economics.revenueLayers
    : SCENARIO_ORDER.map((key) => {
        const active = key === "bau" ? Math.round(cons * 0.5)
          : key === "conservative" ? cons
          : key === "moderate" ? mod
          : opt;
        const share = key === "bau" ? 0 : key === "conservative" ? 0.18 : key === "moderate" ? 0.45 : 0.55;
        const monetizable = Math.round(active * share);
        return { key, name: SCENARIO_LABELS[key], active, realized: active - monetizable, monetizable, monetizableShare: share };
      });

  const implicitScenarios: ImplicitScenarioRow[] = economics.implicitScenarios && economics.implicitScenarios.length > 0
    ? economics.implicitScenarios
    : [];

  const byKey = <T extends { key: string }>(arr: T[], key: string) => arr.find((r) => r.key === key);

  const baselineImplicitAnnual = byKey(implicitScenarios, "bau")?.total ?? economics.totalValue ?? 0;

  const stackedRows = SCENARIO_ORDER.map((key) => {
    const rev = byKey(revenueLayers, key);
    const imp = byKey(implicitScenarios, key);
    return {
      key,
      name: SCENARIO_LABELS[key],
      implicit: imp?.total ?? baselineImplicitAnnual,
      realized: rev?.realized ?? 0,
      monetizable: rev?.monetizable ?? 0,
    };
  }).filter((r) => r.implicit + r.realized + r.monetizable > 0);

  return (
    <section id="future-scenarios">
      <SectionTitle title="Future Scenarios" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
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

      {/* Methodology — three layers framing */}
      {baselineImplicitAnnual > 0 && (
        <div className="mb-12 max-w-3xl text-[14px] leading-relaxed text-brand-charcoal">
          <p>
            Land value is measured across three layers. <strong className="text-brand-forest">Realized agriculture</strong> is cash from production today. <strong className="text-brand-forest">Monetizable natural capital</strong> is value available through enrollment in carbon credits, premium markets, and similar schemes. <strong className="text-brand-forest">Implicit ecosystem services</strong> &mdash; the €{Math.round(baselineImplicitAnnual).toLocaleString()}/yr established in{" "}
            <a href="#value-benefits" className="underline decoration-brand-sage/40 underline-offset-2 hover:decoration-brand-forest">
              Value &amp; Benefits
            </a>{" "}
            &mdash; are services the land delivers regardless of monetization, broken across regulating, food, cultural, soil, and water. Each scenario below shows how interventions move value within and between these layers. Totals sum all three.
          </p>
        </div>
      )}

      {/* 11.1 Scenario Details — four visualization blocks (one story, three zoom levels) */}
      <h2 className="font-serif text-[1.95rem] font-bold text-brand-forest leading-tight mt-10 mb-6">
        Scenario Details
      </h2>

      {(() => {
        const bauRow = stackedRows.find((r) => r.key === "bau");
        const optRow = stackedRows.find((r) => r.key === "optimized");
        const bauTotal = bauRow ? bauRow.implicit + bauRow.realized + bauRow.monetizable : 0;
        const optTotal = optRow ? optRow.implicit + optRow.realized + optRow.monetizable : 0;
        const annualUplift = optTotal - bauTotal;

        // Realized labels per scenario — pulled from the agriculture-systems
        // detail rows the pipeline already emits. Each tier carries its own
        // "(improved)" / "(all optimized)" suffix.
        const findSystems = (scenarioName: string) =>
          details.find((d) => (d.scenario || "").toLowerCase() === scenarioName.toLowerCase())?.systems ?? null;
        const realizedLabelFor = (key: string): string => {
          if (key === "bau") return findSystems("Conservative") ?? "Current agriculture";
          const sys = findSystems(SCENARIO_LABELS[key] ?? "");
          return sys ?? `Agriculture (${SCENARIO_LABELS[key]?.toLowerCase()})`;
        };

        const todaySegments = bauRow ? [
          { key: "implicit",    label: "Implicit ecosystem services", value: bauRow.implicit,    fill: LAYER_FILLS.implicit },
          { key: "realized",    label: "Realized agriculture",        value: bauRow.realized,    fill: LAYER_FILLS.realized },
          { key: "monetizable", label: "Monetizable (carbon + premium)", value: bauRow.monetizable, fill: LAYER_FILLS.monetizable },
        ] : [];

        const layerKeys = [
          { key: "implicit",    label: "Implicit ecosystem services", fill: LAYER_FILLS.implicit },
          { key: "realized",    label: "Realized agriculture",        fill: LAYER_FILLS.realized },
          { key: "monetizable", label: "Monetizable (carbon + premium)", fill: LAYER_FILLS.monetizable },
        ];

        const scenarioGroups = stackedRows.map((r) => ({
          key: r.key,
          label: SCENARIO_LABELS[r.key] ?? r.key,
          segments: { implicit: r.implicit, realized: r.realized, monetizable: r.monetizable },
          total: r.implicit + r.realized + r.monetizable,
        }));

        // Donut segments for each scenario (Cons/Mod/Opt). 7-8 wedges:
        // 5 implicit ES classes + realized + carbon credits + premium markets.
        const donutScenarios = ["conservative", "moderate", "optimized"] as const;
        const donutFor = (key: string) => {
          const imp = byKey(implicitScenarios, key);
          const rev = byKey(revenueLayers, key);
          if (!imp || !rev) return null;
          const realizedLabel = realizedLabelFor(key);
          return {
            key,
            name: SCENARIO_LABELS[key],
            total: imp.total + rev.realized + rev.monetizable,
            segments: [
              { name: "Regulating",        value: imp.components.regulating, fill: COMPONENT_FILLS.regulating },
              { name: "Food provisioning", value: imp.components.food,       fill: COMPONENT_FILLS.food },
              { name: "Cultural",          value: imp.components.cultural,   fill: COMPONENT_FILLS.cultural },
              { name: "Soil",              value: imp.components.soil,       fill: COMPONENT_FILLS.soil },
              { name: "Water",             value: imp.components.water,      fill: COMPONENT_FILLS.water },
              { name: realizedLabel,       value: rev.realized,              fill: COMPONENT_FILLS.realized },
              { name: "Carbon credits",    value: rev.carbonCredits ?? rev.monetizable, fill: COMPONENT_FILLS.carbon },
              { name: "Premium markets",   value: rev.premiumMarkets ?? 0,   fill: COMPONENT_FILLS.premium },
            ],
          };
        };
        const donutData = donutScenarios.map(donutFor).filter((x): x is NonNullable<ReturnType<typeof donutFor>> => !!x);

        // 30-year cumulative — line per scenario at total annual × years.
        const cumulativeSeries = stackedRows.map((r) => {
          const total = r.implicit + r.realized + r.monetizable;
          return {
            key: r.key,
            label: `${SCENARIO_LABELS[r.key] ?? r.key} · €${Math.round(total * 30).toLocaleString()}`,
            annual: total,
            stroke:
              r.key === "bau" ? "#8B9A7E"
              : r.key === "conservative" ? "#A8B8AB"
              : r.key === "moderate" ? "#5B7A6E"
              : "#1B3A2F",
            dashed: r.key === "bau",
          };
        });

        return (
          <>
            {/* Block 1 — Today */}
            {bauRow && bauTotal > 0 && (
              <div className="mb-12">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">Today · annual</p>
                <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                  Your land has the potential to deliver €{Math.round(bauTotal).toLocaleString()} in value per year
                </p>
                <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                  Two active layers today — implicit ecosystem services and realized agriculture.
                </p>
                <HorizontalStackedBar segments={todaySegments} />
              </div>
            )}

            {/* Block 2 — By scenario */}
            {scenarioGroups.length > 0 && (
              <div className="mb-12">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">By scenario · annual</p>
                <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                  Interventions grow that to €{Math.round(optTotal).toLocaleString()}/yr under Optimized
                  {annualUplift > 0 && (
                    <span className="text-brand-sage font-body font-medium text-lg"> &mdash; a €{Math.round(annualUplift).toLocaleString()}/yr uplift</span>
                  )}
                </p>
                <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                  Same three layers, four management paths
                </p>
                {optRow && bauRow && annualUplift > 0 && (() => {
                  const dImplicit = Math.round(optRow.implicit - bauRow.implicit);
                  const dRealized = Math.round(optRow.realized - bauRow.realized);
                  const dMonetizable = Math.round(optRow.monetizable - bauRow.monetizable);
                  const cashUplift = dRealized + dMonetizable;
                  const contributors = [
                    { label: "higher implicit ecosystem services (long-term, modeled)", value: dImplicit, fill: LAYER_FILLS.implicit },
                    { label: "more realized agriculture (cash)", value: dRealized, fill: LAYER_FILLS.realized },
                    { label: "newly monetizable — carbon + premium (cash)", value: dMonetizable, fill: LAYER_FILLS.monetizable },
                  ].filter((c) => c.value > 0);
                  return (
                    <div className="mb-6">
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-3 font-body">
                        Where the €{Math.round(annualUplift).toLocaleString()}/yr uplift comes from
                      </p>
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        {contributors.map((c) => (
                          <div key={c.label} className="flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5" style={{ background: c.fill }} aria-hidden="true" />
                            <span className="text-[13px] text-brand-charcoal font-body">
                              <strong className="text-brand-forest">+€{c.value.toLocaleString()}</strong> {c.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {dImplicit > 0 && (
                        <p className="text-[12px] text-brand-sage italic font-body mt-3 leading-relaxed max-w-[640px]">
                          Near-term cash is the realized + monetizable layers (+€{cashUplift.toLocaleString()}/yr). The implicit increase is modeled ecosystem-service value (carbon storage, soil, water regulation) that builds as the land matures over years &mdash; it is not year-one cash.
                        </p>
                      )}
                    </div>
                  );
                })()}
                <VerticalStackedBars
                  groups={scenarioGroups}
                  segmentKeys={layerKeys}
                />
                <div className="mt-6">
                  <DataTable
                    headers={["Scenario", "Total annual value", "Uplift vs do nothing", "Risk", "What it involves"]}
                    rows={scenarioGroups.map((g) => {
                      const uplift = g.total - bauTotal;
                      return [
                        g.label,
                        `€${Math.round(g.total).toLocaleString()}`,
                        uplift > 0 ? `+€${Math.round(uplift).toLocaleString()}/yr` : "—",
                        SCENARIO_RISK[g.key] ?? "—",
                        SCENARIO_DESCRIPTIONS[g.key] ?? "",
                      ];
                    })}
                  />
                </div>
              </div>
            )}

            {/* Block 3 — What's inside each scenario */}
            {donutData.length > 0 && (
              <div className="mb-12">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">What&rsquo;s inside each scenario</p>
                <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-5">
                  Component composition by scenario
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {donutData.map((sc) => (
                    <div key={sc.key} className="flex flex-col">
                      <p className="text-[11px] font-bold tracking-widest uppercase text-brand-sage text-center mb-3 font-body">
                        {sc.name} · €{Math.round(sc.total).toLocaleString()}/yr
                      </p>
                      <Donut segments={sc.segments.filter((s) => s.value > 0)} size={200} thickness={42} showLegend={false} showPercentages />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 justify-center">
                  {[
                    { label: "Regulating",        fill: COMPONENT_FILLS.regulating },
                    { label: "Food provisioning", fill: COMPONENT_FILLS.food },
                    { label: "Cultural",          fill: COMPONENT_FILLS.cultural },
                    { label: "Soil",              fill: COMPONENT_FILLS.soil },
                    { label: "Water",             fill: COMPONENT_FILLS.water },
                    { label: "Realized agriculture", fill: COMPONENT_FILLS.realized },
                    { label: "Carbon credits",    fill: COMPONENT_FILLS.carbon },
                    { label: "Premium markets",   fill: COMPONENT_FILLS.premium },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2" style={{ background: l.fill }} aria-hidden="true" />
                      <span className="text-[10px] font-body text-brand-charcoal/80">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block 4 — Over 30 years */}
            {cumulativeSeries.length > 0 && (() => {
              const bauCum = (cumulativeSeries.find((s) => s.key === "bau")?.annual ?? 0) * 30;
              const optCum = (cumulativeSeries.find((s) => s.key === "optimized")?.annual ?? 0) * 30;
              return (
                <div className="mb-12">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">Over 30 years</p>
                  <p className="font-serif text-2xl font-bold text-brand-forest leading-tight mb-2">
                    Compounds to €{Math.round(optCum).toLocaleString()} under Optimized
                    {bauCum > 0 && (
                      <span className="text-brand-sage font-body font-medium text-lg"> vs €{Math.round(bauCum).toLocaleString()} doing nothing</span>
                    )}
                  </p>
                  <p className="text-[13px] text-brand-charcoal/80 font-body mb-5">
                    Cumulative undiscounted value at a constant annual rate &mdash; doing nothing is the downside floor. Discounted present value (3.5%) appears on Value &amp; Benefits.
                  </p>
                  <CumulativeLineChart series={cumulativeSeries} years={30} />
                </div>
              );
            })()}
          </>
        );
      })()}

      <Hairline />

      <SubsectionHeader id="11.3" title="Assumptions & detail" sources={["Computed"]} />

      {/* 11.4 Pathway Details */}
      <PlaceholderBox
        id="11.4"
        title="Investment requirements and phasing"
        status="DERIVED FROM revenue scenarios (est. 1–3× annual revenue)"
        variant="mixed"
        note="Revenue scenarios are real. Phase costs apply hardcoded multipliers (×0.5, ×1.5, ×2) to those revenues — illustrative phasing, not a costed plan. Payback = investment ÷ the incremental annual revenue it unlocks."
      >
        <DataTable
          headers={["Phase", "Timeline", "Est. Investment", "Est. Annual Return", "Payback", "Target Scenario"]}
          rows={(() => {
            const phases = [
              { name: "Phase 1 — Quick Wins", timeline: "Year 1", inv: cons > 0 ? cons * 0.5 : 0, ret: cons, target: "Conservative baseline" },
              { name: "Phase 2 — Core Development", timeline: "Years 2–3", inv: mod > 0 ? (mod - cons) * 1.5 : 0, ret: mod - cons, target: "Moderate diversification" },
              { name: "Phase 3 — Full Optimization", timeline: "Years 3–5", inv: opt > 0 ? (opt - mod) * 2 : 0, ret: opt - mod, target: "Optimized potential" },
            ];
            return phases.map((p) => [
              p.name,
              p.timeline,
              p.inv > 0 ? `€${Math.round(p.inv).toLocaleString()}` : "—",
              p.ret > 0 ? `+€${Math.round(p.ret).toLocaleString()}/yr` : "—",
              p.inv > 0 && p.ret > 0 ? `${(p.inv / p.ret).toFixed(1)} yr` : "—",
              p.target,
            ]);
          })()}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 11.5 Revenue Opportunities — with layer-targeted column */}
      <SubsectionHeader id="11.5" title="Revenue Opportunities" sources={["Computed"]} />
      {details.length > 0 && (
        <>
          <DataTable
            headers={["Scenario", "Systems", "Annual Revenue", "Investment", "Payback", "Layer Targeted"]}
            rows={details.map((item) => {
              const isConservative = (item.scenario || "").toLowerCase().includes("conservative");
              const layer = isConservative
                ? "Realized + Monetizable"
                : "Realized + Monetizable + Implicit";
              const annual = item.annual ?? 0;
              const invMatch = (item.investment || "").match(/[\d][\d,]*/);
              const invNum = invMatch ? Number(invMatch[0].replace(/,/g, "")) : null;
              const payback = invNum && invNum > 0 && annual > 0 ? `${(invNum / annual).toFixed(1)} yr` : "—";
              return [
                fmt(item.scenario),
                fmt(item.systems),
                `€${annual.toLocaleString()}/yr`,
                fmt(item.investment),
                payback,
                layer,
              ];
            })}
          />
          <p className="text-[11px] text-brand-sage italic font-body mt-4 leading-relaxed">
            Payback = investment ÷ annual revenue (low end of any investment range).
          </p>
        </>
      )}

    </section>
  );
}
