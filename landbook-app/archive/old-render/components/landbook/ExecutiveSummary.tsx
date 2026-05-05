import type { Property, Scores, Economics, Water, FireData, Narratives } from "@/lib/types";
import { SectionTitle, Gauge, KPI, Hairline, PullQuote } from "@/components/river";

export function ExecutiveSummary({
  property,
  scores,
  economics,
  water,
  fire,
  narratives,
}: {
  property: Property;
  scores: Scores;
  economics: Economics;
  water: Water;
  fire: FireData;
  narratives?: Narratives["executiveSummary"];
}) {
  return (
    <section id="executive-summary">
      <SectionTitle title="Executive Summary" />
      <div className="mb-8">
        <div className="serif-title text-lg text-brand-forest mb-1">
          {property.name}
        </div>
        <div className="text-sm text-brand-sage">{property.address}</div>
      </div>

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      <div className="grid grid-cols-3 gap-8 mb-8">
        <Gauge value={scores.naturalCapital} max={100} color="forest" label="Natural Capital" />
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security" />
        <Gauge value={fire.riskScore} max={5} color="terracotta" label="Fire Risk" />
      </div>

      <Hairline />

      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={property.area?.toFixed(1)} unit="ha" label="Total Area" />
        <KPI
          value={economics.valuePerHa ? `\u20ac${economics.valuePerHa.toLocaleString()}` : null}
          unit="/ha"
          label="Ecosystem Value"
        />
        <KPI value={scores.carbon} unit="/100" label="Carbon Score" />
        <KPI value={scores.biodiversity} unit="/100" label="Biodiversity Score" />
      </div>

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
