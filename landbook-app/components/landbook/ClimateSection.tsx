import type { Climate, Narratives } from "@/lib/types";
import { SectionTitle, KPI, Hairline, SeasonalGrid, DataTable } from "@/components/river";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ClimateSection({
  climate,
  narratives,
}: {
  climate: Climate;
  narratives?: Narratives["climate"];
}) {
  const highs = climate.monthlyAvgHigh || [];
  const lows = climate.monthlyAvgLow || [];
  const precip = climate.monthlyPrecip || [];

  return (
    <section>
      <SectionTitle title="Climate" />

      {narratives?.profile && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.profile}
        </p>
      )}

      <div className="grid grid-cols-5 gap-6 mb-8">
        <KPI
          value={climate.annualMeanTemp != null ? climate.annualMeanTemp.toFixed(1) : null}
          unit="\u00b0C"
          label="Mean Temp"
        />
        <KPI
          value={climate.summerMean != null ? climate.summerMean.toFixed(1) : null}
          unit="\u00b0C"
          label="Summer"
        />
        <KPI
          value={climate.winterMean != null ? climate.winterMean.toFixed(1) : null}
          unit="\u00b0C"
          label="Winter"
        />
        <KPI
          value={climate.annualRainfall != null ? Math.round(climate.annualRainfall) : null}
          unit="mm"
          label="Annual Rainfall"
        />
        <KPI value={climate.growingSeason} unit="months" label="Growing Season" />
      </div>

      <Hairline />

      <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-3">
        Climate Zone
      </div>
      <div className="serif-title text-lg text-brand-forest mb-6">
        {climate.zone ?? "\u2014"}
      </div>

      <Hairline />

      <h4 className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase mb-8">
        SEASONAL MANAGEMENT
      </h4>
      <SeasonalGrid
        seasons={[
          { period: "JAN\u2013MAR", tag: "RECHARGE", description: "Peak aquifer saturation window. Highest rainfall period." },
          { period: "APR\u2013MAY", tag: "GROWTH", description: "Maximum biomass production phase. Ideal planting." },
          { period: "JUN\u2013AUG", tag: "DORMANCY", description: "Highest evaporation vulnerability. Fire risk peaks." },
          { period: "SEP\u2013DEC", tag: "HARVEST", description: "Ideal for soil remediation and preparation works." },
        ]}
      />

      <Hairline />

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
