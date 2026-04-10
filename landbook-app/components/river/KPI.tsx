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
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[43px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
          {fmt(value)}
        </span>
        {unit && <span className="text-xl text-brand-sage ml-1">{unit}</span>}
      </div>
    </div>
  );
}
