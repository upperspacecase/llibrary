import type { Economics, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const SCENARIO_COLORS: Record<string, string> = {
  "Business as Usual": "#2C2C2C",
  Conservative: "#8B9A7E",
  Moderate: "#D4A574",
  Optimized: "#1B3A2F",
};

function RevenueTrajectoryChart({
  series,
  years = 30,
}: {
  series: Array<{ name: string; annual: number }>;
  years?: number;
}) {
  const W = 720;
  const H = 280;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxY = Math.max(...series.map((s) => s.annual * years), 1);
  const niceMax = Math.ceil(maxY / 10000) * 10000 || maxY;
  const yTicks = 4;
  const xTicks = 6;

  const xAt = (yr: number) => padL + (yr / years) * innerW;
  const yAt = (val: number) => padT + innerH - (val / niceMax) * innerH;

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h4 className="text-[10px] font-bold tracking-widest text-brand-forest uppercase">
          Revenue Scenario Comparison
        </h4>
        <p className="text-[10px] text-brand-sage uppercase tracking-widest">
          30-Year Cumulative Revenue
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (niceMax / yTicks) * i;
          const y = yAt(v);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E5E0D3" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#8B9A7E">
                {`\u20ac${Math.round(v).toLocaleString()}`}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const yr = (years / xTicks) * i;
          const x = xAt(yr);
          return (
            <text key={`x${i}`} x={x} y={H - padB + 16} textAnchor="middle" fontSize={10} fill="#8B9A7E">
              Yr {Math.round(yr)}
            </text>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />
        {series.map((s) => {
          const stroke = SCENARIO_COLORS[s.name] || "#8B9A7E";
          const x1 = xAt(0);
          const y1 = yAt(0);
          const x2 = xAt(years);
          const y2 = yAt(s.annual * years);
          return (
            <g key={s.name}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} />
              <circle cx={x2} cy={y2} r={3} fill={stroke} />
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-6 mt-3">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-3 h-[2px]" style={{ background: SCENARIO_COLORS[s.name] || "#8B9A7E" }} />
            <span className="text-[10px] font-bold text-brand-forest tracking-wide">
              {`${s.name} \u00b7 \u20ac${(s.annual * years).toLocaleString()} over ${years}y`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-brand-sage mt-4 max-w-2xl">
        Each line plots cumulative undiscounted revenue under steady annual delivery
        (annual revenue \u00d7 years) over a {years}-year horizon. Slope reflects the
        annual rate of each scenario; endpoints show total revenue captured. Discounted
        present value is shown separately in 11.2.
      </p>
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
  const rev = economics.revenueScenarios || {} as Record<string, unknown>;
  const details = (rev.details as Array<{ name?: string; label?: string; value?: number; estimate?: number }>) || [];
  const npvScenarios = economics.npv?.scenarios || [];
  const cons = (rev.conservative as number) || 0;
  const mod = (rev.moderate as number) || 0;
  const opt = (rev.optimized as number) || 0;
  const bau = Math.round(cons * 0.5);
  const trajectorySeries = [
    { name: "Business as Usual", annual: bau },
    { name: "Conservative", annual: cons },
    { name: "Moderate", annual: mod },
    { name: "Optimized", annual: opt },
  ].filter((s) => s.annual > 0);

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

      {/* 11.1 Scenario Framework */}
      <SubsectionHeader id="11.1" title="Scenario Framework" sources={["Computed"]} />
      <div className="grid grid-cols-3 gap-8 mb-8">
        <KPI
          value={rev.conservative != null ? `\u20ac${(rev.conservative as number).toLocaleString()}` : null}
          unit="/yr"
          label="Conservative"
          size="sm"
        />
        <KPI
          value={rev.moderate != null ? `\u20ac${(rev.moderate as number).toLocaleString()}` : null}
          unit="/yr"
          label="Moderate"
          size="sm"
        />
        <KPI
          value={rev.optimized != null ? `\u20ac${(rev.optimized as number).toLocaleString()}` : null}
          unit="/yr"
          label="Optimized"
          size="sm"
        />
      </div>
      {trajectorySeries.length > 0 && (
        <div className="mb-6">
          <RevenueTrajectoryChart series={trajectorySeries} />
        </div>
      )}
      {(() => {
        const allScenarios = [
          { name: "Business as Usual", value: bau, description: "No new investment; current trajectory maintained" },
          { name: "Conservative", value: cons, description: "Low-risk improvements with minimal capital" },
          { name: "Moderate", value: mod, description: "Balanced investment across diversified streams" },
          { name: "Optimized", value: opt, description: "Full potential with significant upfront investment" },
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

      {/* 11.4 Pathway Details */}
      <SubsectionHeader id="11.4" title="Pathway Details" sources={["NEW"]} />
      <PlaceholderBox
        id="11.4"
        title="Investment requirements and phasing"
        status="DERIVED FROM revenue scenarios (est. 1–3× annual revenue)"
        synthetic
      >
        {(() => {
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
