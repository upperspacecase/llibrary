import type { Actions, ActionItem, Narratives } from "@/lib/types";
import {
  SectionTitle, RecommendationBox, SubsectionHeader, PlaceholderBox, Hairline,
} from "@/components/river";

function ActionGroup({ title, items }: { title: string; items: ActionItem[] }) {
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

export function RecommendationsSection({
  actions,
  narratives,
}: {
  actions: Actions;
  narratives?: Narratives["nextSteps"];
}) {
  const immediate = actions.immediate || [];
  const shortTerm = actions.shortTerm || [];
  const longTerm = actions.longTerm || [];

  return (
    <section id="recommendations">
      <SectionTitle title="Recommendations" />

      {narratives?.framing && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.framing}
        </p>
      )}

      {/* 12.1 Immediate */}
      <SubsectionHeader id="12.1" title="Immediate (0-30 days)" sources={["AI"]} />
      <ActionGroup title="Critical data gaps & emergency actions" items={immediate} />
      {!immediate.length && (
        <p className="text-sm text-brand-sage mb-6">No immediate actions generated.</p>
      )}

      <Hairline />

      {/* 12.2 Short-Term */}
      <SubsectionHeader id="12.2" title="Short-Term (1-6 months)" sources={["AI"]} />
      <ActionGroup title="Risk reduction & basic compliance" items={shortTerm} />
      {!shortTerm.length && (
        <p className="text-sm text-brand-sage mb-6">No short-term actions generated.</p>
      )}

      <Hairline />

      {/* 12.3 Medium-Term */}
      <SubsectionHeader id="12.3" title="Medium-Term (6-18 months)" sources={["NEW"]} />
      <PlaceholderBox
        id="12.3"
        title="Cork plan, olive-grove rehabilitation, pasture management, solar feasibility"
        status="NEW TIME HORIZON — GAP BETWEEN SHORT-TERM AND LONG-TERM"
      />

      <Hairline />

      {/* 12.4 Long-Term */}
      <SubsectionHeader id="12.4" title="Long-Term (2-5 years)" sources={["AI"]} />
      <ActionGroup title="Strategic investments & transformation" items={longTerm} />
      {!longTerm.length && (
        <p className="text-sm text-brand-sage mb-6">No long-term actions generated.</p>
      )}

      <Hairline />

      {/* 12.5 Investment Priorities */}
      <SubsectionHeader id="12.5" title="Investment Priorities" sources={["NEW"]} />
      <PlaceholderBox
        id="12.5"
        title="Capital allocation by category, expected ROI, financing options"
        status="ENTIRELY NEW — NO DATA OR COMPUTATION"
      />

      <Hairline />

      {/* 12.6 Partnership Opportunities */}
      <SubsectionHeader id="12.6" title="Partnership Opportunities" sources={["NEW"]} />
      <PlaceholderBox
        id="12.6"
        title="NGOs, universities, cooperatives, technical assistance"
        status="NEW — COULD BE AI-GENERATED"
      />

      <Hairline />

      {/* 12.7 Monitoring Protocol */}
      <SubsectionHeader id="12.7" title="Monitoring Protocol" sources={["NEW"]} />
      <PlaceholderBox
        id="12.7"
        title="Daily/weekly/monthly/quarterly indicators and measurement approach"
        status="ENTIRELY NEW"
      />

      <Hairline />

      {/* 12.8 Decision Gates */}
      <SubsectionHeader id="12.8" title="Decision Gates" sources={["NEW"]} />
      <PlaceholderBox
        id="12.8"
        title="Review points, continuation or pivot criteria"
        status="ENTIRELY NEW"
      />
    </section>
  );
}
