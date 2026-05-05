type Variant = "plausible" | "mixed" | "fake";

const VARIANT_STYLES: Record<Variant, {
  bg: string;
  tagBg: string;
  tagText: string;
  icon: string;
  iconColor: string;
  label: string;
}> = {
  plausible: {
    bg: "bg-green-50",
    tagBg: "bg-green-700/15",
    tagText: "text-green-800",
    icon: "verified",
    iconColor: "text-green-700",
    label: "PLAUSIBLE",
  },
  mixed: {
    bg: "bg-[#FFFBEB]",
    tagBg: "bg-amber-600/15",
    tagText: "text-amber-800",
    icon: "science",
    iconColor: "text-amber-700",
    label: "MIXED",
  },
  fake: {
    bg: "bg-red-50",
    tagBg: "bg-red-700/15",
    tagText: "text-red-800",
    icon: "error",
    iconColor: "text-red-700",
    label: "FAKE DATA",
  },
};

export function PlaceholderBox({
  id,
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
  const bg = styles?.bg ?? "bg-[#FFFBEB]";
  const icon = styles?.icon ?? "construction";
  const iconColor = styles?.iconColor ?? "text-brand-terracotta";

  return (
    <div className={`${bg} p-5 mb-6`}>
      <div className="flex items-start gap-3">
        <span
          className={`material-symbols-outlined shrink-0 ${iconColor}`}
          style={{ fontSize: 18 }}
        >
          {icon}
        </span>
        <div className="flex-1">
          {styles && (
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 ${styles.tagBg} ${styles.tagText}`}>
                {styles.label}
              </span>
            </div>
          )}
          <div className="text-sm font-bold text-brand-forest mb-1">{title}</div>
          <div className="text-[11px] text-brand-terracotta/80 uppercase tracking-wide font-bold">
            {status}
          </div>
          {variant === "mixed" && note && (
            <div className="text-[11px] text-amber-900 italic mt-2 leading-snug">
              {note}
            </div>
          )}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}
