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
    <div className="relative min-h-[700px] flex flex-col items-center justify-between px-12 pt-16 pb-10 bg-brand-cream overflow-hidden text-center">
      <img
        src="/topo-bg.jpg"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        alt=""
      />

      {/* Top — Branding */}
      <div className="relative z-10 pt-4">
        <h1 className="text-2xl tracking-[0.2em] text-brand-charcoal mb-1">
          <span className="font-light">LAND</span><span className="font-bold italic">BOOK</span>
        </h1>
        <p className="text-sm italic text-brand-sage">Notes from the field.</p>
      </div>

      {/* Center — Property */}
      <div className="relative z-10">
        <h2 className="serif-title text-4xl text-brand-charcoal mb-4">
          {property.name}
        </h2>
        <p className="text-base text-brand-charcoal/70 leading-relaxed">
          {property.address}
        </p>
        {coordStr && (
          <p className="text-xs tracking-widest text-brand-sage mt-3 font-mono">
            {coordStr}
          </p>
        )}
      </div>

      {/* Bottom — Meta & Disclaimer */}
      <div className="relative z-10 w-full">
        <div className="text-xs font-bold tracking-[0.25em] text-brand-charcoal mb-2">
          LANDLIBRARY
        </div>
        <p className="text-[11px] text-brand-sage mb-6">
          Date: {meta.generatedAt ?? "\u2014"} | Version: {meta.version ?? "\u2014"}
        </p>
        <div className="border-t border-brand-sage/30 pt-3 mx-auto max-w-[400px]">
          <p className="text-[10px] font-bold text-brand-terracotta mb-1">Disclaimer</p>
          <p className="text-[9px] text-brand-sage leading-snug">
            This assessment represents conditions at time of documentation.
            Land characteristics evolve; verify critical details before decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
