import type { Maps } from "@/lib/types";
import { SectionTitle } from "@/components/river";

const MAP_ENTRIES = [
  { key: "satellite" as const, title: "Satellite View" },
  { key: "overview" as const, title: "Overview" },
  { key: "regional" as const, title: "Regional Context" },
  { key: "detail" as const, title: "Property Detail" },
];

export function MapPortfolio({ maps }: { maps: Maps }) {
  return (
    <section id="map-portfolio">
      <SectionTitle title="Map Portfolio" />
      <div className="grid grid-cols-2 gap-4">
        {MAP_ENTRIES.map((e) => {
          const src = maps[e.key];
          return (
            <div key={e.key} className="border-[0.5px] border-brand-sage/30 overflow-hidden">
              <div className="h-48 bg-brand-sage/10">
                {src ? (
                  <img src={src} alt={e.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-sage text-sm">
                    Not available
                  </div>
                )}
              </div>
              <div className="px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
                  {e.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
