import type { Scores, Narratives } from "@/lib/types";
import { SectionTitle, HeroFigure, Hairline, PullQuote } from "@/components/river";

export function Scorecard({
  scores,
  narratives,
}: {
  scores: Scores;
  narratives?: Narratives["scorecard"];
}) {
  const reg = scores.regional || {} as Record<string, number>;
  const dims = [
    { label: "Carbon", score: scores.carbon || 0, avg: reg.carbon || 0 },
    { label: "Biodiversity", score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
    { label: "Water", score: scores.water || 0, avg: reg.water || 0 },
    { label: "Soil", score: scores.soil || 0, avg: reg.soil || 0 },
    { label: "Pollination", score: scores.pollination || 0, avg: reg.pollination || 0 },
  ];

  return (
    <section id="scorecard">
      <SectionTitle title="How This Land Performs" />

      {narratives?.text && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.text}
        </p>
      )}

      <HeroFigure value={scores.naturalCapital || 0} label="Natural Capital Score" />
      <div className="text-center text-sm text-brand-sage mb-8">/100</div>

      <Hairline />

      {dims.map((dim) => {
        const diff = dim.score - dim.avg;
        const sign = diff > 0 ? "+" : "";
        const pct = Math.min(dim.score, 100);
        return (
          <div
            key={dim.label}
            className="flex items-center gap-6 py-4 border-b-[0.5px] border-brand-sage/20 last:border-0"
          >
            <div className="w-24 text-sm font-bold text-brand-forest">{dim.label}</div>
            <div className="flex-1">
              <div className="h-2 bg-brand-sage/20 w-full">
                <div className="h-full bg-brand-forest" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="w-12 text-right text-sm font-black text-brand-forest font-serif">
              {dim.score}
            </div>
            <div
              className={`w-20 text-right text-[10px] font-bold ${diff >= 0 ? "text-brand-sage" : "text-brand-terracotta"}`}
            >
              {sign}{diff} vs avg
            </div>
          </div>
        );
      })}

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
