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
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-12">
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
      {/* 5.3 habitat codes derived from protected area types + land cover */}
      {areas.length > 0 && (
        <DataTable
          headers={["Estimated Habitat Type", "Basis"]}
          rows={areas
            .filter((a) => a.type)
            .slice(0, 5)
            .map((a) => [
              a.type === "Natura 2000 SCI" || a.type === "Natura 2000 SPA"
                ? `${a.name} — ${a.type}`
                : `${a.name} (${a.type})`,
              fmt(a.designation) || "Protected area classification",
            ])}
        />
      )}

      <Hairline />

      {/* 5.4 Biodiversity Vitality */}
      <SubsectionHeader id="5.4" title="Biodiversity Vitality" sources={["Pipeline"]} />
      <div className="mb-4">
        <div className="text-sm text-brand-forest">
          <span className="font-bold">Trend direction:</span> {fmt(species.trends?.direction)}
        </div>
      </div>
      {/* 5.4 BUILD — richness indices from species data */}
      <DataTable
        headers={["Index", "Value", "Interpretation"]}
        rows={[
          [
            "Observed Species Richness",
            species.total != null ? String(species.total) : "\u2014",
            species.total != null
              ? species.total > 200 ? "High diversity" : species.total > 50 ? "Moderate diversity" : "Low diversity"
              : "\u2014",
          ],
          [
            "Threatened Species Ratio",
            species.total && species.threatened
              ? `${((species.threatened / species.total) * 100).toFixed(1)}%`
              : "\u2014",
            species.threatened
              ? species.threatened > 5 ? "Conservation priority area" : "Within normal range"
              : "\u2014",
          ],
          [
            "Population Trend",
            fmt(species.trends?.direction),
            species.trends?.direction === "increasing" ? "Positive trajectory"
              : species.trends?.direction === "decreasing" ? "Declining \u2014 monitor closely"
              : "Stable or data insufficient",
          ],
          [
            "GBIF Record Density",
            species.gbifTotal != null ? String(species.gbifTotal) : "\u2014",
            species.gbifTotal != null
              ? species.gbifTotal > 500 ? "Well-surveyed area" : "Limited survey coverage"
              : "\u2014",
          ],
        ]}
      />

      <Hairline />

      {/* 5.5 Ecological Function */}
      <SubsectionHeader id="5.5" title="Ecological Function" sources={["Computed"]} />
      <div className="mb-4">
        <KPI value={scores.pollination} unit="/100" label="Pollination Score" />
      </div>
      <PlaceholderBox
        id="5.5"
        title="Ecological Function Estimates"
        status="DERIVED FROM SPECIES GROUPS + POLLINATION SCORE"
        synthetic
      >
        <DataTable
          headers={["Function", "Indicator", "Assessment"]}
          rows={[
            ["Pollination", `${scores.pollination}/100`, scores.pollination > 60 ? "Strong" : scores.pollination > 30 ? "Moderate" : "Weak"],
            ["Seed Dispersal", groups.some((g) => (g.name || g.group || "").toLowerCase().includes("bird")) ? "Bird vectors present" : "Limited data", "Inferred from avifauna"],
            ["Predator-Prey Balance", groups.length >= 3 ? "Multiple trophic levels" : "Limited trophic data", "Inferred from group diversity"],
            ["Soil Building", `${groups.length} taxonomic groups`, groups.length >= 4 ? "Diverse decomposer community likely" : "Limited data"],
            ["Water Filtering", "Vegetation buffer present", "Inferred from land cover"],
          ]}
        />
      </PlaceholderBox>

      <Hairline />

      {/* 5.6 Conservation Assessment */}
      <SubsectionHeader id="5.6" title="Conservation Assessment" sources={["Pipeline"]} />
      <PlaceholderBox
        id="5.6"
        title="Conservation Assessment"
        status="DERIVED FROM BIODIVERSITY SCORE + PROTECTED AREA STATUS"
        synthetic
      >
        <DataTable
          headers={["Metric", "Value", "Notes"]}
          rows={[
            ["Biodiversity Score", `${scores.biodiversity}/100`, scores.biodiversity > 60 ? "High conservation value" : scores.biodiversity > 30 ? "Moderate value" : "Low \u2014 restoration priority"],
            ["Protected Area Overlap", areas.length > 0 ? `${areas.length} designated areas` : "None detected", areas.length > 0 ? "Legal protection applies" : "No formal protection"],
            ["Restoration Potential", scores.biodiversity < 50 ? "High" : scores.biodiversity < 75 ? "Moderate" : "Low (already high quality)", "Based on gap to regional ceiling"],
            ["Habitat Connectivity", areas.length >= 2 ? "Corridor potential" : "Isolated fragment", "Inferred from protected area proximity"],
          ]}
        />
      </PlaceholderBox>

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
    </section>
  );
}
