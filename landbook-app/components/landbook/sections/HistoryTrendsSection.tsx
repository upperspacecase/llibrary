import type { Trends, FireData, Narratives } from "@/lib/types";
import { SectionTitle, Hairline, DataTable, SubsectionHeader } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

/* ── MetricRow (mirrors Region & Ecosystem) ───────────────── */

interface MetricRowProps {
  icon: string;
  value: string;
  label: string;
  title: string;
  description?: string;
  tip?: string;
  placeholder?: boolean;
}

function MetricRow({ icon, value, label, title, description, tip, placeholder }: MetricRowProps) {
  return (
    <div className={`flex gap-10 items-start py-10 ${placeholder ? "opacity-40" : ""}`}>
      {/* Left: icon + stat */}
      <div className="flex items-center gap-5 shrink-0 w-[200px]">
        <span className="material-symbols-outlined text-brand-forest text-2xl">
          {icon}
        </span>
        <div>
          <span className="block text-[43px] font-bold tracking-tighter leading-none text-brand-forest font-serif">
            {value}
          </span>
          <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-brand-charcoal mt-1">
            {label}
          </span>
        </div>
      </div>

      {/* Right: title + description + optional tip */}
      <div className="flex-1 pt-1">
        <p className="text-[15px] font-bold text-brand-charcoal mb-1">
          {title}
        </p>
        {description ? (
          <p className="text-sm text-brand-charcoal/80 leading-relaxed max-w-[420px]">
            {description}
          </p>
        ) : (
          <p className="text-sm text-brand-sage/30 leading-relaxed max-w-[420px] italic">
            Generate narratives to add contextual insight for this metric.
          </p>
        )}
        {tip ? (
          <div className="border-l-4 border-brand-terracotta pl-4 mt-3">
            <p className="text-sm italic text-brand-forest leading-relaxed">
              {tip}
            </p>
          </div>
        ) : null}
        {placeholder && (
          <p className="text-xs text-brand-sage mt-2 uppercase tracking-wider">
            Data not yet available
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Section ──────────────────────────────────────────────── */

export function HistoryTrendsSection({
  trends,
  fire,
  narratives,
}: {
  trends: Trends;
  fire: FireData;
  narratives?: Narratives["historyTrends"];
}) {
  const temp = trends.tempPerDecade;
  const precip = trends.precipPerDecade;

  /* Temperature trend */
  const tempValue = temp != null ? `${temp > 0 ? "+" : ""}${temp.toFixed(2)}°C` : "—";
  const tempTitle =
    temp == null ? "Temperature trend pending"
    : temp > 0.05 ? "Warming trend"
    : temp < -0.05 ? "Cooling trend"
    : "Stable temperatures";
  const tempDesc =
    temp == null ? undefined
    : temp > 0.15
      ? `Warming of ${temp > 0 ? "+" : ""}${temp.toFixed(2)}°C per decade raises evapotranspiration, reducing effective moisture for vegetation and water resources.`
      : `Temperature shift of ${temp > 0 ? "+" : ""}${temp.toFixed(2)}°C per decade has limited impact on growing-season length.`;

  /* Precipitation trend */
  const precipValue = precip != null ? `${precip > 0 ? "+" : ""}${precip.toFixed(1)} mm` : "—";
  const precipTitle =
    precip == null ? "Precipitation trend pending"
    : precip > 0 ? "Wetter trend"
    : precip < 0 ? "Drier trend"
    : "Stable rainfall";
  const precipDesc =
    precip == null ? undefined
    : precip > 0
      ? `Precipitation increasing at ${precip.toFixed(1)} mm per decade supports stable to improving conditions.`
      : `Precipitation declining at ${Math.abs(precip).toFixed(1)} mm per decade signals growing seasonal water stress.`;

  /* Forest cover change (derived from precipitation trend) */
  const forestLoss = precip != null && precip < 0;
  const forestValue = precip == null ? "—" : forestLoss ? "Loss" : "Stable";
  const forestDesc =
    precip == null
      ? "Insufficient precipitation trend data to estimate canopy direction."
      : forestLoss
        ? "Declining precipitation suggests gradual canopy thinning and possible shrubland encroachment over recent decades."
        : "Stable or increasing precipitation suggests maintained or expanding forest cover, though fire disturbance may offset gains.";

  /* Vegetation health proxy (derived from precipitation trend) */
  const vegValue = precip == null ? "—" : precip > 0 ? "Strong" : "Stress";
  const vegDesc =
    precip == null
      ? "Insufficient precipitation trend data to estimate vegetation trajectory."
      : precip > 0
        ? `Precipitation increasing at ${precip.toFixed(1)} mm per decade — vegetation productivity likely stable or improving.`
        : `Precipitation declining at ${Math.abs(precip).toFixed(1)} mm per decade — vegetation stress and lower NDVI values expected in recent years.`;

  /* Water resource trajectory (derived from precipitation trend) */
  const waterValue = precip == null ? "—" : precip < 0 ? "Lower" : "Stable";
  const waterDesc =
    precip == null
      ? "No precipitation trend data available to estimate water resource trajectory."
      : precip < -5
        ? "Significant precipitation decline suggests reduced aquifer recharge and lower baseflows in local watercourses."
        : precip < 0
          ? "Mild precipitation decline — seasonal availability may shift, but annual totals remain broadly adequate."
          : "Stable or increasing precipitation supports consistent water resource availability.";

  const fireHistory = fire.historical || [];
  const disturbanceDesc =
    fireHistory.length > 0
      ? `Fire detections recorded across ${fireHistory.length} year(s). Post-fire landscapes are more susceptible to flash flooding due to reduced soil infiltration.`
      : "No fire disturbance recorded — flood risk driven primarily by terrain and precipitation intensity.";

  return (
    <section id="history-trends">
      <SectionTitle title="History & Trends" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 items-start">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-sage/30 italic">
            Temperature and precipitation trends and their historical context will appear here once narratives are generated.
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

      <MetricRow icon="thermostat" value={tempValue} label="Temp / decade" title={tempTitle} description={tempDesc} />

      <Hairline />

      <MetricRow icon="rainy" value={precipValue} label="Precip / decade" title={precipTitle} description={precipDesc} />

      <Hairline />

      <MetricRow icon="forest" value={forestValue} label="Forest cover" title="Forest cover change" description={forestDesc} />

      <Hairline />

      <MetricRow icon="grass" value={vegValue} label="Vegetation" title="Vegetation health proxy" description={vegDesc} />

      <Hairline />

      <MetricRow icon="water_drop" value={waterValue} label="Water resource" title="Water resource trajectory" description={waterDesc} />

      <Hairline />

      <MetricRow
        icon="local_fire_department"
        value={fireHistory.length > 0 ? String(fireHistory.length) : "—"}
        label="Fire years"
        title="Disturbance & flood interaction"
        description={disturbanceDesc}
      />

      {/* Disturbance Events — historical fire record */}
      <SubsectionHeader id="9.5" title="Disturbance Events" sources={["Pipeline"]} />
      {fireHistory.length > 0 ? (
        <DataTable
          headers={["Year", "Fire Detections"]}
          rows={fireHistory.map((h) => [String(h.year), fmt(h.count)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No historical fire data available.</p>
      )}
    </section>
  );
}
