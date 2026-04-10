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
  narratives?: Narratives["historyTrends"];
}) {
  const npvScenarios = economics.npv?.scenarios || [];
  const fireDecades = trends.fireProneByDecade || [];

  return (
    <section id="history-trends">
      <SectionTitle title="History & Trends" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      {/* 9.1 Land Cover Change */}
      <SubsectionHeader id="9.1" title="Land Cover Change (2000-2024)" sources={["NEW"]} />
      <PlaceholderBox
        id="9.1"
        title="Forest gain/loss estimate"
        status="DERIVED FROM LAND COVER TYPE + CLIMATE TRENDS"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          {trends.precipPerDecade != null && trends.precipPerDecade < 0
            ? "Declining precipitation trends suggest gradual canopy thinning and possible shrubland encroachment over the past two decades."
            : "Stable or increasing precipitation suggests maintained or expanding forest cover, though fire disturbance may offset gains."}
        </p>
        <p className="text-xs text-brand-sage">
          Estimated direction: {trends.precipPerDecade != null && trends.precipPerDecade < 0 ? "Net loss" : "Stable to slight gain"}
          {trends.tempPerDecade != null && trends.tempPerDecade > 0.2 && " — elevated warming may accelerate drought stress."}
        </p>
      </PlaceholderBox>

      <Hairline />

      {/* 9.2 Vegetation Trends */}
      <SubsectionHeader id="9.2" title="Vegetation Trends" sources={["NEW"]} />
      <PlaceholderBox
        id="9.2"
        title="Vegetation health proxy"
        status="DERIVED FROM PRECIPITATION TRENDS"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          {trends.precipPerDecade != null
            ? trends.precipPerDecade > 0
              ? `Precipitation increasing at ${trends.precipPerDecade.toFixed(1)} mm/decade — vegetation productivity likely stable or improving.`
              : `Precipitation declining at ${Math.abs(trends.precipPerDecade).toFixed(1)} mm/decade — vegetation stress and lower NDVI values expected in recent years.`
            : "Insufficient precipitation trend data to estimate vegetation trajectory."}
        </p>
        {trends.tempPerDecade != null && (
          <p className="text-xs text-brand-sage">
            Temperature shift of {trends.tempPerDecade > 0 ? "+" : ""}{trends.tempPerDecade.toFixed(2)}°C/decade
            {trends.tempPerDecade > 0.15 ? " may increase evapotranspiration, reducing effective moisture for vegetation." : " has minimal impact on growing-season length."}
          </p>
        )}
      </PlaceholderBox>

      <Hairline />

      {/* 9.3 Water Resource Trends */}
      <SubsectionHeader id="9.3" title="Water Resource Trends" sources={["NEW"]} />
      <PlaceholderBox
        id="9.3"
        title="Water resource trajectory"
        status="DERIVED FROM PRECIPITATION TRENDS + CLIMATE DATA"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          {trends.precipPerDecade != null
            ? trends.precipPerDecade < -5
              ? "Significant precipitation decline suggests reduced aquifer recharge and lower baseflows in local watercourses."
              : trends.precipPerDecade < 0
                ? "Mild precipitation decline — seasonal water availability may shift but annual totals remain broadly adequate."
                : "Stable or increasing precipitation supports consistent water resource availability."
            : "No precipitation trend data available to estimate water resource trajectory."}
        </p>
        <p className="text-xs text-brand-sage">
          {trends.tempPerDecade != null && trends.tempPerDecade > 0
            ? `Warming of +${trends.tempPerDecade.toFixed(2)}°C/decade increases evaporative demand, potentially reducing effective water surplus.`
            : "Temperature trends neutral for evaporative demand."}
        </p>
      </PlaceholderBox>

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
        title="Estimated property value range"
        status="DERIVED FROM NPV SCENARIOS + ECOSYSTEM VALUE"
        synthetic
      >
        {npvScenarios.length > 0 ? (
          <>
            <p className="text-sm text-brand-charcoal mb-2">
              Based on NPV scenarios, the 30-year discounted value ranges from{" "}
              {`\u20ac${Math.min(...npvScenarios.map(s => s.npv ?? 0)).toLocaleString()}`} to{" "}
              {`\u20ac${Math.max(...npvScenarios.map(s => s.npv ?? 0)).toLocaleString()}`}.
            </p>
            <p className="text-xs text-brand-sage">
              Property market values in rural Iberia typically trade at 40-60% of ecosystem NPV due to liquidity discount and regulatory constraints.
            </p>
          </>
        ) : (
          <p className="text-sm text-brand-sage">No NPV data available to derive property value estimate.</p>
        )}
      </PlaceholderBox>

      {narratives?.callout && (
        <div className="border-l-[6px] border-brand-terracotta pl-8 py-4 my-8">
          <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
            &ldquo;{narratives.callout}&rdquo;
          </blockquote>
        </div>
      )}

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
        title="Flood & drought event estimate"
        status="DERIVED FROM FIRE HISTORY + CLIMATE TRENDS"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          {(fire.historical || []).length > 0
            ? `Fire detections recorded across ${fire.historical.length} year(s). Post-fire landscapes are more susceptible to flash flooding due to reduced soil infiltration.`
            : "No fire disturbance recorded — flood risk driven primarily by terrain and precipitation intensity."}
        </p>
        <p className="text-xs text-brand-sage">
          {trends.precipPerDecade != null && trends.precipPerDecade < -3
            ? "Drying trend increases drought frequency; intense rainfall events on dry soils elevate flash-flood risk."
            : "Current precipitation trends do not indicate elevated drought or flood frequency beyond baseline."}
        </p>
      </PlaceholderBox>

      <Hairline />

      {/* 9.6 Socio-Economic Trajectory */}
      <SubsectionHeader id="9.6" title="Socio-Economic Trajectory" sources={["NEW"]} />
      <PlaceholderBox
        id="9.6"
        title="Population & labor context"
        status="DERIVED FROM MUNICIPALITY CONTEXT"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          Rural interior municipalities in southern Europe have experienced sustained population decline of 1-3% per decade since the 1980s,
          driven by urban migration and aging demographics. Agricultural labor availability is typically constrained,
          with remaining workforce concentrated in seasonal activities (cork harvest, olive picking).
        </p>
        <p className="text-xs text-brand-sage">
          Land ownership patterns favor consolidation by absentee owners and institutional investors, with increasing interest from regenerative agriculture ventures.
        </p>
      </PlaceholderBox>

      <Hairline />

      {/* 9.7 Historical Land Management */}
      <SubsectionHeader id="9.7" title="Historical Land Management" sources={["NEW"]} />
      <PlaceholderBox
        id="9.7"
        title="Traditional land management practices"
        status="DERIVED FROM LAND COVER + AGRICULTURE SYSTEMS"
        synthetic
      >
        <p className="text-sm text-brand-charcoal mb-2">
          Traditional management in Mediterranean agro-silvo-pastoral systems includes rotational grazing,
          cork oak stripping on 9-year cycles, olive grove maintenance with minimal tillage,
          and controlled understory clearing (roças) for fire prevention.
        </p>
        <p className="text-xs text-brand-sage">
          Abandonment of traditional practices since the 1990s has increased fuel loads and wildfire risk across southern European landscapes.
          Reviving these practices is a core strategy in EU Common Agricultural Policy (CAP) eco-scheme incentives.
        </p>
      </PlaceholderBox>

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
              <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none font-serif">
                {trends.tempPerDecade != null
                  ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}\u00b0C`
                  : "\u2014"}
              </p>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip / Decade</div>
              <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none font-serif">
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
