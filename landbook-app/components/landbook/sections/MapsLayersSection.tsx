import type { Maps, Property } from "@/lib/types";
import { SectionTitle } from "@/components/river";

const TECHNICAL_MAPS = [
  {
    title: "Satellite",
    subtitle: "RGB Composite / 0.5m Res",
    src: "/sample-maps/photo_2026-04-10_16-41-16.jpg",
    filter: "opacity-90 saturate-[0.6] hue-rotate-[60deg]",
  },
  {
    title: "Topography",
    subtitle: "1m Contours / Hypsometric",
    src: "/sample-maps/photo_2026-04-10_16-41-12.jpg",
    filter: "opacity-90 sepia-[0.3] saturate-[0.5]",
  },
  {
    title: "Soil",
    subtitle: "Geological Profile / PH Levels",
    src: "/sample-maps/photo_2026-04-10_16-40-51.jpg",
    filter: "opacity-90 sepia-[0.5] saturate-[0.7] hue-rotate-[-30deg]",
  },
  {
    title: "Aspect",
    subtitle: "Solar Incidence / Slope Orientation",
    src: "/sample-maps/photo_2026-04-10_11-35-55.jpg",
    filter: "opacity-90 sepia-[0.4] saturate-[0.8] hue-rotate-[15deg]",
  },
  {
    title: "Fire Risk",
    subtitle: "Fuel Density / Historical Data",
    src: "/sample-maps/photo_2026-04-10_16-41-01.jpg",
    filter: "opacity-90 sepia-[0.2] saturate-[0.6] hue-rotate-[-15deg] brightness-90",
  },
  {
    title: "Biodiversity",
    subtitle: "Species Density / Habitat Quality",
    src: "/sample-maps/photo_2026-04-10_16-41-04.jpg",
    filter: "opacity-90 saturate-[0.5] hue-rotate-[80deg]",
  },
  {
    title: "Watershed",
    subtitle: "Drainage Basins / Water Flow",
    src: "/sample-maps/photo_2026-04-10_16-41-08.jpg",
    filter: "opacity-90 saturate-[0.6] hue-rotate-[180deg]",
  },
  {
    title: "Connectivity",
    subtitle: "Corridor Analysis / Fragment Linkage",
    src: "/sample-maps/photo_2026-04-10_16-40-56.jpg",
    filter: "opacity-90 saturate-[0.4] hue-rotate-[40deg]",
  },
  {
    title: "Ecological Heritage",
    subtitle: "Historical Biomes / Ancient Flora Registry",
    src: "/sample-maps/photo_2026-04-10_11-21-54.jpg",
    filter: "opacity-90 saturate-[0.5] hue-rotate-[100deg]",
  },
];

interface MapsLayersSectionProps {
  maps: Maps;
  property: Property;
  narratives?: { intro?: string; callout?: string };
}

export function MapsLayersSection({ maps, property, narratives }: MapsLayersSectionProps) {
  return (
    <section id="maps-layers">
      <SectionTitle title="Maps & Layers" />

      {/* ── Zone A: Hero Map ──────────────────────────────────── */}
      <div className="relative w-full h-[600px] bg-white border border-outline-variant/20 overflow-hidden mb-16">
        {/* Background — same satellite image as Overview hero */}
        <div className="absolute inset-0 opacity-40">
          {maps.overview ? (
            <img
              className="w-full h-full object-cover filter saturate-[0.85]"
              src={maps.overview}
              alt={`${property.name} outdoors overview`}
            />
          ) : (
            <div className="w-full h-full bg-brand-sage/10" />
          )}
        </div>

        {/* Distance ring overlays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[200px] h-[200px] border border-brand-forest/20 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-brand-forest/40 font-bold uppercase tracking-widest -mt-44 font-body">
              5KM
            </span>
          </div>
          <div className="absolute w-[400px] h-[400px] border border-brand-forest/10 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-brand-forest/30 font-bold uppercase tracking-widest -mt-[380px] font-body">
              10KM
            </span>
          </div>
          <div className="absolute w-[600px] h-[600px] border border-brand-forest/5 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-brand-forest/20 font-bold uppercase tracking-widest -mt-[580px] font-body">
              15KM
            </span>
          </div>
        </div>

        {/* Property marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-brand-forest rotate-45" />
          <div className="absolute top-6 left-6 whitespace-nowrap bg-brand-forest text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-body">
            {property.name}
          </div>
        </div>

        {/* Decorative zoom / layer controls */}
        <div className="absolute top-6 right-6 flex flex-col gap-2">
          <div className="bg-white/90 p-2 shadow-sm flex flex-col gap-2 border border-outline-variant/30">
            <span className="material-symbols-outlined text-slate-700 text-lg">add</span>
            <div className="h-[0.5px] w-full bg-slate-200" />
            <span className="material-symbols-outlined text-slate-700 text-lg">remove</span>
          </div>
          <div className="bg-white/90 p-2 shadow-sm border border-outline-variant/30">
            <span className="material-symbols-outlined text-slate-700 text-lg">layers</span>
          </div>
        </div>

        {/* Spatial legend */}
        <div className="absolute bottom-6 left-6 bg-white/90 p-4 border border-outline-variant/30 max-w-xs">
          <h5 className="text-[10px] font-bold uppercase tracking-widest text-brand-forest mb-2 font-body">
            Spatial Legend
          </h5>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-brand-forest/20 border border-brand-forest" />
              <span className="text-[9px] text-slate-600 uppercase font-medium font-body">
                Core Protection Area
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 bg-brand-forest" />
              <span className="text-[9px] text-slate-600 uppercase font-medium font-body">
                Regional Linkage Corridor
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-800" />
              <span className="text-[9px] text-slate-600 uppercase font-medium font-body">
                Strategic Infrastructure Node
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone B: Spatial Context ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 gap-5 mb-20">
        <div className="md:col-span-4">
          <h3 className="text-brand-forest font-serif text-3xl mb-4 leading-tight">
            Spatial<br />Context
          </h3>
          <div className="h-1 w-12 bg-brand-forest mb-6" />
          <p className="text-brand-sage text-[10px] font-bold uppercase tracking-widest font-body">
            {property.municipality ?? "Regional corridor"}
          </p>
        </div>
        <div className="md:col-span-8">
          <div className="space-y-6">
            {narratives?.intro ? (
              <p className="text-[14px] leading-relaxed text-on-surface font-body text-justify">
                {narratives.intro}
              </p>
            ) : (
              <p className="text-brand-sage/30 text-sm italic font-body">
                Spatial context will appear here once narratives are generated.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Zone C: 3×3 Technical Map Grid ────────────────────── */}
      <div className="mb-8">
        <h3 className="font-serif text-3xl text-brand-forest leading-tight mb-3">
          Available Layers
        </h3>
        <div className="h-1 w-12 bg-brand-forest mb-5" />
        <p className="text-[14px] leading-relaxed text-on-surface font-body max-w-[640px]">
          The following maps and layers are available and can enhance the insights of
          your landbook. Please submit what maps you already have access to and consider
          hiring 3rd party providers to map your land.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
        {TECHNICAL_MAPS.map((map) => (
          <div key={map.title} className="group flex flex-col">
            <div className="aspect-square bg-slate-100 mb-4 overflow-hidden">
              <img
                className={`w-full h-full object-cover group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 ${map.filter}`}
                src={map.src}
                alt={map.title}
              />
            </div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-forest font-body">
              {map.title}
            </h4>
            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tight font-body">
              {map.subtitle}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
