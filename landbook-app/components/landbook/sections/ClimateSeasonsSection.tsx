import type { Climate, Energy, Trends, Narratives } from "@/lib/types";
import { SectionTitle, Hairline } from "@/components/river";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ── SVG helpers ─────────────────────────────────────────────── */

const SVG_W = 1000;
const SVG_H = 300;
const BAR_W = 70;
const BAR_GAP = 13;
const BAR_START = 5;

/** Compute a nice ceiling that is a round number above the max value */
function niceMax(max: number, step: number): number {
  return Math.ceil(max / step) * step;
}

/** Map a value into SVG Y (0 = top, SVG_H = bottom) */
function toY(value: number, domainMax: number): number {
  return SVG_H - (value / domainMax) * SVG_H;
}

/** Generate a smooth cubic bezier path through 12 monthly points */
function smoothPath(values: number[], domainMax: number): string {
  const points = values.map((v, i) => {
    const x = BAR_START + i * (BAR_W + BAR_GAP) + BAR_W / 2;
    const y = toY(v, domainMax);
    return { x, y };
  });
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

/* ── Climate Chart component ─────────────────────────────────── */

function ClimateChart({
  precip,
  highs,
  lows,
}: {
  precip: number[];
  highs: number[];
  lows: number[];
}) {
  if (precip.length !== 12 || highs.length !== 12 || lows.length !== 12) return null;

  const maxPrecip = niceMax(Math.max(...precip, 1), 50);
  const maxTemp = niceMax(Math.max(...highs, 1), 10);

  // Y-axis label pairs: temp on left, precip on right
  const tempSteps = Array.from({ length: 5 }, (_, i) => Math.round(maxTemp - (i * maxTemp) / 4));
  const precipSteps = Array.from({ length: 5 }, (_, i) => Math.round(maxPrecip - (i * maxPrecip) / 4));
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((f) => f * SVG_H);

  return (
    <section className="mb-12">
      <div className="relative p-0 flex flex-col justify-end h-[360px]">
        {/* Legend */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-[#D4A574]" />
            <span className="text-[9px] font-bold text-brand-sage/60 uppercase tracking-wider">High Temp</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t border-dashed border-[#D4A574]" />
            <span className="text-[9px] font-bold text-brand-sage/60 uppercase tracking-wider">Low Temp</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#8B9A7E]" />
            <span className="text-[9px] font-bold text-brand-sage/60 uppercase tracking-wider">Rainfall</span>
          </div>
        </div>

        <div className="relative flex-1">
          {/* Centered Dual Y-Axis */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 flex flex-col justify-between py-2 text-[8px] font-bold font-body pointer-events-none w-24">
            {tempSteps.map((t, i) => (
              <div key={i} className="flex justify-between w-full px-2 bg-white/60 backdrop-blur-[2px]">
                <span className="text-brand-sage/40">{t}&deg;C</span>
                <span className="text-brand-sage/40">{precipSteps[i]}mm</span>
              </div>
            ))}
            <div className="absolute left-1/2 top-0 bottom-0 w-[0.5px] bg-outline-variant/50 -translate-x-1/2 -z-10" />
          </div>

          {/* Graph */}
          <div className="relative h-full w-full">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              {/* Grid lines */}
              <g stroke="#8B9A7E" strokeOpacity={0.1} strokeWidth={0.5}>
                {gridYs.map((y) => (
                  <line key={y} x1={0} x2={SVG_W} y1={y} y2={y} />
                ))}
              </g>
              {/* Rainfall bars */}
              <g fill="#8B9A7E" fillOpacity={1}>
                {precip.map((p, i) => {
                  const h = (p / maxPrecip) * SVG_H;
                  return (
                    <rect
                      key={i}
                      x={BAR_START + i * (BAR_W + BAR_GAP)}
                      y={SVG_H - h}
                      width={BAR_W}
                      height={h}
                    />
                  );
                })}
              </g>
              {/* High temp curve */}
              <path
                d={smoothPath(highs, maxTemp)}
                fill="none"
                stroke="#D4A574"
                strokeLinecap="round"
                strokeWidth={3}
              />
              {/* Low temp curve */}
              <path
                d={smoothPath(lows, maxTemp)}
                fill="none"
                stroke="#D4A574"
                strokeLinecap="round"
                strokeWidth={2}
                strokeDasharray="4"
                opacity={0.6}
              />
            </svg>
          </div>
        </div>

        {/* Month labels */}
        <div className="flex justify-between px-10 text-[10px] font-bold text-brand-sage uppercase tracking-widest mt-4">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-brand-sage mt-6 italic font-body text-center">
        Monthly rainfall (mm) and temperature patterns (&deg;C) &mdash; 30-year climate averages
      </p>
    </section>
  );
}

/* ── Seasonal Card ───────────────────────────────────────────── */

const SEASONS = [
  {
    period: "JAN \u2013 MAR",
    tag: "Recharge",
    description: "Groundwater replenishment via slow rainfall absorption.",
    icon: "water_drop",
    bg: "bg-[#F7F3EA]",
    text: "text-brand-forest",
    indices: [0, 1, 2],
  },
  {
    period: "APR \u2013 MAY",
    tag: "Growth",
    description: "Rapid biomass accumulation; peak photosynthesis.",
    icon: "eco",
    bg: "bg-[#1B3A2F]",
    text: "text-[#F7F3EA]",
    indices: [3, 4],
  },
  {
    period: "JUN \u2013 AUG",
    tag: "Dormancy",
    description: "Water conservation phase; high transpiration.",
    icon: "light_mode",
    bg: "bg-[#C4705A]",
    text: "text-[#F7F3EA]",
    indices: [5, 6, 7],
  },
  {
    period: "SEP \u2013 DEC",
    tag: "Harvest",
    description: "Seed maturation and organic decomposition.",
    icon: "inventory_2",
    bg: "bg-[#D4A574]",
    text: "text-[#F7F3EA]",
    indices: [8, 9, 10, 11],
  },
];

/* ── Main Component ──────────────────────────────────────────── */

export function ClimateSeasonsSection({
  climate,
  energy,
  trends,
  narratives,
}: {
  climate: Climate;
  energy: Energy;
  trends: Trends;
  narratives?: Narratives["climateSeasons"];
}) {
  const highs = climate.monthlyAvgHigh || [];
  const lows = climate.monthlyAvgLow || [];
  const precip = climate.monthlyPrecip || [];

  const solar = (energy.solar || {}) as Record<string, unknown>;
  const wind = (energy.wind || {}) as Record<string, unknown>;

  // Derived metrics
  const growingDays =
    climate.growingSeason != null ? Math.round(climate.growingSeason * 30.4) : null;
  const dryMonths =
    precip.length === 12 ? precip.filter((p) => p < 30).length : null;

  return (
    <section id="climate-seasons">
      <SectionTitle title="Climate & Seasons" />

      {/* ── Climate Chart ──────────────────────────────────── */}
      <ClimateChart precip={precip} highs={highs} lows={lows} />

      {/* ── Editorial Grid: Callout + KPIs ─────────────────── */}
      <section className="mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left: callout */}
          <div className="space-y-6">
            {narratives?.callout && (
              <div className="relative">
                <div className="border-l-[6px] border-brand-terracotta pl-8 py-4">
                  <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
                    &ldquo;{narratives.callout}&rdquo;
                  </blockquote>
                  <p className="mt-4 text-xs font-bold tracking-widest text-brand-sage uppercase font-body">
                    &mdash; Regional observation
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Growing Conditions */}
          <div className="space-y-12">
            <div className="space-y-8">
              <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase font-body border-b border-outline-variant pb-2">
                GROWING CONDITIONS
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-10">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {growingDays ?? "\u2014"}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Growing Days
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {climate.frostDays ?? "\u2014"}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Frost Days
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {climate.annualRainfall != null ? (
                      <>
                        {Math.round(climate.annualRainfall)}
                        <span className="text-sm font-medium ml-1">mm</span>
                      </>
                    ) : (
                      "\u2014"
                    )}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Annual Rainfall
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {dryMonths ?? "\u2014"}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Dry Months
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {String(wind.level || "\u2014")}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Wind Potential
                  </div>
                  {wind.detail != null && (
                    <div className="text-[9px] text-brand-sage italic">[{String(wind.detail)}]</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-brand-forest font-headline">
                    {String(solar.level || "\u2014")}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                    Solar Potential
                  </div>
                  {solar.detail != null && (
                    <div className="text-[9px] text-brand-sage italic">[{String(solar.detail)}]</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seasonal Patterns ──────────────────────────────── */}
      <section className="mb-20">
        <Hairline />
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mt-10 mb-10 font-body">
          SEASONAL PATTERNS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4">
          {SEASONS.map((s) => {
            const seasonalRain =
              precip.length === 12
                ? Math.round(s.indices.reduce((sum, idx) => sum + (precip[idx] ?? 0), 0))
                : null;
            return (
              <div
                key={s.period}
                className={`p-8 ${s.bg} ${s.text} flex flex-col justify-between min-h-[280px]`}
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">
                      {s.period}
                    </span>
                    <span className="material-symbols-outlined">{s.icon}</span>
                  </div>
                  <h4 className="font-headline italic text-xl mb-2">{s.tag}</h4>
                  <p className="text-sm opacity-80 leading-snug">{s.description}</p>
                </div>
                <div className="mt-auto">
                  <div className="font-bold font-headline text-sm">
                    {seasonalRain != null ? `${seasonalRain}mm` : "\u2014"}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                    Seasonal Rainfall
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Climate Trends ─────────────────────────────────── */}
      <section className="mb-10 pt-16 border-t-[0.5pt] border-outline-variant">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-10 font-body">
          CLIMATE TRENDS
        </h3>
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className="space-y-1">
            <div className="text-4xl font-bold text-brand-forest font-headline">
              {trends.tempPerDecade != null ? (
                <>
                  {trends.tempPerDecade > 0 ? "+" : ""}
                  {trends.tempPerDecade.toFixed(2)}
                  <span className="text-xl ml-1">&deg;C</span>
                </>
              ) : (
                "\u2014"
              )}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
              Temp Trend / Decade
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-4xl font-bold text-brand-forest font-headline">
              {trends.precipPerDecade != null ? (
                <>
                  {trends.precipPerDecade > 0 ? "+" : ""}
                  {trends.precipPerDecade.toFixed(1)}
                  <span className="text-xl ml-1">mm</span>
                </>
              ) : (
                "\u2014"
              )}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
              Precip Trend / Decade
            </div>
          </div>
        </div>

        {/* Narrative paragraphs — split intro on double-newline for two-column layout */}
        {narratives?.intro && (() => {
          const paragraphs = narratives.intro.split(/\n\n+/).filter(Boolean);
          return paragraphs.length > 1 ? (
            <div className="columns-1 md:columns-2 gap-12 space-y-6">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-on-surface font-body text-justify">
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-on-surface font-body text-justify max-w-prose">
              {paragraphs[0]}
            </p>
          );
        })()}
      </section>
    </section>
  );
}
