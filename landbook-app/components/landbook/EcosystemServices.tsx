import type { Economics, Narratives } from "@/lib/types";
import { SectionTitle, HeroFigure, StackedBar, Hairline, DataTable, PullQuote } from "@/components/river";

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function EcosystemServices({
  economics,
  narratives,
}: {
  economics: Economics;
  narratives?: Narratives["ecosystemServices"];
}) {
  const es = economics.ecosystemServices || {} as Record<string, number>;
  const services = [
    { name: "Water", value: es.water || 0 },
    { name: "Food", value: es.food || 0 },
    { name: "Carbon", value: es.carbon || 0 },
    { name: "Regulation", value: es.regulation || 0 },
    { name: "Soil", value: es.soil || 0 },
    { name: "Cultural", value: es.cultural || 0 },
  ];
  const total = es.total || services.reduce((a, s) => a + s.value, 0);

  return (
    <section>
      <SectionTitle title="What This Land Provides" />

      {narratives?.intro && (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      )}

      <HeroFigure
        value={`\u20ac${fmt(economics.npv.thirtyYear?.toLocaleString())}`}
        label="Thirty-Year NPV"
      />

      <Hairline />

      <StackedBar
        segments={services.filter((s) => s.value > 0)}
        totalLabel={`\u20ac${total.toLocaleString()}`}
        label="Valuation Composition"
      />

      <Hairline />

      <DataTable
        headers={["Service", "Annual Value", "% of Total"]}
        rows={services.map((s) => [
          s.name,
          `\u20ac${s.value.toLocaleString()}`,
          total > 0 ? `${((s.value / total) * 100).toFixed(1)}%` : "0%",
        ])}
      />

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
