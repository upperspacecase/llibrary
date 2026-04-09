import type { Agriculture, Compliance, Economics, Narratives } from "@/lib/types";
import {
  SectionTitle, Hairline, SwatchRow, DataTable, RiskBadge, KPI,
  SubsectionHeader, PlaceholderBox,
} from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function LandUseSection({
  agriculture,
  compliance,
  economics,
  narratives,
}: {
  agriculture: Agriculture;
  compliance: Compliance;
  economics: Economics;
  narratives?: { agriculture?: Narratives["agriculture"]; compliance?: Narratives["compliance"] };
}) {
  const systems = agriculture.systems || [];
  const items = compliance.items || [];
  const revDetails = economics.revenueScenarios?.details || [];

  return (
    <section id="land-use">
      <SectionTitle title="Land Use" />

      {narratives?.agriculture?.potential && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.agriculture.potential}
        </p>
      )}

      {/* 8.1 Current Use Mapping */}
      <SubsectionHeader id="8.1" title="Current Use Mapping" sources={["Pipeline"]} />
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">Land Cover</div>
        <div className="serif-title text-lg text-brand-forest">{fmt(agriculture.landCover)}</div>
      </div>
      <PlaceholderBox
        id="8.1"
        title="Detailed land-use map with intensity classification (extensive / moderate / intensive)"
        status="PARTIAL — LAND COVER TYPE EXISTS, INTENSITY MAPPING IS NEW"
      />

      <Hairline />

      {/* 8.2 Productive Systems */}
      <SubsectionHeader id="8.2" title="Productive Systems" sources={["Pipeline"]} />
      {systems.length > 0 ? (
        <>
          <SwatchRow items={systems.slice(0, 4).map((s) => s.name || s.system || "")} />
          <Hairline />
          <DataTable
            headers={["System", "Description", "Suitability"]}
            rows={systems.map((s) => [
              fmt(s.name || s.system),
              fmt(s.description || s.detail),
              fmt(s.suitability || s.rating),
            ])}
          />
        </>
      ) : (
        <p className="text-sm text-brand-sage mb-6">No agricultural systems data available.</p>
      )}

      <Hairline />

      {/* 8.3 Infrastructure Inventory */}
      <SubsectionHeader id="8.3" title="Infrastructure Inventory" sources={["NEW"]} />
      <PlaceholderBox
        id="8.3"
        title="Buildings, roads, fences, water-distribution, energy infrastructure"
        status="PARTIALLY NEW — OVERPASS CAN QUERY THIS, COMPONENT IS NEW"
      />

      <Hairline />

      {/* 8.4 Land Use History */}
      <SubsectionHeader id="8.4" title="Land Use History" sources={["NEW"]} />
      <PlaceholderBox
        id="8.4"
        title="Trajectory of change, intensification, abandonment, re-naturalization"
        status="NEW — NEED HISTORICAL LAND USE DATA"
      />

      <Hairline />

      {/* 8.5 Use-Dependent Values */}
      <SubsectionHeader id="8.5" title="Use-Dependent Values" sources={["Computed"]} />
      {revDetails.length > 0 ? (
        <DataTable
          headers={["Revenue Stream", "Estimate"]}
          rows={revDetails.map((item) => [
            fmt(item.name || item.label),
            `\u20ac${(item.value || item.estimate || 0).toLocaleString()}`,
          ])}
        />
      ) : (
        <div className="grid grid-cols-3 gap-8 mb-6">
          <KPI
            value={economics.revenueScenarios?.conservative != null ? `\u20ac${economics.revenueScenarios.conservative.toLocaleString()}` : null}
            unit="/yr"
            label="Conservative"
          />
          <KPI
            value={economics.revenueScenarios?.moderate != null ? `\u20ac${economics.revenueScenarios.moderate.toLocaleString()}` : null}
            unit="/yr"
            label="Moderate"
          />
          <KPI
            value={economics.revenueScenarios?.optimized != null ? `\u20ac${economics.revenueScenarios.optimized.toLocaleString()}` : null}
            unit="/yr"
            label="Optimized"
          />
        </div>
      )}
      <PlaceholderBox
        id="8.5"
        title="Cost & margin breakdown by land-use unit"
        status="PARTIAL — REVENUES EXIST, COSTS/MARGINS ARE NEW"
      />

      <Hairline />

      {/* 8.6 Wound Index Assessment */}
      <SubsectionHeader id="8.6" title="Wound Index Assessment" sources={["NEW"]} />
      <PlaceholderBox
        id="8.6"
        title="Degradation hotspots, erosion, compaction, over-use markers"
        status="ENTIRELY NEW — NO DATA SOURCE OR COMPUTATION"
      />

      <Hairline />

      {/* 8.7 Zoning & Constraints */}
      <SubsectionHeader id="8.7" title="Zoning & Constraints" sources={["Pipeline", "AI"]} />
      {narratives?.compliance?.framework && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-6 max-w-[500px]">
          {narratives.compliance.framework}
        </p>
      )}
      {items.length > 0 ? (
        <DataTable
          headers={["Regulation", "Status", "Notes"]}
          rows={items.map((i) => [
            fmt(i.name || i.regulation),
            <RiskBadge key={i.name} level={i.status || i.level} />,
            fmt(i.description || i.notes || i.detail),
          ])}
        />
      ) : (
        <p className="text-sm text-brand-sage mb-6">No regulatory data available.</p>
      )}
      <PlaceholderBox
        id="8.7"
        title="Easements, development rights, cultural-heritage overlays"
        status="PARTIAL — REGULATORY TABLE EXISTS, EASEMENTS & DEV RIGHTS ARE NEW"
      />
    </section>
  );
}
