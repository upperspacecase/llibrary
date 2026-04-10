import type { Actions, ActionItem, Narratives } from "@/lib/types";
import { SectionTitle, PlaceholderBox, DataTable } from "@/components/river";

function CheckboxGroup({ label, items }: { label: string; items: ActionItem[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="font-label text-[11px] font-bold uppercase tracking-[0.25em] text-landbook-forest mb-6">
        {label}
      </h2>
      <ul className="space-y-5">
        {items.map((a, i) => (
          <li key={i} className="flex items-start gap-4">
            <input
              type="checkbox"
              className="appearance-none w-[14px] h-[14px] border-[0.5pt] border-brand-forest bg-transparent cursor-pointer relative mt-1 shrink-0
                checked:after:content-['✓'] checked:after:absolute checked:after:-top-1 checked:after:left-[1px] checked:after:text-[12px] checked:after:text-brand-forest"
            />
            <span className="text-[14px] text-on-surface leading-snug">
              {a.action || a.name || a.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecommendationsSection({
  actions,
  narratives,
}: {
  actions: Actions;
  narratives?: Narratives["recommendations"];
}) {
  const immediate = actions.immediate || [];
  const shortTerm = actions.shortTerm || [];
  const longTerm = actions.longTerm || [];

  return (
    <section id="recommendations">
      <SectionTitle title="Recommendations" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      {/* Checkbox Lists */}
      <div className="space-y-14 flex-1">
        <CheckboxGroup label="Immediate (0–6 months)" items={immediate} />

        {immediate.length > 0 && (shortTerm.length > 0 || longTerm.length > 0) && (
          <div className="w-full h-[0.5pt] bg-landbook-sage/40" />
        )}

        <CheckboxGroup label="Short-Term (6–24 months)" items={shortTerm} />

        {shortTerm.length > 0 && longTerm.length > 0 && (
          <div className="w-full h-[0.5pt] bg-landbook-sage/40" />
        )}

        <CheckboxGroup label="Ongoing" items={longTerm} />

        <div className="w-full h-[0.5pt] bg-landbook-sage/40" />

        {/* Partnership Opportunities */}
        <section>
          <h2 className="font-label text-[11px] font-bold uppercase tracking-[0.25em] text-landbook-forest mb-6">
            Partnership Opportunities
          </h2>
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
        </section>

        <div className="w-full h-[0.5pt] bg-landbook-sage/40" />

        {/* Monitoring Protocol */}
        <section>
          <h2 className="font-label text-[11px] font-bold uppercase tracking-[0.25em] text-landbook-forest mb-6">
            Monitoring Protocol
          </h2>
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

        {/* Disclaimer */}
        <aside className="w-full border-l-[4px] border-landbook-sage py-4 pl-8 pr-4 bg-landbook-sage/5">
          <p className="font-serif italic text-[13px] leading-relaxed text-landbook-forest/80">
            Disclaimer: All recommendations based on remote assessment and field verification. Consult licensed professionals before major investments. Data sources include IPMA, IGP, and LandBook proprietary analysis.
          </p>
        </aside>
      </div>
    </section>
  );
}
