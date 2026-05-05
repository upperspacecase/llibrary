const BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  Pipeline: { bg: "bg-brand-forest/10", text: "text-brand-forest" },
  Computed: { bg: "bg-blue-50", text: "text-blue-700" },
  AI: { bg: "bg-purple-50", text: "text-purple-700" },
  User: { bg: "bg-amber-50", text: "text-amber-700" },
  Static: { bg: "bg-gray-100", text: "text-gray-500" },
  NEW: { bg: "bg-brand-terracotta/10", text: "text-brand-terracotta" },
};

export function DataSourceBadge({
  source,
}: {
  source: "Pipeline" | "Computed" | "AI" | "User" | "Static" | "NEW";
}) {
  const style = BADGE_STYLES[source] || BADGE_STYLES.Static;
  return (
    <span
      className={`inline-block text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 ${style.bg} ${style.text}`}
    >
      {source}
    </span>
  );
}
