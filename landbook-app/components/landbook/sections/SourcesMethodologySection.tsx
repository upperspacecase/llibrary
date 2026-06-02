import { SectionTitle, Hairline, DataTable, SubsectionHeader } from "@/components/river";

/* Per-section data provenance: which sources feed each report page and how
 * its figures are produced. Mirrors the pipeline's apiStatus → section map. */
const SECTION_SOURCES: Array<{ section: string; sources: string; methodology: string }> = [
  {
    section: "Overview",
    sources: "All sources (aggregated)",
    methodology: "Roll-up of section scores and data-source status — no new data",
  },
  {
    section: "Region & Ecosystem",
    sources: "Open-Meteo (elevation, solar/wind); OpenStreetMap (water features)",
    methodology: "Derived: slope, water-security index and solar exposure compared to the bioregion",
  },
  {
    section: "Land & Water",
    sources: "Open-Meteo (elevation); Macrostrat (geology); OpenStreetMap (springs/wells/waterways)",
    methodology: "Direct terrain/geology/water-feature data; water-security index derived from drought + surface/groundwater + rainfall",
  },
  {
    section: "Biodiversity & Habitat",
    sources: "iNaturalist; GBIF; OpenStreetMap (protected areas)",
    methodology: "Species counts queried over the parcel area; pollination & biodiversity scores derived from group composition",
  },
  {
    section: "Climate & Seasons",
    sources: "Open-Meteo Climate Averages (ERA5, 30-yr normals); Open-Meteo Solar/Wind",
    methodology: "30-year climate normals; solar/wind potential derived from irradiance & wind speed",
  },
  {
    section: "Value & Benefits",
    sources: "Derived (no direct API)",
    methodology: "Derived: ecosystem-service benefit-transfer valuation from verified inputs",
  },
  {
    section: "History & Trends",
    sources: "Open-Meteo 50-yr Archive; NASA FIRMS (fire)",
    methodology: "Linear regression on 50-yr temp & precipitation; forest/vegetation/water trajectories derived from the precipitation trend",
  },
  {
    section: "Risks & Resilience",
    sources: "NASA FIRMS (fire); Open-Meteo Solar/Wind; computed risk scores",
    methodology: "Hazard risk scoring; resilience capacity derived from risk scores, energy & climate trends",
  },
  {
    section: "Future Scenarios",
    sources: "Derived from economics",
    methodology: "Scenario projections derived from natural-capital revenue layers",
  },
];

export function SourcesMethodologySection() {
  return (
    <section id="sources-methodology">
      <SectionTitle title="Sources & Methodology" />

      <p className="text-[12px] font-bold text-brand-forest uppercase tracking-widest mb-2">
        Important Disclaimer
      </p>
      <p className="text-[12px] italic text-brand-sage mb-10 max-w-[600px] leading-relaxed">
        This Landbook assessment provides informational guidance only. Consult qualified
        forestry, agricultural, and investment professionals before making property
        acquisition, management, or development decisions.
      </p>

      <Hairline />

      <SubsectionHeader id="14.1" title="Sources & Methodology by Section" sources={["Pipeline"]} />
      <DataTable
        headers={["Section", "Sources", "Methodology"]}
        rows={SECTION_SOURCES.map((s) => [s.section, s.sources, s.methodology])}
      />
    </section>
  );
}
