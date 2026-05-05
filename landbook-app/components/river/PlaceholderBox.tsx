type Variant = "plausible" | "mixed" | "fake";

const VARIANT_STYLES: Record<Variant, {
  border: string;
  tagBg: string;
  tagText: string;
  label: string;
}> = {
  plausible: {
    border: "border-brand-sage",
    tagBg: "bg-brand-sage/15",
    tagText: "text-brand-sage",
    label: "PLAUSIBLE",
  },
  mixed: {
    border: "border-brand-terracotta",
    tagBg: "bg-brand-terracotta/15",
    tagText: "text-brand-terracotta",
    label: "MIXED",
  },
  fake: {
    border: "border-red-700",
    tagBg: "bg-red-700/15",
    tagText: "text-red-800",
    label: "FAKE DATA",
  },
};

export function PlaceholderBox({
  title,
  status,
  variant,
  note,
  children,
}: {
  id: string;
  title: string;
  status: string;
  variant?: Variant;
  note?: string;
  children?: React.ReactNode;
}) {
  const styles = variant ? VARIANT_STYLES[variant] : null;
  const borderColor = styles?.border ?? "border-brand-sage/40";

  return (
    <div className={`border-l-[3px] ${borderColor} pl-8 pr-4 py-3 mb-8`}>
      {styles && (
        <span
          className={`inline-block text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 mb-5 ${styles.tagBg} ${styles.tagText}`}
        >
          {styles.label}
        </span>
      )}
      <h3 className="font-serif text-2xl font-bold text-brand-forest mb-2 leading-tight">
        {title}
      </h3>
      <div className="text-[10px] text-brand-sage uppercase tracking-[0.15em] font-bold mb-6">
        {status}
      </div>
      {variant === "mixed" && note && (
        <p className="text-[12px] text-brand-charcoal/80 italic mb-6 leading-snug max-w-prose">
          {note}
        </p>
      )}
      {children && <div>{children}</div>}
    </div>
  );
}
