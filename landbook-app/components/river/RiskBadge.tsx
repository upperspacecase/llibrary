export function RiskBadge({ level }: { level: string | null | undefined }) {
  if (!level) return null;
  const l = level.toLowerCase();
  let classes: string;
  if (l === "low" || l === "very low") {
    classes = "bg-brand-forest/20 text-brand-forest";
  } else if (l === "moderate") {
    classes = "bg-brand-amber/20 text-brand-amber";
  } else {
    classes = "bg-brand-terracotta/20 text-brand-terracotta";
  }
  return (
    <span className={`px-2 py-1 text-[10px] font-bold ${classes}`}>
      {level.toUpperCase()}
    </span>
  );
}
