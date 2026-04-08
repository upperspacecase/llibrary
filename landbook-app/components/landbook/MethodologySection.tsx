import type { Meta, Narratives } from "@/lib/types";
import { SectionTitle, KPI, Hairline, DataTable } from "@/components/river";

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

export function MethodologySection({
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
    <section>
      <SectionTitle title="Methodology" />

      {narratives?.text && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-8 mb-6">
        <KPI value={fmt(meta.generatedAt)} label="Generated" />
        <KPI value={fmt(meta.version)} label="Pipeline Version" />
      </div>

      <Hairline />

      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
          API Coverage
        </div>
        <div className="text-sm text-brand-forest font-bold">
          {okCount} succeeded, {failCount} failed of {statusEntries.length} sources
        </div>
      </div>

      <Hairline />

      <DataTable
        headers={["Source", "Description"]}
        rows={DATA_SOURCES.map((s) => [s.name, s.desc])}
      />

      {statusEntries.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["API", "Status"]}
            rows={statusEntries.map(([k, v]) => [
              k,
              v === "ok" ? (
                <span className="text-[10px] font-bold text-brand-forest bg-brand-forest/10 px-2 py-1">
                  OK
                </span>
              ) : (
                <span className="text-[10px] font-bold text-brand-terracotta bg-brand-terracotta/10 px-2 py-1">
                  FAIL
                </span>
              ),
            ])}
          />
        </>
      )}

      {narratives?.disclaimer && (
        <p className="text-[12px] italic text-brand-sage mt-8">{narratives.disclaimer}</p>
      )}
    </section>
  );
}
