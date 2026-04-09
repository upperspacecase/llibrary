import type { Property, Scores, Economics, Water, FireData, Maps, Narratives } from "@/lib/types";
import {
  SectionTitle, Gauge, KPI, Hairline, PullQuote, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

export function OverviewSection({
  property,
  scores,
  economics,
  water,
  fire,
  maps,
  narratives,
}: {
  property: Property;
  scores: Scores;
  economics: Economics;
  water: Water;
  fire: FireData;
  maps: Maps;
  narratives?: Narratives["executiveSummary"];
}) {
  return (
    <section id="overview">
      <SectionTitle title="Overview" />

      {/* 1.1 Property Identity */}
      <SubsectionHeader id="1.1" title="Property Identity" sources={["Pipeline"]} />
      <div className="mb-8">
        <div className="serif-title text-lg text-brand-forest mb-1">{property.name}</div>
        <div className="text-sm text-brand-sage mb-2">{property.address}</div>
        {property.coords?.lat != null && (
          <div className="text-xs font-mono text-brand-sage">
            {property.coords.lat.toFixed(5)}, {property.coords.lng.toFixed(5)}
          </div>
        )}
        {property.area != null && (
          <div className="text-xs text-brand-sage mt-1">{property.area.toFixed(1)} ha</div>
        )}
      </div>
      <PlaceholderBox
        id="1.1"
        title="Land Use Designation & Ownership Structure"
        status="NEW — NOT IN DATA PIPELINE"
      />

      <Hairline />

      {/* 1.2 Hero Metrics Dashboard */}
      <SubsectionHeader id="1.2" title="Hero Metrics Dashboard" sources={["Pipeline", "Computed"]} />
      <div className="grid grid-cols-3 gap-8 mb-8">
        <Gauge value={scores.naturalCapital} max={100} color="forest" label="Natural Capital" />
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security" />
        <Gauge value={fire.riskScore} max={5} color="terracotta" label="Fire Risk" />
      </div>
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
      <PlaceholderBox
        id="1.2"
        title="Data Confidence Badge (% Verified / Synthetic / Unverified)"
        status="NEW — NO CONFIDENCE TRACKING YET"
      />

      <Hairline />

      {/* 1.3 At-a-Glance Summary */}
      <SubsectionHeader id="1.3" title="At-a-Glance Summary" sources={["AI"]} />
      {narratives?.intro ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      ) : (
        <p className="text-sm text-brand-sage mb-8">No summary generated yet.</p>
      )}

      <Hairline />

      {/* 1.4 Key Visual Signature */}
      <SubsectionHeader id="1.4" title="Key Visual Signature" sources={["Pipeline", "Computed"]} />
      {maps.satellite ? (
        <div className="border-[0.5px] border-brand-sage/30 overflow-hidden mb-6">
          <img src={maps.satellite} alt="Satellite view" className="w-full h-64 object-cover" />
        </div>
      ) : (
        <div className="h-48 bg-brand-sage/10 flex items-center justify-center text-brand-sage text-sm mb-6">
          Satellite image not available
        </div>
      )}

      {/* Scorecard bars (existing) */}
      {(() => {
        const reg = scores.regional || {} as Record<string, number>;
        const dims = [
          { label: "Carbon", score: scores.carbon || 0, avg: reg.carbon || 0 },
          { label: "Biodiversity", score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
          { label: "Water", score: scores.water || 0, avg: reg.water || 0 },
          { label: "Soil", score: scores.soil || 0, avg: reg.soil || 0 },
          { label: "Pollination", score: scores.pollination || 0, avg: reg.pollination || 0 },
        ];
        return dims.map((dim) => {
          const diff = dim.score - dim.avg;
          const sign = diff > 0 ? "+" : "";
          const pct = Math.min(dim.score, 100);
          return (
            <div key={dim.label} className="flex items-center gap-6 py-3 border-b-[0.5px] border-brand-sage/20 last:border-0">
              <div className="w-24 text-sm font-bold text-brand-forest">{dim.label}</div>
              <div className="flex-1">
                <div className="h-2 bg-brand-sage/20 w-full">
                  <div className="h-full bg-brand-forest" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="w-12 text-right text-sm font-black text-brand-forest">{dim.score}</div>
              <div className={`w-20 text-right text-[10px] font-bold ${diff >= 0 ? "text-brand-sage" : "text-brand-terracotta"}`}>
                {sign}{diff} vs avg
              </div>
            </div>
          );
        });
      })()}

      <PlaceholderBox
        id="1.4"
        title="Natural Capital Radar Chart (5-dimension vs regional average)"
        status="NEW — CURRENTLY BARS, RADAR VISUALIZATION NEEDED"
      />

      <Hairline />

      {/* 1.5 Quick Actions */}
      <SubsectionHeader id="1.5" title="Quick Actions" sources={["Static"]} />
      <PlaceholderBox
        id="1.5"
        title="Download PDF, Share Report, Schedule Consultation, Request Data Correction"
        status="ENTIRELY NEW UI ELEMENT"
      />

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
