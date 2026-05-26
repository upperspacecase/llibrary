import type { Narratives } from "@/lib/types";
import {
  SectionTitle, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

const DATA_SOURCES = [
  { name: "GBIF", desc: "Global Biodiversity Information Facility" },
  { name: "SoilGrids", desc: "ISRIC — global soil predictions at 250m" },
  { name: "ERA5", desc: "ECMWF — climate reanalysis" },
  { name: "Copernicus", desc: "EU Earth Observation — land cover" },
  { name: "OpenStreetMap", desc: "Water features and infrastructure" },
  { name: "FIRMS", desc: "NASA Fire Information" },
  { name: "Macrostrat", desc: "Geological data" },
  { name: "iNaturalist", desc: "Species occurrence records" },
];

export function SourcesMethodologySection({
  narratives,
}: {
  narratives?: Narratives["sourcesMethodology"];
}) {
  return (
    <section id="sources-methodology">
      <SectionTitle title="Sources & Methodology" />

      {narratives?.intro ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      ) : (
        <p className="text-[14.6px] leading-relaxed text-brand-sage/30 mb-8 max-w-[500px] italic">
          SEEA-EA framework basis, scoring methodology, and data source context will appear here once narratives are generated.
        </p>
      )}

      {/* 14.7 Important Disclaimers */}
      <SubsectionHeader id="14.7" title="Important Disclaimers" sources={["AI", "Static"]} />
      {narratives?.disclaimer ? (
        <p className="text-[12px] italic text-brand-sage">{narratives.disclaimer}</p>
      ) : (
        <p className="text-[12px] italic text-brand-sage">
          This assessment represents conditions at time of documentation.
          Land characteristics evolve; verify critical details before decisions.
          Scale approximations apply. Professional verification recommended for
          legal, financial, or planning purposes.
        </p>
      )}

      <Hairline />

      {/* 14.1 Data Source Inventory */}
      <SubsectionHeader id="14.1" title="Data Source Inventory" sources={["Pipeline"]} />
      <DataTable
        headers={["Source", "Description"]}
        rows={DATA_SOURCES.map((s) => [s.name, s.desc])}
      />

      <Hairline />

      {/* 14.3 Data Quality Matrix */}
      <PlaceholderBox
        id="14.3"
        title="Data quality classification by section"
        status="DERIVED FROM API STATUS"
        variant="plausible"
      >
        <DataTable
          headers={["Section", "Classification", "Basis"]}
          rows={[
            ["Climate & Weather", "Verified", "ERA5 API data"],
            ["Soil & Geology", "Verified", "SoilGrids + Macrostrat API data"],
            ["Biodiversity", "Verified", "GBIF + iNaturalist API data"],
            ["Fire Risk", "Verified", "NASA FIRMS API data"],
            ["Water Features", "Verified", "OpenStreetMap API data"],
            ["Land Cover", "Verified", "Copernicus API data"],
            ["Ecosystem Valuation", "Synthetic", "Derived from verified inputs via benefit-transfer"],
            ["History & Trends", "Synthetic", "Derived from climate trends + fire data"],
            ["Recommendations", "Synthetic", "AI-generated from verified inputs"],
          ]}
        />
        <p className="text-xs text-brand-sage mt-2">
          Verified = direct API data; Synthetic = algorithmically derived from verified inputs; Missing = no data source available.
        </p>
      </PlaceholderBox>

    </section>
  );
}
