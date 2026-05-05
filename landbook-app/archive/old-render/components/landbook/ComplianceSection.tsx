import type { Compliance, Narratives } from "@/lib/types";
import { SectionTitle, Hairline, DataTable, RiskBadge } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function ComplianceSection({
  compliance,
  narratives,
}: {
  compliance: Compliance;
  narratives?: Narratives["compliance"];
}) {
  const items = compliance.items || [];
  const timeline = compliance.timeline || [];

  return (
    <section id="compliance">
      <SectionTitle title="Compliance" />

      {narratives?.framework && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.framework}
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
        <p className="text-sm text-brand-sage mb-6">No compliance data available.</p>
      )}

      {timeline.length > 0 && (
        <>
          <Hairline />
          <DataTable
            headers={["Year", "Event"]}
            rows={timeline.map((t) => [
              String(t.deadline || t.year || t.date || ""),
              (t.action || t.event || t.description || "") as string,
            ])}
          />
        </>
      )}
    </section>
  );
}
