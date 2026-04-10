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
  narratives?: Narratives["climateSeasons"];
}) {
  const highs = climate.monthlyAvgHigh || [];
  const lows = climate.monthlyAvgLow || [];
  const precip = climate.monthlyPrecip || [];

  return (
    <section id="climate-seasons">
      <SectionTitle title="Climate & Seasons" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      {/* 6.1 Climate Classification */}
      <SubsectionHeader id="6.1" title="Climate Classification" sources={["Pipeline"]} />
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Climate Zone</div>
        <div className="serif-title text-lg text-brand-forest">{climate.zone ?? "\u2014"}</div>
      </div>
      {/* Regional comparison deferred until 20km ring data is in the pipeline */}

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
      {highs.length === 12 && lows.length === 12 && (() => {
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const base = 10;
        let totalGDD = 0;
        const monthlyGDD = MONTHS.map((m, i) => {
          const avgTemp = (highs[i] + lows[i]) / 2;
          const gdd = avgTemp > base ? Math.round((avgTemp - base) * daysInMonth[i]) : 0;
          totalGDD += gdd;
          return { month: m, avgTemp: avgTemp.toFixed(1), gdd };
        });
        return (
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
              Growing Degree Days (base 10 °C)
            </div>
            <p className="text-[32px] font-black tracking-tighter text-brand-forest leading-none mb-4">
              {totalGDD.toLocaleString()} <span className="text-sm font-normal text-brand-sage">GDD</span>
            </p>
            <DataTable
              headers={["Month", "Avg °C", "GDD"]}
              rows={monthlyGDD.map((r) => [r.month, r.avgTemp, String(r.gdd)])}
            />
          </div>
        );
      })()}

      <Hairline />

      {/* 6.3 Precipitation Patterns */}
      <SubsectionHeader id="6.3" title="Precipitation Patterns" sources={["Pipeline"]} />
      <KPI
        value={climate.annualRainfall != null ? Math.round(climate.annualRainfall) : null}
        unit="mm"
        label="Annual Rainfall"
      />
      {precip.length === 12 && (() => {
        const dryMonths = precip.map((p, i) => ({ month: MONTHS[i], precip: p })).filter((m) => m.precip < 30);
        const maxPrecip = Math.max(...precip);
        const minPrecip = Math.min(...precip);
        const wettestIdx = precip.indexOf(maxPrecip);
        const driestIdx = precip.indexOf(minPrecip);
        const totalRain = climate.annualRainfall ?? precip.reduce((s, v) => s + v, 0);
        const meanMonthly = totalRain / 12;
        const seasonalityIndex = meanMonthly > 0
          ? Math.round(precip.reduce((s, v) => s + Math.abs(v - meanMonthly), 0) / totalRain * 100) / 100
          : 0;
        return (
          <PlaceholderBox id="6.3" title="Drought & Seasonality Indicators" status="DERIVED FROM MONTHLY PRECIPITATION DATA" synthetic>
            <div className="grid grid-cols-2 gap-4 text-sm text-brand-forest">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Dry Months (&lt; 30 mm)</span>
                <span className="font-bold">{dryMonths.length}</span>
                {dryMonths.length > 0 && (
                  <span className="text-xs text-brand-sage ml-2">({dryMonths.map((m) => m.month).join(", ")})</span>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Total Annual Rainfall</span>
                <span className="font-bold">{Math.round(totalRain).toLocaleString()} mm</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Wettest Month</span>
                <span className="font-bold">{MONTHS[wettestIdx]}</span>
                <span className="text-xs text-brand-sage ml-1">({Math.round(maxPrecip)} mm)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Driest Month</span>
                <span className="font-bold">{MONTHS[driestIdx]}</span>
                <span className="text-xs text-brand-sage ml-1">({Math.round(minPrecip)} mm)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Seasonality Index</span>
                <span className="font-bold">{seasonalityIndex.toFixed(2)}</span>
                <span className="text-xs text-brand-sage ml-1">
                  ({seasonalityIndex < 0.2 ? "Low" : seasonalityIndex < 0.4 ? "Moderate" : seasonalityIndex < 0.6 ? "High" : "Very High"})
                </span>
              </div>
            </div>
          </PlaceholderBox>
        );
      })()}

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
      {/* UV/PAR deferred until Google Solar API integration */}

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
      {/* Detailed wind analysis deferred until directional data is in the pipeline */}

      {narratives?.callout && (
        <div className="border-l-[6px] border-brand-terracotta pl-8 py-4 my-8">
          <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
            &ldquo;{narratives.callout}&rdquo;
          </blockquote>
        </div>
      )}

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
      {highs.length === 12 && lows.length === 12 && (() => {
        const frostDays = climate.frostDays ?? 0;
        const growingSeason = climate.growingSeason ?? 0;

        // Estimate last spring frost: scan forward from Jan until monthly avg low > 2°C
        let lastFrostMonth = -1;
        for (let i = 0; i < 6; i++) {
          if (lows[i] != null && lows[i] <= 2) lastFrostMonth = i;
        }
        // Estimate first autumn frost: scan backward from Dec until monthly avg low > 2°C
        let firstFrostMonth = -1;
        for (let i = 11; i >= 6; i--) {
          if (lows[i] != null && lows[i] <= 2) { firstFrostMonth = i; break; }
        }

        const lastFrostLabel = lastFrostMonth >= 0 ? `Late ${MONTHS[lastFrostMonth]}` : "None detected";
        const firstFrostLabel = firstFrostMonth >= 0 ? `Early ${MONTHS[firstFrostMonth]}` : "None detected";
        const growingSeasonLength = growingSeason > 0 ? `${growingSeason} months` : "\u2014";

        // Risk periods: months where avg low < 5°C (frost risk) or avg high > 35°C (heat stress)
        const frostRisk = MONTHS.filter((_, i) => lows[i] != null && lows[i] < 5);
        const heatRisk = MONTHS.filter((_, i) => highs[i] != null && highs[i] > 35);

        return (
          <PlaceholderBox id="6.7" title="Phenology Estimates" status="DERIVED FROM GROWING SEASON + FROST DAYS + MONTHLY TEMPS" synthetic>
            <div className="grid grid-cols-2 gap-4 text-sm text-brand-forest">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Last Spring Frost (est.)</span>
                <span className="font-bold">{lastFrostLabel}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">First Autumn Frost (est.)</span>
                <span className="font-bold">{firstFrostLabel}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Growing Season Length</span>
                <span className="font-bold">{growingSeasonLength}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Frost Days / Year</span>
                <span className="font-bold">{frostDays}</span>
              </div>
              {frostRisk.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Frost Risk Months</span>
                  <span className="font-bold">{frostRisk.join(", ")}</span>
                </div>
              )}
              {heatRisk.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-brand-sage block mb-1">Heat Stress Months</span>
                  <span className="font-bold">{heatRisk.join(", ")}</span>
                </div>
              )}
            </div>
          </PlaceholderBox>
        );
      })()}

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
