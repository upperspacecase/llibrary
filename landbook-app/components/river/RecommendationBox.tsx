export function RecommendationBox({
  label,
  text,
}: {
  label: string;
  text: string | undefined | null;
}) {
  if (!text) return null;
  return (
    <div className="py-8">
      <span className="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">
        {label}
      </span>
      <p className="text-brand-forest font-medium leading-relaxed">{text}</p>
    </div>
  );
}
