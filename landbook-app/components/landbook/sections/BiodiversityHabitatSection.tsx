import type { Species, Agriculture, Regional, Economics, Scores, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, Hairline, SwatchRow, DataTable, SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function BiodiversityHabitatSection({
  species,
  agriculture,
  regional,
  economics,
  scores,
  narratives,
}: {
  species: Species;
  agriculture: Agriculture;
  regional: Regional;
  economics: Economics;
  scores: Scores;
  narratives?: Narratives["biodiversity"];
}) {
  const groups = species.groups || [];
  const top10 = species.top10 || [];
  const habitatTypes = groups.slice(0, 5).map((g) => g.name || g.group || "");
  const areas = regional.protectedAreas || [];

  return (
    <section id="biodiversity-habitat">
      <SectionTitle title="Biodiversity & Habitat" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      {/* 5.1 Land Cover Classification */}
      <SubsectionHeader id="5.1" title="Land Cover Classification" sources={["Pipeline"]} />
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Land Cover</div>
        <div className="serif-title text-lg text-brand-forest">{fmt(agriculture.landCover)}</div>
      </div>

      <Hairline />

      {/* 5.2 Species Inventory */}
      <SubsectionHeader id="5.2" title="Species Inventory" sources={["Pipeline"]} />
      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={species.total} label="Total Species" />
        <KPI value={species.threatened} label="Threatened" />
        <KPI value={species.gbifTotal} label="GBIF Records" />
        <KPI value={species.trends?.direction} label="Trend" />
      </div>

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
        <>
          <DataTable
            headers={["Species", "Group", "Observations"]}
            rows={top10.map((s) => [s.name || "", s.group || "", fmt(s.count)])}
          />
          <Hairline />
        </>
      )}

      {/* 5.3 Habitat Typology */}
      <SubsectionHeader id="5.3" title="Habitat Typology" sources={["Pipeline"]} />
      {areas.length > 0 ? (
        <DataTable
          headers={["Protected Area", "Type", "Designation"]}
          rows={areas.map((a) => [a.name, fmt(a.type), fmt(a.designation)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No Natura 2000 data available.</p>
      )}
      <PlaceholderBox
        id="5.3"
        title="Natura 2000 habitat codes, ecosystem mapping, fragmentation index"
        status="PARTIAL — PROTECTED AREAS EXIST, HABITAT CODES & FRAGMENTATION ARE NEW"
      />

      <Hairline />

      {/* 5.4 Biodiversity Vitality */}
      <SubsectionHeader id="5.4" title="Biodiversity Vitality" sources={["Pipeline"]} />
      <div className="mb-4">
        <div className="text-sm text-brand-forest">
          <span className="font-bold">Trend direction:</span> {fmt(species.trends?.direction)}
        </div>
      </div>
      <PlaceholderBox
        id="5.4"
        title="Richness indices, population trends, breeding evidence"
        status="PARTIAL — TREND DIRECTION EXISTS, DETAILED INDICES ARE NEW"
      />

      <Hairline />

      {/* 5.5 Ecological Function */}
      <SubsectionHeader id="5.5" title="Ecological Function" sources={["Computed"]} />
      <div className="mb-4">
        <KPI value={scores.pollination} unit="/100" label="Pollination Score" />
      </div>
      <PlaceholderBox
        id="5.5"
        title="Seed dispersal, predator-prey dynamics, soil-building, water-filtering processes"
        status="MOSTLY NEW — ONLY POLLINATION SCORE EXISTS"
      />

      <Hairline />

      {/* 5.6 Conservation Assessment */}
      <SubsectionHeader id="5.6" title="Conservation Assessment" sources={["Pipeline"]} />
      <PlaceholderBox
        id="5.6"
        title="Habitat quality scoring, restoration potential assessment"
        status="PARTIAL — PROTECTED STATUS EXISTS, QUALITY & RESTORATION ARE NEW"
      />

      <Hairline />

      {/* 5.7 Carbon Storage */}
      <SubsectionHeader id="5.7" title="Carbon Storage" sources={["Computed"]} />
      <div className="grid grid-cols-2 gap-8 mb-6">
        <KPI
          value={economics.carbonStock ? `${economics.carbonStock.toLocaleString()} tC` : null}
          label="Carbon Stock"
        />
        <KPI
          value={economics.carbonAnnualSeq ? `${economics.carbonAnnualSeq.toLocaleString()} tC/yr` : null}
          label="Sequestration Rate"
        />
      </div>
      <PlaceholderBox
        id="5.7"
        title="Verification status (certified / estimated / unverified)"
        status="NEW — NO VERIFICATION TRACKING"
      />
    </section>
  );
}
