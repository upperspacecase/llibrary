function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function KPI({
  value,
  unit,
  label,
  size = "default",
}: {
  value: unknown;
  unit?: string;
  label: string;
  size?: "default" | "sm";
}) {
  const valueCls =
    size === "sm"
      ? "text-[30px] font-bold tracking-tighter text-brand-forest leading-none font-serif"
      : "text-[43px] font-bold tracking-tighter text-brand-forest leading-none font-serif";
  const unitCls = size === "sm" ? "text-base text-brand-sage ml-1" : "text-xl text-brand-sage ml-1";
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-sage mb-2 font-body">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={valueCls}>{fmt(value)}</span>
        {unit && <span className={unitCls}>{unit}</span>}
      </div>
    </div>
  );
}
