const BAR_COLORS = [
  "bg-brand-forest",
  "bg-brand-sage",
  "bg-brand-amber",
  "bg-brand-terracotta",
  "bg-brand-charcoal",
];

export interface Segment {
  name: string;
  value: number;
}

export function StackedBar({
  segments,
  totalLabel,
  label,
}: {
  segments: Segment[];
  totalLabel?: string;
  label: string;
}) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0) || 1;

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h4 className="text-[10px] font-bold tracking-widest text-brand-forest uppercase">
          {label}
        </h4>
        {totalLabel && (
          <p className="text-[14.4px] font-bold text-brand-forest">{totalLabel}</p>
        )}
      </div>
      <div className="flex h-12 w-full">
        {segments.map((s, i) => {
          const pct = ((s.value / total) * 100).toFixed(1);
          return (
            <div
              key={s.name}
              className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex gap-6 mt-4">
        {segments.map((s, i) => {
          const pct = ((s.value / total) * 100).toFixed(0);
          return (
            <div key={s.name} className="flex items-center gap-2">
              <div className={`w-2 h-2 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
              <span className="text-[10px] font-bold text-brand-forest">
                {s.name} {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
