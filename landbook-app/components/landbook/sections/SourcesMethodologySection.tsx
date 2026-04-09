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
  narratives?: Narratives["methodology"];
}) {
  const statusEntries = Object.entries(meta.apiStatus || {});
  const okCount = statusEntries.filter(([, v]) => v === "ok").length;
  const failCount = statusEntries.filter(([, v]) => v !== "ok").length;

  return (
    <section id="sources-methodology">
      <SectionTitle title="Sources & Methodology" />

      {narratives?.text && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.text}
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
      <PlaceholderBox
        id="14.2"
        title="Data freshness timestamps, resolution details, coverage gap analysis"
        status="PARTIAL — API STATUS EXISTS, FRESHNESS & GAPS ARE NEW"
      />

      <Hairline />

      {/* 14.3 Data Quality Matrix */}
      <SubsectionHeader id="14.3" title="Data Quality Matrix" sources={["NEW"]} />
      <PlaceholderBox
        id="14.3"
        title="Verified / Synthetic / Unverified classification by section and indicator"
        status="ENTIRELY NEW — NO QUALITY CLASSIFICATION SYSTEM"
      />

      <Hairline />

      {/* 14.4 Methodology Documentation */}
      <SubsectionHeader id="14.4" title="Methodology Documentation" sources={["AI"]} />
      {narratives?.text ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.text}
        </p>
      ) : (
        <p className="text-sm text-brand-sage mb-6">Methodology documentation not yet generated.</p>
      )}
      <PlaceholderBox
        id="14.4"
        title="UN SEEA-EA alignment, benefit-transfer protocols, discounting rules"
        status="PARTIAL — GENERAL TEXT EXISTS, FORMAL DOCUMENTATION IS NEW"
      />

      <Hairline />

      {/* 14.5 Uncertainty Quantification */}
      <SubsectionHeader id="14.5" title="Uncertainty Quantification" sources={["NEW"]} />
      <PlaceholderBox
        id="14.5"
        title="Confidence intervals, sensitivity tables, 'what-if' ranges"
        status="ENTIRELY NEW — NO COMPUTATION"
      />

      <Hairline />

      {/* 14.6 Update Schedule */}
      <SubsectionHeader id="14.6" title="Update Schedule" sources={["Pipeline"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <KPI value={fmt(meta.generatedAt)} label="Generated" />
        <KPI value={fmt(meta.version)} label="Pipeline Version" />
      </div>
      <PlaceholderBox
        id="14.6"
        title="Version history, refresh frequency, changelog"
        status="PARTIAL — TIMESTAMP & VERSION EXIST, CHANGELOG IS NEW"
      />

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

      <Hairline />

      {/* 14.8 Citation Library */}
      <SubsectionHeader id="14.8" title="Citation Library" sources={["NEW"]} />
      <PlaceholderBox
        id="14.8"
        title="Formal references, DOIs, URLs"
        status="ENTIRELY NEW — NO CITATION TRACKING"
      />
    </section>
  );
}
