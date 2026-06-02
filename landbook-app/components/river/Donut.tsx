export interface DonutSegment {
  name: string;
  value: number;
  fill: string;
}

const polar = (cx: number, cy: number, r: number, angle: number) => ({
  x: cx + r * Math.cos(angle),
  y: cy + r * Math.sin(angle),
});

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number): string {
  const startOuter = polar(cx, cy, outerR, startAngle);
  const endOuter = polar(cx, cy, outerR, endAngle);
  const startInner = polar(cx, cy, innerR, endAngle);
  const endInner = polar(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

export function Donut({
  segments,
  size = 280,
  thickness = 56,
  centerLabel,
  centerValue,
  showLegend = true,
  showPercentages = false,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
  showPercentages?: boolean;
}) {
  const filtered = segments.filter((s) => s.value > 0);
  const total = filtered.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR - thickness;

  let angle = -Math.PI / 2;
  const arcs = filtered.map((s) => {
    const frac = s.value / total;
    const startAngle = angle;
    const endAngle = angle + frac * 2 * Math.PI;
    angle = endAngle;
    return { ...s, frac, startAngle, endAngle };
  });

  return (
    <div className={`flex ${showLegend ? "flex-col md:flex-row items-center md:items-start gap-10" : "flex-col items-center"} mb-8`}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
          {arcs.length === 1 ? (
            <g>
              <circle cx={cx} cy={cy} r={outerR} fill={arcs[0].fill} />
              <circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />
            </g>
          ) : (
            arcs.map((a) => (
              <path
                key={a.name}
                d={arcPath(cx, cy, outerR, innerR, a.startAngle, a.endAngle)}
                fill={a.fill}
              />
            ))
          )}
          {showPercentages &&
            arcs.map((a) => {
              // Label only slices large enough to fit a readable % on the ring.
              if (a.frac < 0.05) return null;
              const mid = (a.startAngle + a.endAngle) / 2;
              const labelR = (outerR + innerR) / 2;
              const p = polar(cx, cy, labelR, mid);
              return (
                <text
                  key={`pct-${a.name}`}
                  x={p.x}
                  y={p.y}
                  fontSize={Math.max(9, Math.round(size * 0.05))}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={3}
                  paintOrder="stroke"
                >
                  {Math.round(a.frac * 100)}%
                </text>
              );
            })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {centerLabel && (
              <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
                {centerLabel}
              </span>
            )}
            {centerValue && (
              <span className="text-2xl font-serif font-bold text-brand-forest mt-1 leading-none">
                {centerValue}
              </span>
            )}
          </div>
        )}
      </div>

      {showLegend && (
        <ul className="flex-1 w-full space-y-3 font-body">
          {arcs
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-3 text-brand-forest">
                  <span
                    className="inline-block w-3 h-3 shrink-0"
                    style={{ backgroundColor: a.fill }}
                    aria-hidden="true"
                  />
                  <span className="font-bold">{a.name}</span>
                </span>
                <span className="text-brand-charcoal tabular-nums">
                  {Math.round(a.frac * 100)}% &middot; &euro;{Math.round(a.value).toLocaleString()}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
