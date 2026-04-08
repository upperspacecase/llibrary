import type { Property, Maps, Scores, Meta } from "@/lib/types";

function toDMS(dec: number, isLat: boolean): string {
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = isLat ? (dec >= 0 ? "N" : "S") : (dec >= 0 ? "E" : "W");
  return `${deg}\u00b0 ${min}' ${sec}" ${dir}`;
}

export function CoverSection({
  property,
  maps,
  scores,
  meta,
}: {
  property: Property;
  maps: Maps;
  scores: Scores;
  meta: Meta;
}) {
  const coords = property.coords;
  const coordStr =
    coords?.lat != null && coords?.lng != null
      ? `${toDMS(coords.lat, true)}, ${toDMS(coords.lng, false)}`
      : "";

  return (
    <div className="relative min-h-[600px] flex flex-col justify-between px-12 pt-16 pb-12 bg-brand-forest text-brand-cream overflow-hidden">
      {maps.satellite && (
        <img
          src={maps.satellite}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          alt=""
        />
      )}
      <div className="relative z-10">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-1">
          LANDBOOK
        </div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          Natural Capital Assessment
        </div>
      </div>
      <div className="relative z-10">
        <div className="serif-title text-5xl text-brand-cream mb-2">
          {property.name}
        </div>
        <div className="text-sm opacity-70 mb-6">{property.address}</div>
        <div className="flex gap-8 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
          <span>{property.area ? property.area.toFixed(1) + " ha" : "\u2014"}</span>
          <span>NCS {scores.naturalCapital ?? "\u2014"}/100</span>
          <span>{coordStr}</span>
        </div>
      </div>
      <div className="relative z-10 text-[10px] opacity-50 text-right">
        {meta.generatedAt ?? "\u2014"} &middot; {meta.version ?? "\u2014"}
      </div>
    </div>
  );
}
