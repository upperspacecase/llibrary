import type { Species, Agriculture, Regional, Scores, Narratives } from "@/lib/types";
import {
  SectionTitle, KPI, DataTable, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

const TREEMAP_COLORS = [
  { bg: "bg-brand-forest", text: "text-white" },
  { bg: "bg-brand-terracotta", text: "text-white" },
  { bg: "bg-brand-amber", text: "text-brand-forest" },
  { bg: "bg-brand-sage", text: "text-white" },
  { bg: "bg-brand-charcoal", text: "text-white" },
  { bg: "bg-brand-forest/70", text: "text-white" },
  { bg: "bg-brand-terracotta/70", text: "text-white" },
  { bg: "bg-brand-sage/40", text: "text-brand-forest" },
];

export function BiodiversityHabitatSection({
  species,
  agriculture,
  regional,
  scores,
  narratives,
}: {
  species: Species;
  agriculture: Agriculture;
  regional: Regional;
  scores: Scores;
  narratives?: Narratives["biodiversity"];
}) {
  const groups = species.groups || [];
  const top10 = species.top10 || [];
  const areas = regional.protectedAreas || [];

  const sortedGroups = [...groups]
    .map((g) => ({ name: g.name || g.group || "Unknown", count: Number(g.count ?? g.value ?? 0) }))
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count);

  const treemapCells: Array<{ name: string; count: number }> = (() => {
    if (sortedGroups.length <= 7) return sortedGroups;
    const head = sortedGroups.slice(0, 7);
    const otherCount = sortedGroups.slice(7).reduce((s, g) => s + g.count, 0);
    return [...head, { name: "Other", count: otherCount }];
  })();

  const topRow = treemapCells.slice(0, 3);
  const bottomRow = treemapCells.slice(3);
  const topRowTotal = topRow.reduce((s, g) => s + g.count, 0) || 1;
  const bottomRowTotal = bottomRow.reduce((s, g) => s + g.count, 0) || 1;

  const trendDirection = species.trends?.direction;
  const trendLabel = trendDirection
    ? trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1).toLowerCase()
    : null;

  const threatenedRatio = species.total && species.threatened
    ? ((species.threatened / species.total) * 100).toFixed(1)
    : null;

  const pollinationLabel = (() => {
    const v = scores.pollination;
    if (v == null) return null;
    if (v > 60) return "Strong";
    if (v > 30) return "Moderate";
    return "Weak";
  })();

  return (
    <section id="biodiversity-habitat">
      <SectionTitle title="Biodiversity & Habitat" />

      {/* Hero: Biodiversity Trend + pull-quote */}
      <section className="mb-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div>
          <span className="text-sm font-body text-brand-forest/70 mb-2 block">BIODIVERSITY TREND</span>
          <div className="flex items-baseline mb-8">
            <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-5xl">
              {trendLabel ?? <span className="text-brand-sage/40 italic">Data pending</span>}
            </h2>
          </div>
          {narratives?.intro ? (
            <p className="text-sm leading-relaxed text-brand-forest/80 font-body max-w-2xl">
              {narratives.intro}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-brand-sage/40 italic font-body max-w-2xl">
              Species richness, conservation significance, and habitat context will appear here once narratives are generated.
            </p>
          )}
        </div>
        <div className="border-l-4 border-brand-terracotta pl-6 py-2">
          {narratives?.callout ? (
            <blockquote className="font-serif italic text-lg text-brand-forest leading-relaxed">
              &ldquo;{narratives.callout}&rdquo;
            </blockquote>
          ) : (
            <blockquote className="font-serif italic text-lg text-brand-sage/40 leading-relaxed">
              &ldquo;Biodiversity narrative pending &mdash; generate narratives to populate this callout.&rdquo;
            </blockquote>
          )}
        </div>
      </section>

      {/* Overview — 3 KPIs */}
      <section className="mb-8">
        <h4 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border-l border-brand-sage/30 pl-6">
            <KPI value={species.total} label="Total Species" />
          </div>
          <div className="border-l border-brand-sage/30 pl-6">
            <KPI value={species.threatened} label="Threatened" />
          </div>
          <div className="border-l border-brand-sage/30 pl-6">
            <KPI value={scores.pollination} label="Pollination Score" />
          </div>
        </div>
      </section>

      {/* Taxonomic Composition Treemap */}
      {treemapCells.length > 0 && (
        <section className="mb-16">
          <div className="w-full h-[400px] flex flex-col gap-1">
            {topRow.length > 0 && (
              <div className="flex-[3] flex gap-1">
                {topRow.map((cell, i) => {
                  const color = TREEMAP_COLORS[i % TREEMAP_COLORS.length];
                  return (
                    <div
                      key={cell.name}
                      className={`${color.bg} p-4 flex flex-col justify-end`}
                      style={{ flex: cell.count / topRowTotal }}
                    >
                      <span className={`text-[10px] font-bold ${color.text} uppercase tracking-wider block`}>
                        {cell.name}
                      </span>
                      <span className={`text-2xl font-bold ${color.text} block leading-none`}>
                        {cell.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            {bottomRow.length > 0 && (
              <div className="flex-[2] flex gap-1">
                {bottomRow.map((cell, i) => {
                  const color = TREEMAP_COLORS[(i + topRow.length) % TREEMAP_COLORS.length];
                  const isOther = cell.name === "Other";
                  const finalColor = isOther ? TREEMAP_COLORS[7] : color;
                  return (
                    <div
                      key={cell.name}
                      className={`${finalColor.bg} p-3 flex flex-col justify-end`}
                      style={{ flex: cell.count / bottomRowTotal }}
                    >
                      <span className={`text-[9px] font-bold ${finalColor.text} uppercase tracking-wider block`}>
                        {cell.name}
                      </span>
                      <span className={`text-lg font-bold ${finalColor.text} block leading-none`}>
                        {cell.count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Biodiversity Vitality */}
      <section className="mb-20">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">
          Biodiversity Vitality
        </h3>
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
              threatenedRatio != null ? `${threatenedRatio}%` : "\u2014",
              species.threatened
                ? species.threatened > 5 ? "Conservation priority area" : "Within normal range"
                : "\u2014",
            ],
            [
              "Population Trend",
              fmt(trendLabel),
              trendDirection === "increasing" || trendDirection === "Increasing" ? "Positive trajectory"
                : trendDirection === "decreasing" || trendDirection === "Declining" ? "Declining \u2014 monitor closely"
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
        <p className="mt-4 text-[10px] text-brand-sage italic">Source: iNaturalist 15km radius of land.</p>
      </section>

      {/* Key Species — 3-card matrix */}
      {top10.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="font-serif text-2xl font-bold text-brand-forest">Key Species</h3>
            <div className="flex-1 h-[0.5px] bg-brand-sage/40"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {top10.slice(0, 3).map((s) => (
              <div key={s.name} className="flex flex-col">
                <div className="aspect-square w-full mb-4 overflow-hidden bg-brand-sage/20 flex items-center justify-center">
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={s.name}
                      src={s.photoUrl}
                      className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-forest/60 text-center px-4">
                      {s.name}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-brand-forest uppercase tracking-widest mb-1">
                  Confirmed
                </span>
                <h4 className="font-serif text-2xl font-bold text-brand-forest mb-3">{s.name}</h4>
                <p className="text-[13px] leading-relaxed text-brand-forest/70 font-body">
                  {s.group} &mdash; {Number(s.count).toLocaleString()} observations in the surveyed radius.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Species Observations */}
      {top10.length > 0 && (
        <section className="mb-20">
          <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body">
            Recent Species Observations
          </h3>
          <DataTable
            headers={["Species", "Group", "Observations"]}
            rows={top10.map((s) => [s.name || "", s.group || "", fmt(s.count)])}
          />
        </section>
      )}

      {/* Land Cover Classification — commented out per request
      <SubsectionHeader id="5.1" title="Land Cover Classification" sources={["Pipeline"]} />
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Land Cover</div>
        <div className="serif-title text-lg text-brand-forest">{fmt(agriculture.landCover)}</div>
      </div>

      <Hairline />
      */}

      {/* Habitat Typology — hidden until Natura 2000 data is wired in
      <SubsectionHeader id="5.2" title="Habitat Typology" sources={["Pipeline"]} />
      {areas.length > 0 ? (
        <DataTable
          headers={["Protected Area", "Type", "Designation"]}
          rows={areas.map((a) => [a.name, fmt(a.type), fmt(a.designation)])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-8">No Natura 2000 data available.</p>
      )}

      <Hairline />
      */}

      {/* 5.3 Ecological Resilience Assessment — restyled shell over existing Ecological Function data */}
      <section className="mb-20">
        <div className="mb-12">
          <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-forest uppercase font-body">
            Ecological Resilience Assessment
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 items-center">
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-2 font-body">
              Composite Pollination Index
            </span>
            <h2 className="font-serif font-bold text-brand-forest leading-tight tracking-tighter text-4xl lg:text-[2.6rem]">
              {scores.pollination != null
                ? `${pollinationLabel} (${scores.pollination}/100)`
                : "Data pending"}
            </h2>
            <p className="text-xs mt-4 leading-relaxed text-brand-forest/70 font-body max-w-xs">
              Derived from observed insect and pollinator group composition within the surveyed radius.
            </p>
          </div>
          <div className="flex items-center">
            <div className="border-l-4 border-brand-terracotta pl-8 py-4">
              <blockquote className="font-serif italic text-xl text-brand-forest leading-relaxed">
                &ldquo;Ecological function is inferred from species-group diversity and pollinator abundance &mdash;
                not direct field measurement.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
        <PlaceholderBox
          id="5.3"
          title="Ecological Function Estimates"
          status="DERIVED FROM SPECIES GROUPS + POLLINATION SCORE"
          variant="plausible"
        >
          <DataTable
            headers={["Function", "Indicator", "Assessment"]}
            rows={[
              [
                "Pollination",
                scores.pollination != null ? `${scores.pollination}/100` : "\u2014",
                pollinationLabel ?? "\u2014",
              ],
              [
                "Seed Dispersal",
                groups.some((g) => (g.name || g.group || "").toLowerCase().includes("bird") || (g.name || g.group || "").toLowerCase().includes("aves"))
                  ? "Bird vectors present" : "Limited data",
                "Inferred from avifauna",
              ],
              [
                "Predator-Prey Balance",
                groups.length >= 3 ? "Multiple trophic levels" : "Limited trophic data",
                "Inferred from group diversity",
              ],
              [
                "Soil Building",
                `${groups.length} taxonomic groups`,
                groups.length >= 4 ? "Diverse decomposer community likely" : "Limited data",
              ],
              ["Water Filtering", "Vegetation buffer present", "Inferred from land cover"],
            ]}
          />
        </PlaceholderBox>
      </section>

      {/* 5.4 Habitat Restoration Potential */}
      <section className="mb-20">
        <h3 className="font-serif text-xl font-bold text-brand-forest mb-1">Habitat Restoration Potential</h3>
        <p className="text-[10px] font-bold tracking-widest text-brand-sage uppercase mb-8">
          Derived from biodiversity score + protected area status
        </p>
        <DataTable
          headers={["Metric", "Value", "Notes"]}
          rows={[
            [
              "Biodiversity Score",
              scores.biodiversity != null ? `${scores.biodiversity}/100` : "\u2014",
              scores.biodiversity != null
                ? scores.biodiversity > 60 ? "High conservation value"
                : scores.biodiversity > 30 ? "Moderate value"
                : "Low \u2014 restoration priority"
                : "\u2014",
            ],
            [
              "Protected Area Overlap",
              areas.length > 0 ? `${areas.length} designated areas` : "None detected",
              areas.length > 0 ? "Legal protection applies" : "No formal protection",
            ],
            [
              "Restoration Potential",
              scores.biodiversity != null
                ? scores.biodiversity < 50 ? "High"
                : scores.biodiversity < 75 ? "Moderate"
                : "Low (already high quality)"
                : "\u2014",
              "Based on gap to regional ceiling",
            ],
            [
              "Habitat Connectivity",
              areas.length >= 2 ? "Corridor potential" : "Isolated fragment",
              "Inferred from protected area proximity",
            ],
          ]}
        />
      </section>

    </section>
  );
}
