function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function KPI({
  value,
  unit,
  label,
}: {
  value: unknown;
  unit?: string;
  label: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tighter text-brand-forest">
          {fmt(value)}
        </span>
        {unit && <span className="text-sm text-brand-sage">{unit}</span>}
      </div>
    </div>
  );
}
