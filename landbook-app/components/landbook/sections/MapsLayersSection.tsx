import type { Maps } from "@/lib/types";
import { SectionTitle, SubsectionHeader, PlaceholderBox, Hairline } from "@/components/river";

function MapCard({ title, src }: { title: string; src: string | null }) {
  return (
    <div className="border-[0.5px] border-brand-sage/30 overflow-hidden">
      <div className="h-48 bg-brand-sage/10">
        {src ? (
          <img src={src} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-sage text-sm">
            Not available
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-sage">
          {title}
        </span>
      </div>
    </div>
  );
}

export function MapsLayersSection({ maps }: { maps: Maps }) {
  return (
    <section id="maps-layers">
      <SectionTitle title="Maps & Layers" />

      {/* 3.1 Location Overview */}
      <SubsectionHeader id="3.1" title="Location Overview" sources={["Pipeline"]} />
      <MapCard title="Portugal National Context" src={maps.overview} />

      <Hairline />

      {/* 3.2 Bioregion Context */}
      <SubsectionHeader id="3.2" title="Bioregion Context" sources={["Pipeline"]} />
      <MapCard title="Regional Detail" src={maps.regional} />

      <Hairline />

      {/* 3.3 Watershed Context — COMMENTED OUT: needs new map layer
      <SubsectionHeader id="3.3" title="Watershed Context" sources={["NEW"]} />
      <PlaceholderBox
        id="3.3"
        title="Mira River basin, drainage divides, flow paths"
        status="NEW MAP LAYER"
      />
      <Hairline />
      */}

      {/* 3.4 Property Detail */}
      <SubsectionHeader id="3.4" title="Property Detail (1:5,000)" sources={["Pipeline"]} />
      <MapCard title="Property Detail" src={maps.detail} />

      <Hairline />

      {/* 3.5 Topography & Hydrology — BUILD: terrain data exists, map viz pending */}
      <SubsectionHeader id="3.5" title="Topography & Hydrology" sources={["Pipeline"]} />
      <p className="text-sm text-brand-sage mb-8">
        Terrain data (elevation, slope, aspect) available from pipeline. Map visualization pending Mapbox layer integration.
      </p>

      <Hairline />

      {/* 3.6 Solar Potential Analysis — COMMENTED OUT: needs map visualization
      <SubsectionHeader id="3.6" title="Solar Potential Analysis" sources={["NEW"]} />
      <PlaceholderBox
        id="3.6"
        title="Irradiance, optimal placement zones"
        status="NEW MAP LAYER — SOLAR DATA PARTIAL IN PIPELINE"
      />
      <Hairline />
      */}

      {/* 3.7 Accessibility & Services — COMMENTED OUT: needs routing/isochrone API
      <SubsectionHeader id="3.7" title="Accessibility & Services" sources={["NEW"]} />
      <PlaceholderBox
        id="3.7"
        title="15-minute radius network (roads, suppliers, markets)"
        status="NEW MAP LAYER — TIED TO SECTION 2.1"
      />
      <Hairline />
      */}

      {/* 3.8 Land Cover Change Detection — COMMENTED OUT: needs satellite time-series
      <SubsectionHeader id="3.8" title="Land Cover Change Detection (2000-2024)" sources={["NEW"]} />
      <PlaceholderBox
        id="3.8"
        title="Before/after satellite comparison"
        status="NEW — NEED SATELLITE TIME-SERIES COMPARISON IMAGERY"
      />
      */}

      <Hairline />

      {/* 3.10 Layer Control — COMMENTED OUT: complex interactive UI feature
      <SubsectionHeader id="3.10" title="Layer Control" sources={["NEW"]} />
      <PlaceholderBox
        id="3.10"
        title="Toggle: ecology, risk, value, land use, infrastructure"
        status="NEW INTERACTIVE UI ELEMENT"
      />
      */}

      {/* Existing 4-map grid as reference */}
      <Hairline />
      <div className="text-[10px] uppercase tracking-widest text-brand-sage mb-3 mt-6">
        Current Map Portfolio
      </div>
      <div className="grid grid-cols-2 gap-4">
        <MapCard title="Satellite View" src={maps.satellite} />
        <MapCard title="Overview" src={maps.overview} />
        <MapCard title="Regional Context" src={maps.regional} />
        <MapCard title="Property Detail" src={maps.detail} />
      </div>
    </section>
  );
}
