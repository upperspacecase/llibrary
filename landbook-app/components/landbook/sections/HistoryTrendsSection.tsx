import type { Trends, Economics, FireData, Narratives } from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, RiskBadge, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function HistoryTrendsSection({
  trends,
  economics,
  fire,
  narratives,
}: {
  trends: Trends;
  economics: Economics;
  fire: FireData;
  narratives?: Narratives["temporal"];
}) {
  const npvScenarios = economics.npv?.scenarios || [];
  const fireDecades = trends.fireProneByDecade || [];

  return (
    <section id="history-trends">
      <SectionTitle title="History & Trends" />

      {narratives?.dynamics && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.dynamics}
        </p>
      )}

      {/* 9.1 Land Cover Change */}
      <SubsectionHeader id="9.1" title="Land Cover Change (2000-2024)" sources={["NEW"]} />
      <PlaceholderBox
        id="9.1"
        title="Forest gain/loss, agricultural expansion/abandonment, urban pressure"
        status="NEW — NEED SATELLITE TIME-SERIES DATA"
      />

      <Hairline />

      {/* 9.2 Vegetation Trends */}
      <SubsectionHeader id="9.2" title="Vegetation Trends" sources={["NEW"]} />
      <PlaceholderBox
        id="9.2"
        title="NDVI trajectories, disturbance events, recovery speed"
        status="ENTIRELY NEW — NEED NDVI DATA SOURCE"
      />

      <Hairline />

      {/* 9.3 Water Resource Trends */}
      <SubsectionHeader id="9.3" title="Water Resource Trends" sources={["NEW"]} />
      <PlaceholderBox
        id="9.3"
        title="Spring flows, water-table depth, precipitation shift impact"
        status="NEW — NO HISTORICAL WATER MONITORING DATA"
      />

      <Hairline />

      {/* 9.4 Property Value History */}
      <SubsectionHeader id="9.4" title="Property Value History" sources={["NEW"]} />
      {npvScenarios.length > 0 && (
        <DataTable
          headers={["NPV Scenario", "30-Year Value", "Risk"]}
          rows={npvScenarios.map((s) => [
            fmt(s.name),
            `\u20ac${s.npv?.toLocaleString() ?? "\u2014"}`,
            <RiskBadge key={s.name} level={s.riskLevel} />,
          ])}
        />
      )}
      <PlaceholderBox
        id="9.4"
        title="Transaction records, appreciation vs regional average"
        status="ENTIRELY NEW — NO PROPERTY TRANSACTION DATA SOURCE"
      />

      <Hairline />

      {/* 9.5 Disturbance Events */}
      <SubsectionHeader id="9.5" title="Disturbance Events" sources={["Pipeline"]} />
      {(fire.historical || []).length > 0 ? (
        <DataTable
          headers={["Year", "Fire Detections"]}
          rows={fire.historical.map((h) => [String(h.year), fmt(h.count)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No historical fire data available.</p>
      )}
      <PlaceholderBox
        id="9.5"
        title="Flood history, drought events, storm damage records"
        status="PARTIAL — FIRE HISTORY EXISTS, FLOOD & DROUGHT HISTORY ARE NEW"
      />

      <Hairline />

      {/* 9.6 Socio-Economic Trajectory */}
      <SubsectionHeader id="9.6" title="Socio-Economic Trajectory" sources={["NEW"]} />
      <PlaceholderBox
        id="9.6"
        title="Population, labor, land ownership, economic structure"
        status="ENTIRELY NEW — NO DATA SOURCE"
      />

      <Hairline />

      {/* 9.7 Historical Land Management */}
      <SubsectionHeader id="9.7" title="Historical Land Management" sources={["NEW"]} />
      <PlaceholderBox
        id="9.7"
        title="Traditional practices, fallow cycles, shifting priorities"
        status="ENTIRELY NEW — WOULD REQUIRE USER/AI INPUT"
      />

      {/* Climate trends metrics (existing data) */}
      {(trends.tempPerDecade != null || trends.precipPerDecade != null) && (
        <>
          <Hairline />
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-3 mt-6">
            Climate Trend Summary
          </div>
          <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Temp / Decade</div>
              <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none">
                {trends.tempPerDecade != null
                  ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}\u00b0C`
                  : "\u2014"}
              </p>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip / Decade</div>
              <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none">
                {trends.precipPerDecade != null
                  ? `${trends.precipPerDecade > 0 ? "+" : ""}${trends.precipPerDecade.toFixed(1)} mm`
                  : "\u2014"}
              </p>
            </div>
          </div>
        </>
      )}

      {fireDecades.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Decade", "Fire-Prone Days"]}
            rows={fireDecades.map((t) => [
              fmt(t.decade || t.label),
              fmt(t.avgDays || t.days || t.value),
            ])}
          />
        </>
      )}
    </section>
  );
}
