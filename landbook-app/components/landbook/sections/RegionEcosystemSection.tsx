import type { Terrain, Water, Energy, Agriculture, Narratives } from "@/lib/types";
import { SectionTitle, Hairline } from "@/components/river";

/* ── MetricRow ────────────────────────────────────────────── */

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

export function RegionEcosystemSection({
  terrain,
  water,
  energy,
  agriculture,
  narratives,
}: {
  terrain: Terrain;
  water: Water;
  energy: Energy;
  agriculture: Agriculture;
  narratives?: Narratives["regionEcosystem"];
}) {
  /* Derive display values from raw data */
  const slope = terrain.slope;
  const waterIdx = water.securityIndex;
  const solarScore = (energy.solar as { score?: number })?.score ?? null;

  /* Canopy cover — latest year's "Trees" share from the Sentinel-2 land-cover
     time series (same source the wiki renders for the parcel). */
  const lcSeries = agriculture.landCoverTimeSeries ?? [];
  const latestLandCover = lcSeries.length > 0 ? lcSeries[lcSeries.length - 1] : null;
  const treesPct = latestLandCover?.classes?.Trees ?? null;

  const slopeValue = slope != null ? `${Math.round(slope)}%` : "\u2014";
  const waterValue = waterIdx != null ? `${Math.round((waterIdx / 10) * 100)}%` : "\u2014";
  const solarValue = solarScore != null ? `${Math.round(solarScore)}%` : "\u2014";

  /* Derive contextual titles from values */
  const slopeTitle =
    slope == null ? "Slope data unavailable"
    : slope < 5 ? "Gentle terrain"
    : slope < 15 ? "Moderate slope"
    : slope < 30 ? "Steeper than average"
    : "Very steep terrain";

  const waterTitle =
    waterIdx == null ? "Water data unavailable"
    : waterIdx >= 8 ? "Exceptional water security"
    : waterIdx >= 6 ? "Strong water security"
    : waterIdx >= 4 ? "Moderate water security"
    : "Limited water security";

  const solarTitle =
    solarScore == null ? "Solar data unavailable"
    : solarScore >= 70 ? "Strong solar potential"
    : solarScore >= 40 ? "Moderate solar potential"
    : "Limited solar potential";

  const canopyValue = treesPct != null ? `${Math.round(treesPct)}%` : "—";
  const canopyTitle =
    treesPct == null ? "Tree cover data pending"
    : treesPct >= 50 ? "Heavily wooded"
    : treesPct >= 25 ? "Moderate canopy"
    : treesPct >= 10 ? "Lightly wooded"
    : "Largely open";
  const canopyDesc =
    treesPct == null
      ? narratives?.treeCoverDesc
      : narratives?.treeCoverDesc ??
        `Sentinel-2 land cover (${latestLandCover?.year}): trees cover ${Math.round(treesPct)}% of the parcel.`;

  return (
    <section id="region-ecosystem">
      <SectionTitle title="Region & Ecosystem" />

      {/* Body + callout side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
        {narratives?.intro ? (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            {narratives.intro}
          </p>
        ) : (
          <p className="text-[14.6px] leading-relaxed text-brand-charcoal">
            Raw numbers are hard to interpret. We compare your parcel to the
            bioregion&mdash;so you see what&rsquo;s typical, what&rsquo;s exceptional,
            and what to do about it.
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
              &ldquo;Bioregional context pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          </div>
        )}
      </div>

      {/* ── Metric rows ─────────────────────────────────────── */}

      <MetricRow
        icon="terrain"
        value={slopeValue}
        label="Slope grade"
        title={slopeTitle}
        description={narratives?.slopeDesc}
        tip={narratives?.slopeTip}
      />

      <Hairline />

      <MetricRow
        icon="forest"
        value={canopyValue}
        label="Canopy cover"
        title={canopyTitle}
        description={canopyDesc}
        placeholder={treesPct == null}
      />

      <Hairline />

      <MetricRow
        icon="water_drop"
        value={waterValue}
        label="Reliability"
        title={waterTitle}
        description={narratives?.waterDesc}
        tip={narratives?.waterTip}
      />

      <Hairline />

      <MetricRow
        icon="solar_power"
        value={solarValue}
        label="Exposure"
        title={solarTitle}
        description={narratives?.solarDesc}
        tip={narratives?.solarTip}
      />
    </section>
  );
}
