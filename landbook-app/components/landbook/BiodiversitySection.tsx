import type { Species, Narratives } from "@/lib/types";
import { SectionTitle, KPI, Hairline, SwatchRow, DataTable } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function BiodiversitySection({
  species,
  narratives,
}: {
  species: Species;
  narratives?: Narratives["biodiversity"];
}) {
  const groups = species.groups || [];
  const top10 = species.top10 || [];
  const habitatTypes = groups.slice(0, 5).map((g) => g.name || g.group || "");

  return (
    <section>
      <SectionTitle title="Biodiversity & Habitat" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={species.total} label="Total Species" />
        <KPI value={species.threatened} label="Threatened" />
        <KPI value={species.gbifTotal} label="GBIF Records" />
        <KPI value={species.trends?.direction} label="Trend" />
      </div>

      <Hairline />

      {habitatTypes.length > 0 && (
        <>
          <SwatchRow items={habitatTypes.filter(Boolean)} />
          <Hairline />
        </>
      )}

      {groups.length > 0 && (
        <>
          <DataTable
            headers={["Taxonomic Group", "Count"]}
            rows={groups.map((g) => [g.name || g.group || "", fmt(g.count || g.value)])}
          />
          <Hairline />
        </>
      )}

      {top10.length > 0 && (
        <DataTable
          headers={["Species", "Group", "Observations"]}
          rows={top10.map((s) => [s.name || "", s.group || "", fmt(s.count)])}
        />
      )}
    </section>
  );
}
