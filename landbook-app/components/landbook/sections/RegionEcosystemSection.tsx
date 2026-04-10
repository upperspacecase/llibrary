import type { Regional, Terrain, Water, Energy, Narratives } from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, SubsectionHeader,
} from "@/components/river";

/* ── helpers ──────────────────────────────────────────────── */

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

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
  regional,
  terrain,
  water,
  energy,
  narratives,
}: {
  regional: Regional;
  terrain: Terrain;
  water: Water;
  energy: Energy;
  narratives?: Narratives["regionEcosystem"];
}) {
  const areas = regional.protectedAreas || [];

  /* Derive display values from raw data */
  const slope = terrain.slope;
  const waterIdx = water.securityIndex;
  const solarScore = (energy.solar as { score?: number })?.score ?? null;

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

  return (
    <section id="region-ecosystem">
      <SectionTitle title="Region & Ecosystem" />

      {/* Editorial heading */}
      <h3 className="font-serif italic text-[28px] text-brand-forest leading-snug mb-4 max-w-[420px]">
        Why bioregional context matters
      </h3>

      {narratives?.intro ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-10 max-w-[480px]">
          {narratives.intro}
        </p>
      ) : (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-10 max-w-[480px]">
          Raw numbers are hard to interpret. We compare your parcel to the
          bioregion&mdash;so you see what&rsquo;s typical, what&rsquo;s exceptional,
          and what to do about it.
        </p>
      )}

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
        value={"\u2014"}
        label="Canopy cover"
        title="Tree cover data pending"
        description={narratives?.treeCoverDesc}
        placeholder
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

      {/* ── Callout ─────────────────────────────────────────── */}

      {narratives?.callout ? (
        <div className="border-l-[6px] border-brand-terracotta pl-8 py-4 my-10">
          <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
            &ldquo;{narratives.callout}&rdquo;
          </blockquote>
        </div>
      ) : (
        <div className="border-l-[6px] border-brand-sage/20 pl-8 py-4 my-10">
          <blockquote className="text-brand-sage/30 leading-tight text-2xl font-serif italic">
            &ldquo;Bioregional context pending &mdash; generate narratives to populate this callout.&rdquo;
          </blockquote>
        </div>
      )}

      <Hairline />

      {/* ── 2.4 Ecological Networks ─────────────────────────── */}
      <SubsectionHeader id="2.4" title="Ecological Networks" sources={["Pipeline"]} />
      {areas.length > 0 ? (
        <DataTable
          headers={["Protected Area", "Type", "Designation"]}
          rows={areas.map((a) => [a.name, fmt(a.type), fmt(a.designation)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No protected area data available.</p>
      )}
    </section>
  );
}
