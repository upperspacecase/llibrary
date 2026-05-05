import type { Trends, FireData, Narratives } from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function HistoryTrendsSection({
  trends,
  fire,
  narratives,
}: {
  trends: Trends;
  fire: FireData;
  narratives?: Narratives["historyTrends"];
}) {
  return (
    <section id="history-trends">
      <SectionTitle title="History & Trends" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-sage/30 italic">
            Temperature and precipitation trends, their impact on long-term property value, and historical context will appear here once narratives are generated.
          </p>
        )}

        {narratives?.callout ? (
          <div className="border-l-[6px] border-brand-terracotta pl-6">
            <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
              &ldquo;{narratives.callout}&rdquo;
            </blockquote>
          </div>
        ) : (
          <div className="border-l-[6px] border-brand-sage/20 pl-6">
            <blockquote className="text-brand-sage/30 leading-tight text-2xl font-serif italic">
              &ldquo;Trends narrative pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* Climate Trend Summary — moved up to sit under body + callout */}
      {(trends.tempPerDecade != null || trends.precipPerDecade != null) && (
        <>
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

      <Hairline />

      {/* 9.1 Land Cover Change */}
      <SubsectionHeader id="9.1" title="Land Cover Change (2000-2024)" sources={["NEW"]} />
      <PlaceholderBox
        id="9.1"
        title="Forest gain/loss estimate"
        status="DERIVED FROM LAND COVER TYPE + CLIMATE TRENDS"
        variant="plausible"
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
        variant="plausible"
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
        variant="plausible"
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
        variant="plausible"
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

    </section>
  );
}
