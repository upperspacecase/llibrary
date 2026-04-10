export function RecommendationBox({
  label,
  text,
}: {
  label: string;
  text: string | undefined | null;
}) {
  return (
    <div className="py-8">
      <span className="text-[10px] font-black tracking-[0.2em] text-brand-terracotta uppercase block mb-3">
        {label}
      </span>
      {text ? (
        <p className="text-brand-forest font-medium leading-relaxed">{text}</p>
      ) : (
        <p className="text-brand-sage/30 font-medium leading-relaxed italic">
          Actionable mitigation recommendation pending &mdash; generate narratives to populate.
        </p>
      )}
    </div>
  );
}
