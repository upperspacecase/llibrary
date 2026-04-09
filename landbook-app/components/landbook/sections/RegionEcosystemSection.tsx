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
      {/* 2.1 BUILD — infrastructure POIs from Overpass. Data will come from pipeline enhancement. */}
      <p className="text-sm text-brand-sage mb-6">
        Neighbourhood infrastructure data will be populated via Overpass API radius query.
      </p>

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
        title="Bioregion Ecological Character"
        status="DERIVED FROM REGIONAL PERCENTILES + PROTECTED AREAS"
        synthetic
      >
        <div className="text-sm text-brand-charcoal space-y-2">
          {areas.length > 0 && (
            <p>
              <span className="font-bold">Protected area context:</span> Within proximity of {areas.length} designated area{areas.length > 1 ? "s" : ""}{" "}
              ({areas.slice(0, 3).map((a) => a.name).join(", ")}{areas.length > 3 ? "..." : ""}),
              indicating recognised ecological significance.
            </p>
          )}
          {pctls.biodiversity != null && (
            <p>
              <span className="font-bold">Regional standing:</span> Biodiversity at {pctls.biodiversity}th percentile
              {pctls.soil != null && <>, soil quality at {pctls.soil}th percentile</>}
              {pctls.carbon != null && <>, carbon storage at {pctls.carbon}th percentile</>}
              {" "}relative to surrounding properties.
            </p>
          )}
          <p>
            <span className="font-bold">Pressures:</span> Fire risk, rural depopulation, and agricultural intensification are
            the primary landscape-level pressures across the Mediterranean bioregion.
          </p>
        </div>
      </PlaceholderBox>

      <Hairline />

      {/* 2.3 Watershed — COMMENTED OUT: needs watershed delineation data
      <SubsectionHeader id="2.3" title="Watershed" sources={["NEW"]} />
      <PlaceholderBox
        id="2.3"
        title="Hydrological role, upstream/downstream dependencies, percentile-based performance"
        status="NEW — NEED WATERSHED DELINEATION DATA"
      />
      <Hairline />
      */}

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
      {/* 2.4 Connectivity corridors — COMMENTED OUT: needs corridor/fragmentation analysis
      <PlaceholderBox
        id="2.4"
        title="Connectivity corridors & biodiversity hotspot mapping"
        status="NEW — CORRIDOR & HOTSPOT ANALYSIS NOT YET IMPLEMENTED"
      />
      */}

    </section>
  );
}
