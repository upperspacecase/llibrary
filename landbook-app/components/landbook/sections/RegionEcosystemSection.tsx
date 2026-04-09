import type { Regional, Narratives } from "@/lib/types";
import {
  SectionTitle, PercentileCard, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function RegionEcosystemSection({
  regional,
  narratives,
}: {
  regional: Regional;
  narratives?: Narratives["context"];
}) {
  const pctls = regional.percentiles || {};
  const areas = regional.protectedAreas || [];

  return (
    <section id="region-ecosystem">
      <SectionTitle title="Region & Ecosystem" />

      {narratives?.narrative && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.narrative}
        </p>
      )}

      {/* 2.1 Neighbourhood */}
      <SubsectionHeader id="2.1" title="Neighbourhood (15-minute radius)" sources={["NEW"]} />
      <PlaceholderBox
        id="2.1"
        title="Services, infrastructure, communities, market access, tourism nodes"
        status="NEW — NEED 15-MIN RADIUS POI QUERY VIA OVERPASS"
      />

      <Hairline />

      {/* 2.2 Bioregion */}
      <SubsectionHeader id="2.2" title="Bioregion" sources={["Pipeline", "AI"]} />
      <div className="space-y-6 mb-6">
        {pctls.soil != null && (
          <PercentileCard
            icon="landscape"
            value={`${pctls.soil}%`}
            suffix={pctls.soil > 50 ? "Above regional median" : "Below regional median"}
            description="Soil quality compared to properties within 15km radius."
          />
        )}
        {pctls.carbon != null && (
          <PercentileCard
            icon="co2"
            value={`${pctls.carbon}%`}
            suffix={pctls.carbon > 50 ? "Above regional median" : "Below regional median"}
            description="Carbon sequestration capacity relative to neighboring land."
          />
        )}
        {pctls.biodiversity != null && (
          <PercentileCard
            icon="forest"
            value={`${pctls.biodiversity}%`}
            suffix={pctls.biodiversity > 50 ? "Above regional median" : "Below regional median"}
            description="Species diversity compared to the surrounding bioregion."
          />
        )}
      </div>
      <PlaceholderBox
        id="2.2"
        title="Bioregion ecological character, regional pressures, and emerging land-use trends"
        status="PARTIAL — PERCENTILES EXIST, BIOREGION NARRATIVE IS NEW"
      />

      <Hairline />

      {/* 2.3 Watershed */}
      <SubsectionHeader id="2.3" title="Watershed" sources={["NEW"]} />
      <PlaceholderBox
        id="2.3"
        title="Hydrological role, upstream/downstream dependencies, percentile-based performance"
        status="NEW — NEED WATERSHED DELINEATION DATA"
      />

      <Hairline />

      {/* 2.4 Ecological Networks */}
      <SubsectionHeader id="2.4" title="Ecological Networks" sources={["Pipeline"]} />
      {areas.length > 0 ? (
        <DataTable
          headers={["Protected Area", "Type", "Designation"]}
          rows={areas.map((a) => [a.name, fmt(a.type), fmt(a.designation)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No protected area data available.</p>
      )}
      <PlaceholderBox
        id="2.4"
        title="Connectivity corridors & biodiversity hotspot mapping"
        status="NEW — CORRIDOR & HOTSPOT ANALYSIS NOT YET IMPLEMENTED"
      />

      <Hairline />

      {/* 2.5 Regional Socio-Economics */}
      <SubsectionHeader id="2.5" title="Regional Socio-Economics" sources={["NEW"]} />
      <PlaceholderBox
        id="2.5"
        title="Population dynamics, land-use change, agricultural and tourism drivers"
        status="ENTIRELY NEW — NO DATA SOURCE YET"
      />
    </section>
  );
}
