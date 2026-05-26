import type {
  Economics,
  Narratives,
  RevenueLayer,
  ImplicitScenarioRow,
  LayerNpvRow,
} from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

const SCENARIO_ORDER = ["bau", "conservative", "moderate", "optimized"] as const;
const SCENARIO_LABELS: Record<string, string> = {
  bau: "Business as Usual",
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

const LAYER_FILLS = {
  implicit: "#1B3A2F",
  realized: "#8B9A7E",
  monetizable: "#C4705A",
};

const ES_COMPONENT_ROWS: Array<{ key: keyof ImplicitScenarioRow["components"]; label: string; note: string }> = [
  { key: "regulating", label: "Regulating",        note: "Stewardship grows biomass and soil carbon" },
  { key: "food",       label: "Food provisioning", note: "Improved systems lift productivity" },
  { key: "cultural",   label: "Cultural",          note: "Stable across scenarios" },
  { key: "soil",       label: "Soil",              note: "Erosion control and nutrient cycling improve" },
  { key: "water",      label: "Water",             note: "Responds to buffer planting and infiltration work" },
];

/**
 * Stacked-column chart showing 30-year cumulative value per scenario, broken
 * into implicit / realized / monetizable layers. Constant annual rate per
 * layer assumed (matches the existing scenario model).
 */
function StackedScenarioChart({
  rows,
  years = 30,
}: {
  rows: Array<{
    key: string;
    name: string;
    implicit: number;
    realized: number;
    monetizable: number;
  }>;
  years?: number;
}) {
  const W = 760;
  const H = 320;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const cumulative = rows.map((r) => ({
    ...r,
    implicit30: r.implicit * years,
    realized30: r.realized * years,
    monetizable30: r.monetizable * years,
    total30: (r.implicit + r.realized + r.monetizable) * years,
  }));
  const maxY = Math.max(...cumulative.map((r) => r.total30), 1);
  const niceMax = Math.ceil(maxY / 50000) * 50000 || maxY;
  const yTicks = 5;

  const barCount = cumulative.length;
  const slot = innerW / barCount;
  const barW = Math.min(96, slot * 0.55);

  const yAt = (v: number) => padT + innerH - (v / niceMax) * innerH;

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h4 className="text-[10px] font-bold tracking-widest text-brand-forest uppercase">
          30-Year Cumulative Value · Stacked by Layer
        </h4>
        <p className="text-[10px] text-brand-sage uppercase tracking-widest">
          {years}-year horizon, constant annual rate
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Y gridlines + labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (niceMax / yTicks) * i;
          const y = yAt(v);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E5E0D3" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#8B9A7E">
                {`€${Math.round(v).toLocaleString()}`}
              </text>
            </g>
          );
        })}

        {/* Axis lines */}
        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />

        {/* Stacked bars */}
        {cumulative.map((r, i) => {
          const cx = padL + slot * (i + 0.5);
          const x = cx - barW / 2;
          const implicitY = yAt(r.implicit30);
          const implicitH = (padT + innerH) - implicitY;
          const realizedY = yAt(r.implicit30 + r.realized30);
          const realizedH = implicitY - realizedY;
          const monetY = yAt(r.total30);
          const monetH = realizedY - monetY;
          return (
            <g key={r.key}>
              <rect x={x} y={implicitY} width={barW} height={implicitH} fill={LAYER_FILLS.implicit} />
              <rect x={x} y={realizedY} width={barW} height={realizedH} fill={LAYER_FILLS.realized} />
              <rect x={x} y={monetY} width={barW} height={monetH} fill={LAYER_FILLS.monetizable} />
              <text x={cx} y={H - padB + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1B3A2F">
                {r.name}
              </text>
              <text x={cx} y={H - padB + 34} textAnchor="middle" fontSize={10} fill="#8B9A7E">
                {`€${Math.round(r.total30).toLocaleString()}`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-6 mt-3">
        {[
          { label: "Implicit ecosystem services", fill: LAYER_FILLS.implicit },
          { label: "Realized agriculture", fill: LAYER_FILLS.realized },
          { label: "Monetizable (carbon + premium)", fill: LAYER_FILLS.monetizable },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: l.fill }} />
            <span className="text-[10px] font-bold text-brand-forest tracking-wide">
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const layerNpv: LayerNpvRow[] = economics.layerNpv && economics.layerNpv.length > 0
    ? economics.layerNpv
    : [];

  const byKey = <T extends { key: string }>(arr: T[], key: string) => arr.find((r) => r.key === key);

  const baselineImplicitAnnual = byKey(implicitScenarios, "bau")?.total ?? economics.totalValue ?? 0;

  // Active layers (realized + monetizable) per scenario for the cards.
  const activeCards = SCENARIO_ORDER
    .filter((k) => k !== "bau")
    .map((k) => byKey(revenueLayers, k))
    .filter((x): x is RevenueLayer => !!x);

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
            Land value is measured across three layers. <strong className="text-brand-forest">Realized revenue</strong> is cash from agricultural production today. <strong className="text-brand-forest">Monetizable natural capital</strong> is value available through enrollment in carbon credits, premium markets, and similar schemes. <strong className="text-brand-forest">Implicit ecosystem services</strong> &mdash; the €{Math.round(baselineImplicitAnnual).toLocaleString()}/yr established in{" "}
            <a href="#value-benefits" className="underline decoration-brand-sage/40 underline-offset-2 hover:decoration-brand-forest">
              Value &amp; Benefits
            </a>{" "}
            &mdash; are services the land delivers regardless of monetization, broken across regulating, food, cultural, soil, and water. Each scenario below shows how interventions move value within and between these layers. Totals sum all three.
          </p>
        </div>
      )}

      {/* 11.1 Scenario Framework */}
      <SubsectionHeader id="11.1" title="Scenario Framework" sources={["Computed"]} />
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-4">
        Active revenue potential (realized + monetizable)
      </p>
      <div className="grid grid-cols-3 gap-8 mb-8">
        {activeCards.map((card) => (
          <KPI
            key={card.key}
            value={card.active > 0 ? `€${card.active.toLocaleString()}` : null}
            unit="/yr"
            label={card.name}
            size="sm"
          />
        ))}
      </div>

      {/* Stacked-layer chart */}
      {stackedRows.length > 0 && (
        <div className="mb-10">
          <StackedScenarioChart rows={stackedRows} />
        </div>
      )}

      {/* Layered scenario table */}
      {stackedRows.length > 0 && (
        <DataTable
          headers={["Scenario", "Realized agriculture", "Monetizable", "Implicit ecosystem services", "Total annual value", "Description"]}
          rows={stackedRows.map((r) => [
            r.name,
            r.realized > 0 ? `€${r.realized.toLocaleString()}` : "—",
            r.monetizable > 0 ? `€${r.monetizable.toLocaleString()}` : "—",
            `€${Math.round(r.implicit).toLocaleString()}`,
            `€${Math.round(r.implicit + r.realized + r.monetizable).toLocaleString()}`,
            SCENARIO_DESCRIPTIONS[r.key] ?? "",
          ])}
        />
      )}

      {/* Implicit decomposition sub-table */}
      {implicitScenarios.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-4">
            Implicit layer composition by scenario
          </p>
          <DataTable
            headers={[
              "Component",
              ...SCENARIO_ORDER.map((k) => SCENARIO_LABELS[k]),
              "Notes",
            ]}
            rows={ES_COMPONENT_ROWS.map((row) => {
              const cells: string[] = [row.label];
              for (const k of SCENARIO_ORDER) {
                const sc = byKey(implicitScenarios, k);
                const val = sc?.components?.[row.key] ?? null;
                cells.push(val != null ? `€${Math.round(val).toLocaleString()}` : "—");
              }
              cells.push(row.note);
              return cells;
            }).concat([
              [
                "Total implicit",
                ...SCENARIO_ORDER.map((k) => {
                  const sc = byKey(implicitScenarios, k);
                  return sc ? `€${Math.round(sc.total).toLocaleString()}` : "—";
                }),
                "",
              ],
            ])}
          />
        </div>
      )}

      <Hairline />

      {/* 11.2 30-Year NPV — total stack across all three layers */}
      <SubsectionHeader id="11.2" title="30-Year NPV — Total Stack" sources={["Computed"]} />
      {layerNpv.length > 0 ? (
        <DataTable
          headers={["Scenario", "Realized NPV", "Monetizable NPV", "Implicit NPV", "Total NPV", "Uplift vs BAU", "Risk Level"]}
          rows={layerNpv.map((row) => [
            row.name,
            `€${row.realizedNpv.toLocaleString()}`,
            `€${row.monetizableNpv.toLocaleString()}`,
            `€${row.implicitNpv.toLocaleString()}`,
            `€${row.totalNpv.toLocaleString()}`,
            row.upliftVsBau > 0 ? `+€${row.upliftVsBau.toLocaleString()}` : "—",
            SCENARIO_RISK[row.key] ?? "—",
          ])}
        />
      ) : economics.npv?.scenarios?.length ? (
        <DataTable
          headers={["Scenario", "30-Year NPV", "Risk Level"]}
          rows={economics.npv.scenarios.map((s) => [
            fmt(s.name),
            `€${s.npv?.toLocaleString() ?? "—"}`,
            fmt(s.riskLevel),
          ])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">NPV scenario data not yet computed.</p>
      )}
      <p className="text-[11px] text-brand-sage italic font-body mt-4 leading-relaxed">
        Total NPV reconciles with Value &amp; Benefits&rsquo; implicit-only NPV plus the discounted realized and monetizable annuals at 3.5%.
      </p>

      <Hairline />

      {/* 11.4 Pathway Details */}
      <PlaceholderBox
        id="11.4"
        title="Investment requirements and phasing"
        status="DERIVED FROM revenue scenarios (est. 1–3× annual revenue)"
        variant="mixed"
        note="Revenue scenarios are real. Phase costs apply hardcoded multipliers (×0.5, ×1.5, ×2) to those revenues — illustrative phasing, not a costed plan."
      >
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
      </PlaceholderBox>

      <Hairline />

      {/* 11.5 Revenue Opportunities — with layer-targeted column */}
      <SubsectionHeader id="11.5" title="Revenue Opportunities" sources={["Computed"]} />
      {details.length > 0 && (
        <DataTable
          headers={["Scenario", "Systems", "Annual Revenue", "Investment", "Layer Targeted"]}
          rows={details.map((item) => {
            const isConservative = (item.scenario || "").toLowerCase().includes("conservative");
            const layer = isConservative
              ? "Realized + Monetizable"
              : "Realized + Monetizable + Implicit";
            return [
              fmt(item.scenario),
              fmt(item.systems),
              `€${(item.annual ?? 0).toLocaleString()}`,
              fmt(item.investment),
              layer,
            ];
          })}
        />
      )}

      <Hairline />

      {/* 11.6 Scenario Risk Profiles */}
      <PlaceholderBox
        id="11.6"
        title="Uncertainty quantification and scenario spread"
        status="DERIVED FROM scenario range (conservative to optimized)"
        variant="mixed"
        note="Spread (Optimized − Conservative) is real. Downside floor (×0.5 of Conservative) and confidence band (±spread/2) are heuristic, not statistical."
      >
        {(() => {
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
