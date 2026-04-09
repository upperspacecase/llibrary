import type { Property, Maps, Scores, Meta } from "@/lib/types";

function formatCoord(dec: number, isLat: boolean): string {
  const abs = Math.abs(dec);
  const dir = isLat ? (dec >= 0 ? "N" : "S") : (dec >= 0 ? "E" : "W");
  return `${abs.toFixed(4)}\u00b0${dir}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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
      ? `${formatCoord(coords.lat, true)}, ${formatCoord(coords.lng, false)}`
      : "";

  return (
    <div className="relative flex flex-col items-center justify-between px-12 pt-16 pb-10 bg-brand-cream overflow-hidden text-center" style={{ aspectRatio: "3 / 4" }}>
      <img
        src="/topo-bg.jpg"
        className="absolute inset-0 w-full h-full object-cover opacity-40"
        alt=""
      />

      {/* Top — LandBook logo */}
      <div className="relative z-10 pt-4 flex flex-col items-center">
        <img src="/landbook-logo.png" alt="LandBook" className="h-7 mb-2" />
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

      {/* Bottom — LandLibrary logo, meta & disclaimer */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <img src="/landlibrary-logo.png" alt="LandLibrary" className="h-4 mb-3" />
        <p className="text-[11px] text-brand-sage mb-6">
          Date: {formatDate(meta.generatedAt)} | Version: {meta.version ?? "\u2014"}
        </p>
        <div className="border-t border-brand-sage/30 pt-3 mx-auto max-w-[400px]">
          <p className="text-[10px] font-bold text-brand-charcoal mb-1">Disclaimer</p>
          <p className="text-[9px] text-brand-sage leading-snug">
            This assessment represents conditions at time of documentation.
            Land characteristics evolve; verify critical details before decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
