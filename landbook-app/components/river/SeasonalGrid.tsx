const TAG_COLORS = [
  "bg-[#8B9A7E]",
  "bg-[#1B3A2F]",
  "bg-[#C4705A]",
  "bg-[#D4A574]",
];

export interface Season {
  period: string;
  tag: string;
  description: string;
}

export function SeasonalGrid({ seasons }: { seasons: Season[] }) {
  if (!seasons.length) return null;
  return (
    <div className="grid grid-cols-4 gap-8">
      {seasons.map((s, i) => (
        <div key={s.period}>
          <span className="text-[10px] font-bold text-brand-sage uppercase block mb-4">
            {s.period}
          </span>
          <div className="mb-4">
            <span
              className={`inline-block ${TAG_COLORS[i % TAG_COLORS.length]} text-white px-3 py-1 text-[10px] font-bold`}
            >
              {s.tag}
            </span>
          </div>
          <p className="text-[13px] text-brand-forest leading-relaxed">
            {s.description}
          </p>
        </div>
      ))}
    </div>
  );
}
