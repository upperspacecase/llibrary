function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function HeroFigure({
  value,
  label,
}: {
  value: unknown;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
        {label}
      </div>
      <p className="text-[43px] font-black tracking-tighter text-brand-forest leading-none font-serif">
        {fmt(value)}
      </p>
    </div>
  );
}
