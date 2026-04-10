import type { Actions, ActionItem, Narratives } from "@/lib/types";
import {
  SectionTitle, RecommendationBox, SubsectionHeader, PlaceholderBox, Hairline, DataTable,
} from "@/components/river";

function ActionGroup({ title, items }: { title: string; items: ActionItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mb-8">
      <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-sage font-body mb-3">
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
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-12">
          {narratives.framing}
        </p>
      )}

      {/* 12.1 Immediate */}
      <SubsectionHeader id="12.1" title="Immediate (0-30 days)" sources={["AI"]} />
      <ActionGroup title="Critical data gaps & emergency actions" items={immediate} />
      {!immediate.length && (
        <p className="text-sm text-brand-sage mb-8">No immediate actions generated.</p>
      )}

      <Hairline />

      {/* 12.2 Short-Term */}
      <SubsectionHeader id="12.2" title="Short-Term (1-6 months)" sources={["AI"]} />
      <ActionGroup title="Risk reduction & basic compliance" items={shortTerm} />
      {!shortTerm.length && (
        <p className="text-sm text-brand-sage mb-8">No short-term actions generated.</p>
      )}

      <Hairline />

      {/* 12.3 Medium-Term */}
      <SubsectionHeader id="12.3" title="Medium-Term (6-18 months)" sources={["NEW"]} />
      <PlaceholderBox
        id="12.3"
        title="Medium-term action plan"
        status="DERIVED FROM AGRICULTURE SYSTEMS + ENERGY DATA"
        synthetic
      >
        <div className="space-y-2">
          <div className="py-2 border-b-[0.5px] border-brand-sage/20">
            <p className="text-sm font-bold text-brand-forest">Cork oak management plan</p>
            <p className="text-xs text-brand-sage">Commission a certified cork stripping schedule aligned with 9-year rotation. Assess stand density and pruning needs.</p>
          </div>
          <div className="py-2 border-b-[0.5px] border-brand-sage/20">
            <p className="text-sm font-bold text-brand-forest">Olive grove rehabilitation</p>
            <p className="text-xs text-brand-sage">Prune abandoned olive trees, establish cover crops for erosion control, and evaluate organic certification feasibility.</p>
          </div>
          <div className="py-2 border-b-[0.5px] border-brand-sage/20">
            <p className="text-sm font-bold text-brand-forest">Pasture rotational grazing</p>
            <p className="text-xs text-brand-sage">Implement paddock subdivision for rotational grazing to improve soil carbon and reduce overgrazing pressure.</p>
          </div>
          <div className="py-2">
            <p className="text-sm font-bold text-brand-forest">Solar feasibility study</p>
            <p className="text-xs text-brand-sage">Assess rooftop and ground-mount solar potential for on-site energy generation and possible grid export revenue.</p>
          </div>
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 12.4 Long-Term */}
      <SubsectionHeader id="12.4" title="Long-Term (2-5 years)" sources={["AI"]} />
      <ActionGroup title="Strategic investments & transformation" items={longTerm} />
      {!longTerm.length && (
        <p className="text-sm text-brand-sage mb-8">No long-term actions generated.</p>
      )}

      <Hairline />

      {/* 12.5 Investment Priorities — COMMENTED OUT: no investment data
      <SubsectionHeader id="12.5" title="Investment Priorities" sources={["NEW"]} />
      <PlaceholderBox
        id="12.5"
        title="Capital allocation by category, expected ROI, financing options"
        status="ENTIRELY NEW — NO DATA OR COMPUTATION"
      />
      <Hairline />
      */}

      {/* 12.6 Partnership Opportunities */}
      <SubsectionHeader id="12.6" title="Partnership Opportunities" sources={["NEW"]} />
      <PlaceholderBox
        id="12.6"
        title="Regional partner network"
        status="DERIVED FROM PORTUGUESE INSTITUTIONAL LANDSCAPE"
        synthetic
      >
        <DataTable
          headers={["Organization", "Type", "Relevance"]}
          rows={[
            ["ICNF (Instituto da Conservação da Natureza e das Florestas)", "Government", "Forest management plans, fire prevention, Natura 2000"],
            ["Universidade de Évora", "University", "Soil science, agronomy, Mediterranean ecology research"],
            ["CEABN-ISA (Universidade de Lisboa)", "University", "Applied ecology, ecosystem services assessment"],
            ["Quercus ANCN", "NGO", "Conservation, reforestation, environmental education"],
            ["ANSUB (Associação de Produtores Florestais)", "Cooperative", "Forest producer support, certification, market access"],
            ["ADPM (Associação de Defesa do Património de Mértola)", "NGO", "Rural development, traditional practices, cultural heritage"],
            ["Cooperativa Agrícola Regional", "Cooperative", "Agricultural inputs, machinery sharing, market access"],
          ]}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 12.7 Monitoring Protocol */}
      <SubsectionHeader id="12.7" title="Monitoring Protocol" sources={["NEW"]} />
      <PlaceholderBox
        id="12.7"
        title="Monitoring KPIs"
        status="DERIVED FROM NATURAL CAPITAL SCORING SYSTEM"
        synthetic
      >
        <DataTable
          headers={["Indicator", "Frequency", "Method"]}
          rows={[
            ["Soil organic carbon (%)", "Annual", "Lab analysis of composite soil samples"],
            ["NDVI vegetation index", "Monthly", "Satellite remote sensing (Sentinel-2)"],
            ["Water quality (pH, turbidity)", "Quarterly", "Field sampling at spring/stream points"],
            ["Fire risk index (FWI)", "Daily (fire season)", "Automated from weather station data"],
            ["Species richness count", "Biannual", "Field transect surveys + iNaturalist records"],
            ["Carbon sequestration (tCO2e/yr)", "Annual", "Allometric models + soil sampling"],
            ["Revenue per hectare", "Annual", "Farm accounting records"],
            ["Erosion rate (t/ha/yr)", "Annual", "RUSLE model update with rainfall data"],
          ]}
        />
      </PlaceholderBox>

    </section>
  );
}
