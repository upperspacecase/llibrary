import type { FireData, RiskData, Narratives } from "@/lib/types";
import { SectionTitle, Gauge, RiskBadge, Hairline, DataTable, RecommendationBox } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function RisksSection({
  fire,
  flood,
  drought,
  narratives,
}: {
  fire: FireData;
  flood: RiskData;
  drought: RiskData;
  narratives?: Narratives["risks"];
}) {
  return (
    <section>
      <SectionTitle title="Risks" />

      {narratives?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.narrative}
        </p>
      )}

      <div className="grid grid-cols-3 gap-8 mb-8">
        <Gauge value={fire.riskScore} max={5} color="terracotta" label="Fire Risk" />
        <Gauge value={flood.riskScore} max={5} color="amber" label="Flood Risk" />
        <Gauge value={drought.riskScore} max={5} color="sage" label="Drought Risk" />
      </div>

      <div className="flex justify-center gap-6 mb-8">
        <RiskBadge level={fire.riskLevel} />
        <RiskBadge level={flood.riskLevel} />
        <RiskBadge level={drought.riskLevel} />
      </div>

      {fire.activeFires ? (
        <>
          <Hairline />
          <div className="flex items-center gap-3 p-4 bg-brand-terracotta/10 mb-6">
            <span className="material-symbols-outlined text-brand-terracotta" style={{ fontSize: 20 }}>
              local_fire_department
            </span>
            <span className="text-sm text-brand-forest font-bold">
              Active fires within monitoring radius: {fire.activeFires}
            </span>
          </div>
        </>
      ) : null}

      {(fire.historical || []).length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Year", "Fire Detections"]}
            rows={fire.historical.map((h) => [String(h.year), fmt(h.count)])}
          />
        </>
      )}

      <RecommendationBox label="RECOMMENDATION" text={narratives?.recommendation} />
    </section>
  );
}
