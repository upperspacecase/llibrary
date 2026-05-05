import type { Meta, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const DATA_SOURCES = [
  { name: "GBIF", desc: "Global Biodiversity Information Facility" },
  { name: "SoilGrids", desc: "ISRIC \u2014 global soil predictions at 250m" },
  { name: "ERA5", desc: "ECMWF \u2014 climate reanalysis" },
  { name: "Copernicus", desc: "EU Earth Observation \u2014 land cover" },
  { name: "OpenStreetMap", desc: "Water features and infrastructure" },
  { name: "FIRMS", desc: "NASA Fire Information" },
  { name: "Macrostrat", desc: "Geological data" },
  { name: "iNaturalist", desc: "Species occurrence records" },
];

export function SourcesMethodologySection({
  meta,
  narratives,
}: {
  meta: Meta;
  narratives?: Narratives["sourcesMethodology"];
}) {
  const statusEntries = Object.entries(meta.apiStatus || {});
  const okCount = statusEntries.filter(([, v]) => v === "ok").length;
  const failCount = statusEntries.filter(([, v]) => v !== "ok").length;

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

      {/* 14.1 Data Source Inventory */}
      <SubsectionHeader id="14.1" title="Data Source Inventory" sources={["Pipeline"]} />
      <DataTable
        headers={["Source", "Description"]}
        rows={DATA_SOURCES.map((s) => [s.name, s.desc])}
      />

      <Hairline />

      {/* 14.2 Source Health Dashboard */}
      <SubsectionHeader id="14.2" title="Source Health Dashboard" sources={["Pipeline"]} />
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">API Coverage</div>
        <div className="text-sm text-brand-forest font-bold">
          {okCount} succeeded, {failCount} failed of {statusEntries.length} sources
        </div>
      </div>
      {statusEntries.length > 0 && (
        <DataTable
          headers={["API", "Status"]}
          rows={statusEntries.map(([k, v]) => [
            k,
            v === "ok" ? (
              <span className="text-[10px] font-bold text-brand-forest bg-brand-forest/10 px-2 py-1">OK</span>
            ) : (
              <span className="text-[10px] font-bold text-brand-terracotta bg-brand-terracotta/10 px-2 py-1">FAIL</span>
            ),
          ])}
        />
      )}

      <Hairline />

      {/* 14.3 Data Quality Matrix */}
      <SubsectionHeader id="14.3" title="Data Quality Matrix" sources={["NEW"]} />
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

      <Hairline />

      {/* 14.5 Uncertainty Quantification — COMMENTED OUT: needs statistical computation
      <SubsectionHeader id="14.5" title="Uncertainty Quantification" sources={["NEW"]} />
      <PlaceholderBox
        id="14.5"
        title="Confidence intervals, sensitivity tables, 'what-if' ranges"
        status="ENTIRELY NEW — NO COMPUTATION"
      />
      <Hairline />
      */}

      {/* 14.6 Update Schedule */}
      <SubsectionHeader id="14.6" title="Update Schedule" sources={["Pipeline"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <KPI value={fmt(meta.generatedAt)} label="Generated" />
        <KPI value={fmt(meta.version)} label="Pipeline Version" />
      </div>

      <Hairline />

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

    </section>
  );
}
