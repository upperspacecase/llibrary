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
        status="DERIVED FROM climate zone, risk scores, regional context"
        synthetic
      >
        <DataTable
          headers={["Risk Category", "Estimated Level", "Basis"]}
          rows={[
            [
              "Pest / Disease",
              (() => {
                const fireScore = fire.riskScore ?? 0;
                const droughtScore = drought.riskScore ?? 0;
                const avg = (fireScore + droughtScore) / 2;
                return avg >= 3.5 ? "High" : avg >= 2 ? "Moderate" : "Low";
              })(),
              "Warmer / drier climates correlate with higher pest pressure",
            ],
            ["Market Volatility", "Moderate", "Default estimate for rural land assets"],
            [
              "Regulatory Change",
              "Moderate",
              "Standard baseline — refine with local protected-area status",
            ],
          ]}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 10.2 Risk Scoring Matrix */}
      <SubsectionHeader id="10.2" title="Risk Scoring Matrix" sources={["Computed"]} />
      {(() => {
        const hazards = [
          { name: "Fire", score: fire.riskScore },
          { name: "Flood", score: flood.riskScore },
          { name: "Drought", score: drought.riskScore },
        ];
        const toLikelihood = (s: number | null) =>
          s == null ? "—" : s >= 4 ? "High" : s >= 3 ? "Medium" : "Low";
        const toImpact = (s: number | null) =>
          s == null ? "—" : s >= 4 ? "Severe" : s >= 3 ? "Moderate" : "Minor";
        return (
          <DataTable
            headers={["Hazard", "Score (0–5)", "Likelihood", "Impact", "Risk Rating"]}
            rows={hazards.map((h) => [
              h.name,
              h.score != null ? String(h.score) : "—",
              toLikelihood(h.score),
              toImpact(h.score),
              h.score != null
                ? h.score >= 4
                  ? "Critical"
                  : h.score >= 3
                    ? "Elevated"
                    : "Acceptable"
                : "—",
            ])}
          />
        );
      })()}

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
        title="Heat stress projections, extreme-event probability"
        status="DERIVED FROM trends.tempPerDecade, fire-prone days"
        synthetic
      >
        <div className="space-y-3 text-sm text-brand-charcoal">
          {trends.tempPerDecade != null && (
            <>
              <p>
                <span className="font-bold">Projected warming (30 yr):</span>{" "}
                +{(trends.tempPerDecade * 3).toFixed(1)}°C above current baseline
              </p>
              <p>
                <span className="font-bold">Est. additional heat-stress days / yr:</span>{" "}
                {Math.round(trends.tempPerDecade * 3 * 8)}
                <span className="text-brand-sage ml-1">(~8 days per °C above threshold)</span>
              </p>
            </>
          )}
          {fireDecades.length >= 2 && (
            <p>
              <span className="font-bold">Fire-prone trend:</span>{" "}
              {(() => {
                const first = fireDecades[0];
                const last = fireDecades[fireDecades.length - 1];
                const v1 = first.avgDays ?? first.days ?? first.value ?? 0;
                const v2 = last.avgDays ?? last.days ?? last.value ?? 0;
                const diff = v2 - v1;
                return diff > 0
                  ? `+${diff.toFixed(0)} fire-prone days from ${first.decade || first.label} to ${last.decade || last.label}`
                  : `${diff.toFixed(0)} fire-prone days (stable or improving)`;
              })()}
            </p>
          )}
          {trends.precipPerDecade != null && trends.precipPerDecade < 0 && (
            <p>
              <span className="font-bold">Drying trend:</span>{" "}
              {Math.abs(trends.precipPerDecade * 3).toFixed(0)} mm less rainfall projected over 30 years — increased drought event probability
            </p>
          )}
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 10.4 Biotic Risks — COMMENTED OUT: no data source yet
      <SubsectionHeader id="10.4" title="Biotic Risks" sources={["NEW"]} />
      <PlaceholderBox
        id="10.4"
        title="Invasive species, pathogens, pests, biodiversity attrition"
        status="ENTIRELY NEW — NO DATA SOURCE"
      />
      <Hairline />
      */}

      {/* 10.6 Resilience Capacity */}
      <SubsectionHeader id="10.6" title="Resilience Capacity" sources={["Computed"]} />
      {narratives?.resilience?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.resilience.narrative}
        </p>
      )}
      <PlaceholderBox
        id="10.6"
        title="Resilience capacity metrics"
        status="DERIVED FROM energy.independenceScore, risk scores, trend data"
        synthetic
      >
        <DataTable
          headers={["Resilience Dimension", "Score", "Assessment"]}
          rows={[
            [
              "Energy Independence",
              energy.independenceScore != null ? `${energy.independenceScore}/10` : "—",
              energy.independenceScore != null
                ? energy.independenceScore >= 7
                  ? "Strong — multiple renewable sources"
                  : energy.independenceScore >= 4
                    ? "Moderate — some off-grid potential"
                    : "Low — grid-dependent"
                : "—",
            ],
            [
              "Water Security",
              (() => {
                const droughtScore = drought.riskScore ?? 3;
                const waterRes = Math.max(1, 10 - droughtScore * 2);
                return `${waterRes}/10`;
              })(),
              (drought.riskScore ?? 3) <= 2
                ? "Strong — low drought exposure"
                : (drought.riskScore ?? 3) <= 3
                  ? "Moderate — seasonal stress possible"
                  : "Vulnerable — high drought risk",
            ],
            [
              "Ecosystem Buffers",
              (() => {
                const avgRisk = ((fire.riskScore ?? 3) + (flood.riskScore ?? 3) + (drought.riskScore ?? 3)) / 3;
                const bufferScore = Math.max(1, Math.round(10 - avgRisk * 1.5));
                return `${bufferScore}/10`;
              })(),
              "Derived from combined hazard exposure",
            ],
            [
              "Adaptive Capacity",
              (() => {
                const eScore = energy.independenceScore ?? 3;
                const trendPenalty = trends.tempPerDecade != null && trends.tempPerDecade > 0.3 ? 2 : 0;
                return `${Math.max(1, Math.round(eScore - trendPenalty))}/10`;
              })(),
              "Based on infrastructure + climate trajectory",
            ],
          ]}
        />
      </PlaceholderBox>

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
