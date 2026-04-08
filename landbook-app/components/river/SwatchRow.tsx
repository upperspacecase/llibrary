const SWATCH_COLORS = [
  "bg-brand-forest",
  "bg-brand-sage",
  "bg-brand-amber",
  "bg-brand-terracotta",
  "bg-brand-charcoal",
];

export function SwatchRow({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex gap-1">
      {items.map((item, i) => (
        <div
          key={item}
          className={`flex-1 ${SWATCH_COLORS[i % SWATCH_COLORS.length]} p-4 h-24 flex flex-col justify-end`}
        >
          <span className="text-[9px] font-bold text-brand-cream uppercase tracking-widest">
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
