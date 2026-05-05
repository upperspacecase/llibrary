import type { FireData, RiskData, Energy, Trends, Narratives } from "@/lib/types";
import {
  SectionTitle, RiskBadge, Hairline, DataTable,
  SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function RiskBar({
  label,
  value,
  max,
  barColor,
  assessment,
}: {
  label: string;
  value: number | null | undefined;
  max: number;
  barColor: string;
  assessment?: string;
}) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase font-body">
          {label}
        </p>
        <span className="text-xl font-bold font-serif text-brand-forest">
          {value != null ? `${value}/${max}` : "—"}
        </span>
      </div>
      <div className="h-2 w-full bg-brand-sage/20">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${Math.min((v / max) * 100, 100)}%` }}
        />
      </div>
      {assessment && (
        <p className="mt-2 text-[11px] text-brand-sage italic font-body">
          {assessment}
        </p>
      )}
    </div>
  );
}

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

/* ── Fire-Prone Days line graph (mirrors ClimateSeasonsSection) ── */

const FP_SVG_W = 1000;
const FP_SVG_H = 260;
const FP_PAD_X = 40;

function fpNiceMax(max: number, step: number): number {
  return Math.max(step, Math.ceil(max / step) * step);
}

function fpSmoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function FireProneDecadesChart({
  decades,
}: {
  decades: Array<{ label: string; value: number }>;
}) {
  if (decades.length < 2) return null;

  const max = fpNiceMax(Math.max(...decades.map((d) => d.value), 1), 10);
  const ySteps = Array.from({ length: 5 }, (_, i) => Math.round(max - (i * max) / 4));
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => f * FP_SVG_H);

  const points = decades.map((d, i) => ({
    x: FP_PAD_X + (i * (FP_SVG_W - 2 * FP_PAD_X)) / (decades.length - 1),
    y: FP_SVG_H - (d.value / max) * FP_SVG_H,
  }));

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-0.5 bg-brand-terracotta" />
        <span className="text-[9px] font-bold text-brand-sage/60 uppercase tracking-wider">
          Fire-Prone Days / Year
        </span>
      </div>

      <div className="relative flex flex-col justify-end h-[300px]">
        <div className="relative flex-1">
          {/* Y-axis labels (left) */}
          <div className="absolute inset-y-0 left-0 z-10 flex flex-col justify-between py-2 text-[8px] font-bold font-body pointer-events-none w-10">
            {ySteps.map((t, i) => (
              <span key={i} className="text-brand-sage/40">
                {t}
              </span>
            ))}
          </div>

          {/* Graph */}
          <div className="relative h-full w-full">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${FP_SVG_W} ${FP_SVG_H}`}>
              <g stroke="#8B9A7E" strokeOpacity={0.1} strokeWidth={0.5}>
                {gridYs.map((y) => (
                  <line key={y} x1={0} x2={FP_SVG_W} y1={y} y2={y} />
                ))}
              </g>
              <path
                d={fpSmoothPath(points)}
                fill="none"
                stroke="#C4705A"
                strokeLinecap="round"
                strokeWidth={3}
              />
              <g fill="#C4705A">
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={5} />
                ))}
              </g>
            </svg>
          </div>
        </div>

        <div className="flex justify-between px-10 text-[10px] font-bold text-brand-sage uppercase tracking-widest mt-4">
          {decades.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-brand-sage mt-4 italic font-body text-center">
        Average fire-prone days per year, by decade
      </p>
    </section>
  );
}

