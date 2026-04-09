import type { Actions, ActionItem, Narratives } from "@/lib/types";
import { SectionTitle, RecommendationBox } from "@/components/river";

export function NextSteps({
  actions,
  narratives,
}: {
  actions: Actions;
  narratives?: Narratives["nextSteps"];
}) {
  const immediate = actions.immediate || [];
  const shortTerm = actions.shortTerm || [];
  const longTerm = actions.longTerm || [];

  function Group({ title, items }: { title: string; items: ActionItem[] }) {
    if (!items.length) return null;
    return (
      <div className="mb-6">
        <div className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-sage mb-3">
          {title}
        </div>
        {items.map((a, i) => (
          <div key={i} className="py-3 border-b-[0.5px] border-brand-sage/20">
            <RecommendationBox
              label={a.priority?.toUpperCase() || "ACTION"}
              text={a.action || a.name || a.description}
            />
            {a.impact && (
              <span className="text-[10px] uppercase tracking-widest text-brand-sage">
                Impact: {a.impact}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <section id="next-steps">
      <SectionTitle title="Next Steps" />

      {narratives?.framing && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.framing}
        </p>
      )}

      <Group title="Immediate Actions" items={immediate} />
      <Group title="Short-Term Actions" items={shortTerm} />
      <Group title="Long-Term Actions" items={longTerm} />

      {!immediate.length && !shortTerm.length && !longTerm.length && (
        <p className="text-sm text-brand-sage">No action items generated yet.</p>
      )}
    </section>
  );
}
