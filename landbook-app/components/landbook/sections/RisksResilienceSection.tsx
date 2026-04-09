import type { FireData, RiskData, Energy, Trends, Narratives } from "@/lib/types";
import {
  SectionTitle, Gauge, RiskBadge, Hairline, DataTable, RecommendationBox,
  SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function RisksResilienceSection({
  fire,
  flood,
  drought,
  energy,
  trends,
  narratives,
}: {
  fire: FireData;
  flood: RiskData;
  drought: RiskData;
  energy: Energy;
  trends: Trends;
  narratives?: { risks?: Narratives["risks"]; resilience?: Narratives["resilience"] };
}) {
  const sources = [
    { label: "Solar", data: energy.solar || {} },
    { label: "Wind", data: energy.wind || {} },
    { label: "Micro-Hydro", data: energy.microHydro || {} },
    { label: "Biomass", data: energy.biomass || {} },
  ];
  const fireDecades = trends.fireProneByDecade || [];

  return (
    <section id="risks-resilience">
      <SectionTitle title="Risks & Resilience" />

      {narratives?.risks?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.risks.narrative}
        </p>
      )}

      {/* 10.1 Risk Identification */}
      <SubsectionHeader id="10.1" title="Risk Identification" sources={["Pipeline"]} />
      <div className="grid grid-cols-3 gap-8 mb-8">
        <Gauge value={fire.riskScore} max={5} color="terracotta" label="Fire Risk" />
        <Gauge value={flood.riskScore} max={5} color="amber" label="Flood Risk" />
        <Gauge value={drought.riskScore} max={5} color="sage" label="Drought Risk" />
      </div>
      <div className="flex justify-center gap-6 mb-6">
        <RiskBadge level={fire.riskLevel} />
        <RiskBadge level={flood.riskLevel} />
        <RiskBadge level={drought.riskLevel} />
      </div>

      {fire.activeFires ? (
        <div className="flex items-center gap-3 p-4 bg-brand-terracotta/10 mb-6">
          <span className="material-symbols-outlined text-brand-terracotta" style={{ fontSize: 20 }}>
            local_fire_department
          </span>
          <span className="text-sm text-brand-forest font-bold">
            Active fires within monitoring radius: {fire.activeFires}
          </span>
        </div>
      ) : null}

      <PlaceholderBox
        id="10.1"
        title="Pest/disease risks, market volatility, regulatory change risks"
        status="PARTIAL — FIRE/FLOOD/DROUGHT EXIST, PESTS/MARKET/REGULATORY ARE NEW"
      />

      <Hairline />

      {/* 10.2 Risk Scoring Matrix */}
      <SubsectionHeader id="10.2" title="Risk Scoring Matrix" sources={["Computed"]} />
      <PlaceholderBox
        id="10.2"
        title="Impact x Likelihood matrix per hazard, confidence levels, monitoring indicators"
        status="PARTIAL — INDIVIDUAL SCORES EXIST, MATRIX FORMAT IS NEW"
      />

      <Hairline />

      {/* 10.3 Climate Risks */}
      <SubsectionHeader id="10.3" title="Climate Risks" sources={["Pipeline"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Temp Trend / Decade</div>
          <p className="text-[24px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.tempPerDecade != null
              ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}\u00b0C`
              : "\u2014"}
          </p>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip Trend / Decade</div>
          <p className="text-[24px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.precipPerDecade != null
              ? `${trends.precipPerDecade > 0 ? "+" : ""}${trends.precipPerDecade.toFixed(1)} mm`
              : "\u2014"}
          </p>
        </div>
      </div>
      {fireDecades.length > 0 && (
        <DataTable
          headers={["Decade", "Fire-Prone Days"]}
          rows={fireDecades.map((t) => [
            fmt(t.decade || t.label),
            fmt(t.avgDays || t.days || t.value),
          ])}
        />
      )}
      <PlaceholderBox
        id="10.3"
        title="Heat stress analysis, extreme-event probability"
        status="PARTIAL — TRENDS DATA EXISTS, DETAILED ANALYSIS IS NEW"
      />

      <Hairline />

      {/* 10.4 Biotic Risks */}
      <SubsectionHeader id="10.4" title="Biotic Risks" sources={["NEW"]} />
      <PlaceholderBox
        id="10.4"
        title="Invasive species, pathogens, pests, biodiversity attrition"
        status="ENTIRELY NEW — NO DATA SOURCE"
      />

      <Hairline />

      {/* 10.5 Socio-Economic Risks */}
      <SubsectionHeader id="10.5" title="Socio-Economic Risks" sources={["NEW"]} />
      <PlaceholderBox
        id="10.5"
        title="Labor availability, input costs, land-use conflict, market access"
        status="ENTIRELY NEW — NO DATA SOURCE"
      />

      <Hairline />

      {/* 10.6 Resilience Capacity */}
      <SubsectionHeader id="10.6" title="Resilience Capacity" sources={["Computed"]} />
      {narratives?.resilience?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.resilience.narrative}
        </p>
      )}
      <PlaceholderBox
        id="10.6"
        title="Water redundancy, ecosystem buffers, genetic diversity, social capital"
        status="PARTIAL — ENERGY INDEPENDENCE EXISTS, BROADER METRICS ARE NEW"
      />

      <Hairline />

      {/* 10.7 Energy Independence Potential */}
      <SubsectionHeader id="10.7" title="Energy Independence Potential" sources={["Pipeline"]} />
      <div className="flex justify-center mb-6">
        <Gauge value={energy.independenceScore} max={10} color="forest" label="Energy Independence" />
      </div>
      <DataTable
        headers={["Energy Source", "Potential", "Detail"]}
        rows={sources.map((s) => {
          const d = s.data as Record<string, unknown>;
          return [s.label, fmt(d.level || d.score || d), fmt(d.detail || "")];
        })}
      />

      <Hairline />

      {/* 10.8 Mitigation & Adaptation */}
      <SubsectionHeader id="10.8" title="Mitigation & Adaptation" sources={["AI"]} />
      <RecommendationBox label="RISK MITIGATION" text={narratives?.risks?.recommendation} />
      <RecommendationBox label="RESILIENCE STRATEGY" text={narratives?.resilience?.recommendation} />

      {(fire.historical || []).length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Year", "Fire Detections"]}
            rows={fire.historical.map((h) => [String(h.year), fmt(h.count)])}
          />
        </>
      )}
    </section>
  );
}
