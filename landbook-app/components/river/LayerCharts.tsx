/**
 * Shared chart primitives for the three-layer value model used across
 * Value & Benefits and Future Scenarios. Same SVG approach as the rest
 * of the report — no third-party chart deps. Brand palette only.
 */

export interface StackedSegment {
  key: string;
  label: string;
  value: number;
  fill: string;
}

interface LegendItem {
  label: string;
  fill: string;
}

function Legend({ items, dense = false }: { items: LegendItem[]; dense?: boolean }) {
  return (
    <div className={`flex flex-wrap ${dense ? "gap-3" : "gap-5"} mt-3`}>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="inline-block shrink-0"
            style={{ width: dense ? 8 : 10, height: dense ? 8 : 10, backgroundColor: it.fill }}
            aria-hidden="true"
          />
          <span className={`${dense ? "text-[10px]" : "text-[11px]"} font-body text-brand-charcoal/80`}>
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Horizontal stacked bar (single row) ──────────────────── */

export function HorizontalStackedBar({
  segments,
  height = 72,
  showLegend = true,
}: {
  segments: StackedSegment[];
  height?: number;
  showLegend?: boolean;
}) {
  const filtered = segments.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  return (
    <div className="w-full">
      <div
        className="w-full flex overflow-hidden"
        style={{ height }}
        role="img"
        aria-label={filtered.map((s) => `${s.label}: €${Math.round(s.value).toLocaleString()}`).join(", ")}
      >
        {filtered.map((s) => {
          const pct = (s.value / total) * 100;
          const wide = pct > 14;
          return (
            <div
              key={s.key}
              className="relative flex items-center px-3"
              style={{ width: `${pct}%`, backgroundColor: s.fill }}
              title={`${s.label}: €${Math.round(s.value).toLocaleString()}`}
            >
              {wide && (
                <span className="text-[11px] font-bold text-white drop-shadow-sm tabular-nums">
                  €{Math.round(s.value).toLocaleString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <Legend items={filtered.map((s) => ({ label: s.label, fill: s.fill }))} />
      )}
    </div>
  );
}

/* ── Vertical stacked-bar group (one bar per scenario) ───── */

export function VerticalStackedBars({
  groups,
  segmentKeys,
  legend,
  height = 260,
  showLegend = true,
}: {
  groups: Array<{
    key: string;
    label: string;
    segments: Record<string, number>;
    total: number;
  }>;
  segmentKeys: Array<{ key: string; label: string; fill: string }>;
  legend?: LegendItem[];
  height?: number;
  showLegend?: boolean;
}) {
  const W = 720;
  const padL = 64;
  const padR = 16;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;

  const maxTotal = Math.max(...groups.map((g) => g.total), 1);
  const niceMax = Math.ceil(maxTotal / 5000) * 5000 || maxTotal;
  const yTicks = 5;

  const slot = innerW / Math.max(groups.length, 1);
  const barW = Math.min(96, slot * 0.5);

  const yAt = (v: number) => padT + innerH - (v / niceMax) * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
        {/* Y gridlines + labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (niceMax / yTicks) * i;
          const y = yAt(v);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E5E0D3" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#8B9A7E">
                €{Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}

        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />

        {groups.map((g, i) => {
          const cx = padL + slot * (i + 0.5);
          const x = cx - barW / 2;
          let cursor = padT + innerH;
          const stackTop = yAt(g.total);
          return (
            <g key={g.key}>
              {segmentKeys.map((sk) => {
                const v = g.segments[sk.key] ?? 0;
                if (v <= 0) return null;
                const h = (v / niceMax) * innerH;
                const top = cursor - h;
                cursor = top;
                return <rect key={sk.key} x={x} y={top} width={barW} height={h} fill={sk.fill} />;
              })}
              <text x={cx} y={stackTop - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1B3A2F">
                €{Math.round(g.total).toLocaleString()}
              </text>
              <text x={cx} y={height - padB + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1B3A2F">
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
      {showLegend && (
        <Legend
          items={legend ?? segmentKeys.map((sk) => ({ label: sk.label, fill: sk.fill }))}
        />
      )}
    </div>
  );
}

/* ── Cumulative multi-series line chart (years on X) ─────── */

export function CumulativeLineChart({
  series,
  years = 30,
  height = 320,
}: {
  series: Array<{ key: string; label: string; annual: number; stroke: string; dashed?: boolean }>;
  years?: number;
  height?: number;
}) {
  const W = 760;
  const padL = 72;
  const padR = 16;
  const padT = 16;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = height - padT - padB;

  const filtered = series.filter((s) => s.annual > 0);
  if (filtered.length === 0) return null;

  const maxY = Math.max(...filtered.map((s) => s.annual * years), 1);
  const niceMax = Math.ceil(maxY / 100000) * 100000 || maxY;
  const yTicks = 5;
  const xTicks = 6;

  const xAt = (yr: number) => padL + (yr / years) * innerW;
  const yAt = (v: number) => padT + innerH - (v / niceMax) * innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto">
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (niceMax / yTicks) * i;
          const y = yAt(v);
          return (
            <g key={`y${i}`}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#E5E0D3" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#8B9A7E">
                €{Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}
        {Array.from({ length: xTicks + 1 }, (_, i) => {
          const yr = (years / xTicks) * i;
          const x = xAt(yr);
          return (
            <text key={`x${i}`} x={x} y={height - padB + 16} textAnchor="middle" fontSize={10} fill="#8B9A7E">
              Yr {Math.round(yr)}
            </text>
          );
        })}
        <line x1={padL} x2={padL} y1={padT} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#8B9A7E" strokeWidth={1} />

        {filtered.map((s) => {
          const x0 = xAt(0);
          const y0 = yAt(0);
          const x1 = xAt(years);
          const y1 = yAt(s.annual * years);
          return (
            <g key={s.key}>
              <line
                x1={x0}
                y1={y0}
                x2={x1}
                y2={y1}
                stroke={s.stroke}
                strokeWidth={s.dashed ? 2 : 2.5}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                strokeLinecap="round"
              />
              <circle cx={x1} cy={y1} r={3.5} fill={s.stroke} />
              <text
                x={x1 + 6}
                y={y1 + 4}
                fontSize={11}
                fontWeight={700}
                fill={s.stroke}
              >
                €{Math.round(s.annual * years).toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend
        items={filtered.map((s) => ({ label: s.label, fill: s.stroke }))}
      />
    </div>
  );
}
