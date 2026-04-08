function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function PercentileCard({
  icon,
  value,
  suffix,
  description,
}: {
  icon: string;
  value: unknown;
  suffix?: string;
  description?: string;
}) {
  return (
    <div className="flex gap-8 items-start">
      <div className="w-16 h-16 bg-brand-forest flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-brand-cream text-3xl">
          {icon}
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-[30px] font-black text-brand-forest">
            {fmt(value)}
          </span>
          {suffix && (
            <span className="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest">
              {suffix}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-brand-charcoal leading-relaxed max-w-[300px]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
