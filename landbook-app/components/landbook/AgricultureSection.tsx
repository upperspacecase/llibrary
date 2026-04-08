import type { Agriculture, Narratives } from "@/lib/types";
import { SectionTitle, Hairline, SwatchRow, DataTable } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function AgricultureSection({
  agriculture,
  narratives,
}: {
  agriculture: Agriculture;
  narratives?: Narratives["agriculture"];
}) {
  const systems = agriculture.systems || [];

  return (
    <section>
      <SectionTitle title="Agriculture" />

      {narratives?.potential && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.potential}
        </p>
      )}

      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-2">
          Land Cover
        </div>
        <div className="serif-title text-lg text-brand-forest">
          {fmt(agriculture.landCover)}
        </div>
      </div>

      <Hairline />

      {systems.length > 0 ? (
        <>
          <SwatchRow
            items={systems.slice(0, 4).map((s) => s.name || s.system || "")}
          />
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
        <p className="text-sm text-brand-sage">No agricultural systems data available.</p>
      )}
    </section>
  );
}