export function RisksResilienceSection({
  fire,
  flood,
  drought,
  energy,
  trends,
  narratives,
}: {
  fire: FireData;
  flood: RiskData;
  drought: RiskData;
  energy: Energy;
  trends: Trends;
  narratives?: Narratives["risksResilience"];
}) {
  const sources = [
    { label: "Solar", data: energy.solar || {} },
    { label: "Wind", data: energy.wind || {} },
    { label: "Micro-Hydro", data: energy.microHydro || {} },
    { label: "Biomass", data: energy.biomass || {} },
  ];
  const fireDecadesRaw = trends.fireProneByDecade || [];
  const fireDecades = fireDecadesRaw
    .map((t) => {
      const label = t.decade || t.label || "";
      const value = t.avgDays ?? t.days ?? t.value;
      return value != null && label ? { label, value } : null;
    })
    .filter((d): d is { label: string; value: number } => d !== null);

  // Resilience scores (computed)
  const droughtScore = drought.riskScore ?? 3;
  const waterSecurity = Math.max(1, 10 - droughtScore * 2);
  const avgRisk = ((fire.riskScore ?? 3) + (flood.riskScore ?? 3) + (drought.riskScore ?? 3)) / 3;
  const ecosystemBuffers = Math.max(1, Math.round(10 - avgRisk * 1.5));
  const eScore = energy.independenceScore ?? 3;
  const trendPenalty = trends.tempPerDecade != null && trends.tempPerDecade > 0.3 ? 2 : 0;
  const adaptiveCapacity = Math.max(1, Math.round(eScore - trendPenalty));

  const energyAssessment =
    energy.independenceScore != null
      ? energy.independenceScore >= 7
        ? "Strong — multiple renewable sources"
        : energy.independenceScore >= 4
          ? "Moderate — some off-grid potential"
          : "Low — grid-dependent"
      : undefined;
  const waterAssessment =
    droughtScore <= 2
      ? "Strong — low drought exposure"
      : droughtScore <= 3
        ? "Moderate — seasonal stress possible"
        : "Vulnerable — high drought risk";

  return (
    <section id="risks-resilience">
      <SectionTitle title="Risks & Resilience" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-sage/30 italic">
            Fire, flood, and drought risk interaction, energy independence potential, and practical risk implications will appear here once narratives are generated.
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
              &ldquo;Resilience narrative pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* 10.1 Risk Identification */}
      <SubsectionHeader id="10.1" title="Risk Identification" sources={["Pipeline"]} />
      <div className="grid grid-cols-3 gap-8 mb-8">
        <RiskBar label="Fire Risk" value={fire.riskScore} max={5} barColor="bg-brand-terracotta" />
        <RiskBar label="Flood Risk" value={flood.riskScore} max={5} barColor="bg-brand-amber" />
        <RiskBar label="Drought Risk" value={drought.riskScore} max={5} barColor="bg-brand-sage" />
      </div>
      <div className="grid grid-cols-3 gap-8 mb-8">
        <div className="text-center"><RiskBadge level={fire.riskLevel} /></div>
        <div className="text-center"><RiskBadge level={flood.riskLevel} /></div>
        <div className="text-center"><RiskBadge level={drought.riskLevel} /></div>
      </div>

      {/* Risk Scoring Matrix — moved under the risk indicators */}
      {(() => {
        const hazards = [
          { name: "Fire", score: fire.riskScore },
          { name: "Flood", score: flood.riskScore },
          { name: "Drought", score: drought.riskScore },
        ];
        const toLikelihood = (s: number | null) =>
          s == null ? "—" : s >= 4 ? "High" : s >= 3 ? "Medium" : "Low";
        const toImpact = (s: number | null) =>
          s == null ? "—" : s >= 4 ? "Severe" : s >= 3 ? "Moderate" : "Minor";
        return (
          <DataTable
            headers={["Hazard", "Score (0–5)", "Likelihood", "Impact", "Risk Rating"]}
            rows={hazards.map((h) => [
              h.name,
              h.score != null ? String(h.score) : "—",
              toLikelihood(h.score),
              toImpact(h.score),
              h.score != null
                ? h.score >= 4
                  ? "Critical"
                  : h.score >= 3
                    ? "Elevated"
                    : "Acceptable"
                : "—",
            ])}
          />
        );
      })()}

      <PlaceholderBox
        id="10.1"
        title="Pest/disease risks, market volatility, regulatory change risks"
        status="DERIVED FROM climate zone, risk scores, regional context"
        variant="mixed"
        note="Pest level is derived from the average of fire and drought risk scores (real). Market Volatility and Regulatory Change are hardcoded as 'Moderate' — defaults, not assessments."
      >
        <DataTable
          headers={["Risk Category", "Estimated Level", "Basis"]}
          rows={[
            [
              "Pest / Disease",
              (() => {
                const fireScore = fire.riskScore ?? 0;
                const droughtScoreRaw = drought.riskScore ?? 0;
                const avg = (fireScore + droughtScoreRaw) / 2;
                return avg >= 3.5 ? "High" : avg >= 2 ? "Moderate" : "Low";
              })(),
              "Warmer / drier climates correlate with higher pest pressure",
            ],
            ["Market Volatility", "Moderate", "Default estimate for rural land assets"],
            [
              "Regulatory Change",
              "Moderate",
              "Standard baseline — refine with local protected-area status",
            ],
          ]}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 10.3 Climate Risks */}
      <SubsectionHeader id="10.3" title="Climate Risks" sources={["Pipeline"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Temp Trend / Decade</div>
          <p className="text-[24px] font-black tracking-tighter text-brand-forest leading-none font-serif">
            {trends.tempPerDecade != null
              ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}°C`
              : "—"}
          </p>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip Trend / Decade</div>
          <p className="text-[24px] font-black tracking-tighter text-brand-forest leading-none font-serif">
            {trends.precipPerDecade != null
              ? `${trends.precipPerDecade > 0 ? "+" : ""}${trends.precipPerDecade.toFixed(1)} mm`
              : "—"}
          </p>
        </div>
      </div>
      {fireDecades.length >= 2 ? (
        <FireProneDecadesChart decades={fireDecades} />
      ) : fireDecades.length === 1 ? (
        <DataTable
          headers={["Decade", "Fire-Prone Days"]}
          rows={fireDecades.map((d) => [d.label, fmt(d.value)])}
        />
      ) : null}
      <PlaceholderBox
        id="10.3"
        title="Heat stress projections, extreme-event probability"
        status="DERIVED FROM trends.tempPerDecade, fire-prone days"
        variant="plausible"
      >
        <div className="space-y-3 text-sm text-brand-charcoal">
          {trends.tempPerDecade != null && (
            <>
              <p>
                <span className="font-bold">Projected warming (30 yr):</span>{" "}
                +{(trends.tempPerDecade * 3).toFixed(1)}°C above current baseline
              </p>
              <p>
                <span className="font-bold">Est. additional heat-stress days / yr:</span>{" "}
                {Math.round(trends.tempPerDecade * 3 * 8)}
                <span className="text-brand-sage ml-1">(~8 days per °C above threshold)</span>
              </p>
            </>
          )}
          {fireDecades.length >= 2 && (
            <p>
              <span className="font-bold">Fire-prone trend:</span>{" "}
              {(() => {
                const first = fireDecades[0];
                const last = fireDecades[fireDecades.length - 1];
                const diff = last.value - first.value;
                return diff > 0
                  ? `+${diff.toFixed(0)} fire-prone days from ${first.label} to ${last.label}`
                  : `${diff.toFixed(0)} fire-prone days (stable or improving)`;
              })()}
            </p>
          )}
          {trends.precipPerDecade != null && trends.precipPerDecade < 0 && (
            <p>
              <span className="font-bold">Drying trend:</span>{" "}
              {Math.abs(trends.precipPerDecade * 3).toFixed(0)} mm less rainfall projected over 30 years — increased drought event probability
            </p>
          )}
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 10.6 Resilience Capacity */}
      <SubsectionHeader id="10.6" title="Resilience Capacity" sources={["Computed"]} />
      <PlaceholderBox
        id="10.6"
        title="Resilience capacity metrics"
        status="DERIVED FROM energy.independenceScore, risk scores, trend data"
        variant="mixed"
        note="Energy Independence and Water Security come from real scores. Ecosystem Buffers (10 − avgRisk × 1.5) and Adaptive Capacity (energy − 2 if warming > 0.3°C) use hand-tuned formulas with no calibration."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          <RiskBar
            label="Water Security"
            value={waterSecurity}
            max={10}
            barColor="bg-brand-sage"
            assessment={waterAssessment}
          />
          <RiskBar
            label="Ecosystem Buffers"
            value={ecosystemBuffers}
            max={10}
            barColor="bg-brand-sage"
            assessment="Derived from combined hazard exposure"
          />
          <RiskBar
            label="Adaptive Capacity"
            value={adaptiveCapacity}
            max={10}
            barColor="bg-brand-sage"
            assessment="Based on infrastructure + climate trajectory"
          />
          <RiskBar
            label="Energy Independence"
            value={energy.independenceScore}
            max={10}
            barColor="bg-brand-forest"
            assessment={energyAssessment}
          />
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 10.7 Energy Independence Potential */}
      <SubsectionHeader id="10.7" title="Energy Independence Potential" sources={["Pipeline"]} />
      <DataTable
        headers={["Energy Source", "Potential", "Detail"]}
        rows={sources.map((s) => {
          const d = s.data as Record<string, unknown>;
          return [s.label, fmt(d.level || d.score || d), fmt(d.detail || "")];
        })}
      />

      {(fire.historical || []).length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Year", "Fire Detections"]}
            rows={fire.historical.map((h) => [String(h.year), fmt(h.count)])}
          />
        </>
      )}
    </section>
  );
}
