import type { Climate, Energy, Trends, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, SeasonalGrid, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ClimateSeasonsSection({
  climate,
  energy,
  trends,
  narratives,
}: {
  climate: Climate;
  energy: Energy;
  trends: Trends;
  narratives?: Narratives["climate"];
}) {
  const highs = climate.monthlyAvgHigh || [];
  const lows = climate.monthlyAvgLow || [];
  const precip = climate.monthlyPrecip || [];

  return (
    <section id="climate-seasons">
      <SectionTitle title="Climate & Seasons" />

      {narratives?.profile && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.profile}
        </p>
      )}

      {/* 6.1 Climate Classification */}
      <SubsectionHeader id="6.1" title="Climate Classification" sources={["Pipeline"]} />
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Climate Zone</div>
        <div className="serif-title text-lg text-brand-forest">{climate.zone ?? "\u2014"}</div>
      </div>
      <PlaceholderBox
        id="6.1"
        title="Regional comparison (vs neighbouring municipalities)"
        status="NEW — REGIONAL CLIMATE COMPARISON NOT YET IMPLEMENTED"
      />

      <Hairline />

      {/* 6.2 Temperature Regime */}
      <SubsectionHeader id="6.2" title="Temperature Regime" sources={["Pipeline"]} />
      <div className="grid grid-cols-5 gap-6 mb-8">
        <KPI value={climate.annualMeanTemp != null ? climate.annualMeanTemp.toFixed(1) : null} unit={"\u00b0C"} label="Mean Temp" />
        <KPI value={climate.summerMean != null ? climate.summerMean.toFixed(1) : null} unit={"\u00b0C"} label="Summer" />
        <KPI value={climate.winterMean != null ? climate.winterMean.toFixed(1) : null} unit={"\u00b0C"} label="Winter" />
        <KPI value={climate.frostDays} unit="days" label="Frost Days" />
        <KPI value={climate.growingSeason} unit="months" label="Growing Season" />
      </div>
      <PlaceholderBox
        id="6.2"
        title="Growing Degree Days (GDD) computation"
        status="NEW — GDD NOT YET COMPUTED FROM PIPELINE DATA"
      />

      <Hairline />

      {/* 6.3 Precipitation Patterns */}
      <SubsectionHeader id="6.3" title="Precipitation Patterns" sources={["Pipeline"]} />
      <KPI
        value={climate.annualRainfall != null ? Math.round(climate.annualRainfall) : null}
        unit="mm"
        label="Annual Rainfall"
      />
      <PlaceholderBox
        id="6.3"
        title="Drought probability, intense-event frequency, seasonality index"
        status="NEW — PRECIPITATION ANALYTICS NOT YET COMPUTED"
      />

      <Hairline />

      {/* 6.4 Solar & Radiation */}
      <SubsectionHeader id="6.4" title="Solar & Radiation" sources={["Pipeline"]} />
      {(() => {
        const solar = (energy.solar || {}) as Record<string, unknown>;
        return (
          <div className="mb-4">
            <div className="text-sm text-brand-forest">
              <span className="font-bold">Solar Potential:</span> {fmt(solar.level || solar.score || solar)}
            </div>
            {solar.detail != null && (
              <div className="text-xs text-brand-sage mt-1">{String(solar.detail)}</div>
            )}
          </div>
        );
      })()}
      <PlaceholderBox
        id="6.4"
        title="UV index, Photosynthetically Active Radiation (PAR)"
        status="NEW — UV & PAR DATA NOT IN PIPELINE"
      />

      <Hairline />

      {/* 6.5 Wind Characteristics */}
      <SubsectionHeader id="6.5" title="Wind Characteristics" sources={["Pipeline"]} />
      {(() => {
        const wind = (energy.wind || {}) as Record<string, unknown>;
        return (
          <div className="mb-4">
            <div className="text-sm text-brand-forest">
              <span className="font-bold">Wind Potential:</span> {fmt(wind.level || wind.score || wind)}
            </div>
            {wind.detail != null && (
              <div className="text-xs text-brand-sage mt-1">{String(wind.detail)}</div>
            )}
          </div>
        );
      })()}
      <PlaceholderBox
        id="6.5"
        title="Prevailing directions, storm frequency"
        status="PARTIAL — BASIC WIND DATA EXISTS, DETAILED ANALYSIS IS NEW"
      />

      <Hairline />

      {/* 6.6 Climate Trends */}
      <SubsectionHeader id="6.6" title="Climate Trends" sources={["Pipeline"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Temp Trend / Decade</div>
          <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.tempPerDecade != null
              ? `${trends.tempPerDecade > 0 ? "+" : ""}${trends.tempPerDecade.toFixed(2)}\u00b0C`
              : "\u2014"}
          </p>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Precip Trend / Decade</div>
          <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none">
            {trends.precipPerDecade != null
              ? `${trends.precipPerDecade > 0 ? "+" : ""}${trends.precipPerDecade.toFixed(1)} mm`
              : "\u2014"}
          </p>
        </div>
      </div>
      <PlaceholderBox
        id="6.6"
        title="Microclimatic variation analysis"
        status="NEW — MICROCLIMATE DATA NOT AVAILABLE"
      />

      <Hairline />

      {/* 6.7 Seasonal Calendar */}
      <SubsectionHeader id="6.7" title="Seasonal Calendar" sources={["AI", "Static"]} />
      <SeasonalGrid
        seasons={[
          { period: "JAN\u2013MAR", tag: "RECHARGE", description: "Peak aquifer saturation window. Highest rainfall period." },
          { period: "APR\u2013MAY", tag: "GROWTH", description: "Maximum biomass production phase. Ideal planting." },
          { period: "JUN\u2013AUG", tag: "DORMANCY", description: "Highest evaporation vulnerability. Fire risk peaks." },
          { period: "SEP\u2013DEC", tag: "HARVEST", description: "Ideal for soil remediation and preparation works." },
        ]}
      />
      <PlaceholderBox
        id="6.7"
        title="Phenology detail, risk-period flags"
        status="PARTIAL — SEASONAL GRID EXISTS, PHENOLOGY DETAIL IS NEW"
      />

      <Hairline />

      {/* Monthly data table */}
      {highs.length === 12 && (
        <DataTable
          headers={["Month", "High \u00b0C", "Low \u00b0C", "Precip mm"]}
          rows={MONTHS.map((m, i) => [
            m,
            highs[i] != null ? highs[i].toFixed(1) : "\u2014",
            lows[i] != null ? lows[i].toFixed(1) : "\u2014",
            precip[i] != null ? String(precip[i]) : "\u2014",
          ])}
        />
      )}
    </section>
  );
}
