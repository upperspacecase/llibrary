import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Odemira · Environmental Dashboard | LandLibrary",
  description:
    "Region-wide environmental dashboard for the municipality of Odemira (Southwest Alentejo, Portugal).",
};

const ODEMIRA = {
  name: "Odemira",
  subtitle: "Southwest Alentejo, Portugal",
  bbox: "37.30°N – 37.85°N · 8.95°W – 8.20°W",
  area_km2: 1720.6,
  parishes: 13,
  center: { lat: 37.5967, lng: -8.64 },
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function P({
  source,
  width = "w-20",
  note,
}: {
  source: string;
  width?: string;
  note?: string;
}) {
  return (
    <span
      className={`inline-flex flex-col gap-0.5 align-middle ${width}`}
      title={note ?? `Data source needed: ${source}`}
    >
      <span className="font-black text-rose-700 leading-none text-[13px] tracking-tight">
        DATA?
      </span>
      <span className="font-bold text-rose-700 leading-tight text-[9px] tracking-[0.05em] uppercase">
        {source}
      </span>
    </span>
  );
}

function PBlock({
  source,
  note,
  height = "h-24",
}: {
  source: string;
  note?: string;
  height?: string;
}) {
  return (
    <div
      className={`w-full ${height} bg-rose-50 border border-dashed border-rose-300 flex flex-col items-center justify-center p-3 text-center`}
      title={note ?? `Data source needed: ${source}`}
    >
      <div className="font-black text-rose-700 text-sm tracking-tight">
        DATA?
      </div>
      <div className="font-bold text-rose-700 text-[10px] tracking-[0.05em] uppercase mt-1 leading-tight">
        {source}
      </div>
      {note && (
        <div className="text-rose-700/80 text-[10px] mt-1 leading-tight max-w-[28ch]">
          {note}
        </div>
      )}
    </div>
  );
}

function Delta({ source }: { source: string }) {
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-1 bg-rose-50 border border-rose-300 font-black text-rose-700 text-[10px] tracking-tight whitespace-nowrap"
      title={`Comparator needed: ${source}`}
    >
      Δ?
    </span>
  );
}

function SectionHeader({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="material-symbols-outlined text-brand-forest"
        style={{ fontSize: 18 }}
        aria-hidden
      >
        {icon}
      </span>
      <h2 className="font-serif text-[11px] tracking-[0.2em] uppercase text-brand-charcoal/80">
        {label}
      </h2>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`bg-white border border-black/10 p-4 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && (
              <h3 className="font-serif text-[15px] text-brand-charcoal leading-tight">
                {title}
                {subtitle && (
                  <span className="font-sans text-[11px] text-brand-charcoal/50 ml-2 tracking-normal normal-case">
                    {subtitle}
                  </span>
                )}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  delta,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-black/5 last:border-b-0">
      <div className="text-[12px] text-brand-charcoal/70">{label}</div>
      <div className="flex items-center gap-2">
        <div className="text-[13px] text-brand-charcoal font-medium">
          {value}
        </div>
        {delta}
      </div>
    </div>
  );
}

export default function OdemiraRegionalDashboardPage() {
  return (
    <main className="min-h-screen bg-brand-cream text-brand-charcoal">
      {/* ─── TOP NAV ───────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-black/10">
        <div className="font-serif text-[13px] tracking-[0.25em] text-brand-charcoal">
          LANDLIBRARY
        </div>
        <div className="flex items-center gap-8 text-[12px] text-brand-charcoal/80">
          <Link href="/about" className="hover:text-brand-forest">
            About
          </Link>
          <Link href="/commons" className="hover:text-brand-forest">
            Regional Commons
          </Link>
          <button
            type="button"
            className="px-3 py-1 border border-black/15 text-[11px] tracking-wide"
          >
            EN ▾
          </button>
        </div>
      </nav>

      {/* ─── HEADER ROW ────────────────────────────────────────── */}
      <header className="px-8 pt-6 pb-4 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif text-5xl text-brand-charcoal leading-none">
            Environmental Dashboard
          </h1>
          <p className="text-[12px] text-brand-charcoal/60 mt-2 tracking-wide">
            Region intelligence · Portugal pilot ·{" "}
            <span className="text-brand-forest font-medium">
              vs Portugal national baseline
            </span>
          </p>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="bg-white border border-black/10 px-4 py-2">
            <div className="text-[9px] tracking-[0.2em] uppercase text-brand-charcoal/40">
              Region
            </div>
            <div className="font-serif text-[15px] text-brand-charcoal flex items-center gap-2 mt-0.5">
              <span
                className="material-symbols-outlined text-brand-forest"
                style={{ fontSize: 16 }}
                aria-hidden
              >
                location_on
              </span>
              {ODEMIRA.name} ({ODEMIRA.subtitle.split(",")[0]})
            </div>
            <div className="text-[10px] text-brand-charcoal/50 mt-0.5">
              {ODEMIRA.area_km2.toLocaleString()} km² · {ODEMIRA.parishes}{" "}
              parishes · {ODEMIRA.bbox}
            </div>
          </div>
          <div className="bg-white border border-black/10 px-4 py-2">
            <div className="text-[9px] tracking-[0.2em] uppercase text-brand-charcoal/40">
              Date range
            </div>
            <div className="font-serif text-[15px] text-brand-charcoal flex items-center gap-2 mt-0.5">
              <span
                className="material-symbols-outlined text-brand-forest"
                style={{ fontSize: 16 }}
                aria-hidden
              >
                calendar_month
              </span>
              <P source="Date range picker (UI state)" width="w-32" />
            </div>
            <div className="text-[10px] text-brand-charcoal/50 mt-0.5">
              default: trailing 30 days
            </div>
          </div>
          <div className="text-[11px] text-brand-charcoal/60">
            <div className="text-[9px] tracking-[0.2em] uppercase text-brand-charcoal/40 mb-1">
              vs national baseline
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5a7256]" />
                Better
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c9a14a]" />
                Similar
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b85a3a]" />
                Worse
              </span>
            </div>
            <div className="text-[9px] text-rose-700 font-bold mt-1.5 tracking-tight">
              DATA? Portugal national baseline aggregation
            </div>
          </div>
        </div>
      </header>

      {/* ─── BODY GRID ─────────────────────────────────────────── */}
      <div className="px-8 pb-12 flex flex-col gap-6">
        {/* ROW 1: WEATHER (wide) + SOIL (narrow) */}
        <div className="grid grid-cols-12 gap-6">
          {/* WEATHER */}
          <section className="col-span-12 lg:col-span-8 bg-white/40 border border-black/10 p-5">
            <SectionHeader icon="partly_cloudy_day" label="Weather" />
            <div className="grid grid-cols-12 gap-4">
              {/* Climate trajectory */}
              <Card
                className="col-span-12 md:col-span-4"
                title="Climate trajectory"
                subtitle="(50-yr archival)"
              >
                <div className="grid grid-cols-5 text-[10px] tracking-[0.1em] uppercase text-brand-charcoal/40 mb-2">
                  <div />
                  <div>1975–84</div>
                  <div>2015–24</div>
                  <div>Last 5 yr</div>
                  <div className="text-right">vs Baseline</div>
                </div>
                {[
                  {
                    label: "Mean temp (°C)",
                    icon: "thermostat",
                  },
                  {
                    label: "Precipitation (mm/yr)",
                    icon: "water_drop",
                  },
                  {
                    label: "Heat days (>30°C·yr)",
                    icon: "wb_sunny",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-5 items-center gap-2 py-2 border-b border-black/5 last:border-b-0"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-brand-charcoal/70">
                      <span
                        className="material-symbols-outlined text-brand-forest/70"
                        style={{ fontSize: 14 }}
                        aria-hidden
                      >
                        {row.icon}
                      </span>
                      {row.label}
                    </div>
                    <P source="Open-Meteo 50yr Archive" width="w-16" />
                    <P source="Open-Meteo 50yr Archive" width="w-16" />
                    <P source="Open-Meteo 50yr Archive" width="w-16" />
                    <div className="flex justify-end">
                      <Delta source="National baseline" />
                    </div>
                  </div>
                ))}
              </Card>

              {/* Monthly normals */}
              <Card
                className="col-span-12 md:col-span-4"
                title="Monthly normals"
                subtitle="(1991–2020)"
              >
                <PBlock
                  source="Open-Meteo Climate Averages"
                  note="Bars: monthly rainfall (mm) · Line: monthly mean temp (°C)"
                  height="h-40"
                />
                <div className="grid grid-cols-12 mt-1 text-[9px] text-brand-charcoal/50">
                  {MONTHS.map((m) => (
                    <div key={m} className="text-center">
                      {m}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Current forecast */}
              <Card
                className="col-span-12 md:col-span-4"
                title="Current forecast"
                subtitle="(next 5 days)"
              >
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Open-Meteo", src: "Open-Meteo Forecast" },
                    { label: "IPMA", src: "IPMA Forecast" },
                  ].map((col) => (
                    <div key={col.label} className="flex flex-col gap-2">
                      <div className="text-[10px] tracking-[0.1em] uppercase text-brand-charcoal/40 text-center">
                        {col.label}
                      </div>
                      <div className="flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-brand-charcoal/40"
                          style={{ fontSize: 32 }}
                          aria-hidden
                        >
                          cloud
                        </span>
                      </div>
                      <div className="text-center">
                        <P source={col.src} width="w-20" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-brand-charcoal/60 mt-1">
                        <div>
                          <div className="text-brand-charcoal/40">Rain</div>
                          <P source={col.src} width="w-16" />
                        </div>
                        <div>
                          <div className="text-brand-charcoal/40">Wind</div>
                          <P source={col.src} width="w-16" />
                        </div>
                        <div className="col-span-2">
                          <div className="text-brand-charcoal/40">Max / Min</div>
                          <P source={col.src} width="w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Solar potential */}
              <Card className="col-span-6 md:col-span-3" title="Solar potential">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-brand-amber"
                    style={{ fontSize: 28 }}
                    aria-hidden
                  >
                    wb_sunny
                  </span>
                  <div>
                    <P source="Open-Meteo Solar/Wind" width="w-24" />
                    <div className="text-[9px] text-brand-charcoal/50 mt-1">
                      kWh/m²/yr · vs national
                    </div>
                  </div>
                  <Delta source="National baseline" />
                </div>
              </Card>

              {/* Wind potential */}
              <Card className="col-span-6 md:col-span-3" title="Wind potential">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-brand-sage"
                    style={{ fontSize: 28 }}
                    aria-hidden
                  >
                    air
                  </span>
                  <div>
                    <P source="Open-Meteo Solar/Wind" width="w-24" />
                    <div className="text-[9px] text-brand-charcoal/50 mt-1">
                      m/s (100 m) · vs national
                    </div>
                  </div>
                  <Delta source="National baseline" />
                </div>
              </Card>

              {/* Pollen seasonality */}
              <Card
                className="col-span-12 md:col-span-6"
                title="Pollen seasonality"
                subtitle="(12-month)"
              >
                <PBlock
                  source="Pollen 12-month seasonality (NOT WIRED)"
                  note="Google Pollen returns current index only; need ECMWF CAMS pollen reanalysis or a 12-month seasonality dataset."
                  height="h-12"
                />
                <div className="grid grid-cols-12 mt-1 text-[9px] text-brand-charcoal/50">
                  {MONTHS.map((m) => (
                    <div key={m} className="text-center">
                      {m}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[9px] text-brand-charcoal/50">
                  {[
                    { c: "#cdd9b8", l: "Very low" },
                    { c: "#9eb380", l: "Low" },
                    { c: "#c9a14a", l: "Moderate" },
                    { c: "#b85a3a", l: "High" },
                    { c: "#8a3d27", l: "Very high" },
                  ].map((s) => (
                    <span key={s.l} className="flex items-center gap-1">
                      <span
                        className="w-2 h-2"
                        style={{ background: s.c }}
                      />
                      {s.l}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* SOIL */}
          <section className="col-span-12 lg:col-span-4 bg-white/40 border border-black/10 p-5">
            <SectionHeader icon="grass" label="Soil" />
            <div className="flex flex-col gap-4">
              <Card title="Soil summary" subtitle="(0–30 cm)">
                <div className="flex flex-col">
                  <StatRow
                    label="pH (H₂O)"
                    value={<P source="SoilGrids Properties" width="w-16" />}
                    delta={<Delta source="National baseline" />}
                  />
                  <StatRow
                    label="Organic carbon"
                    value={<P source="SoilGrids Properties" width="w-16" />}
                    delta={<Delta source="National baseline" />}
                  />
                  <StatRow
                    label="WRB texture class"
                    value={<P source="SoilGrids Classification" width="w-24" />}
                    delta={<Delta source="National baseline" />}
                  />
                  <StatRow
                    label="Bulk density"
                    value={<P source="SoilGrids Properties" width="w-16" />}
                    delta={<Delta source="National baseline" />}
                  />
                  <StatRow
                    label="Depth to bedrock"
                    value={<P source="SoilGrids Properties" width="w-20" />}
                    delta={<Delta source="National baseline" />}
                  />
                </div>
              </Card>

              <Card title="Geology" subtitle="(Macrostrat)">
                <div className="text-[12px] text-brand-charcoal/70">
                  <P
                    source="Macrostrat Geology"
                    width="w-full"
                    note="Lithology + age, e.g. 'Granite (biotite) — Late Carboniferous (305–299 Ma)'"
                  />
                </div>
              </Card>

              <Card title="Erosion risk" subtitle="(RUSLE-INE)">
                <PBlock
                  source="RUSLE-INE erosion (NOT WIRED)"
                  note="Not in pipeline. Need INE Portugal soil-erosion raster (CN1 erosividade / RUSLE-PT) or PNRA dataset."
                  height="h-14"
                />
                <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Very high</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <span className="text-[10px] text-brand-charcoal/50">
                    vs national
                  </span>
                  <Delta source="National baseline" />
                </div>
              </Card>
            </div>
          </section>
        </div>

        {/* ROW 2: WATER (~half) + BIODIVERSITY (~half) */}
        <div className="grid grid-cols-12 gap-6">
          {/* WATER */}
          <section className="col-span-12 lg:col-span-6 bg-white/40 border border-black/10 p-5">
            <SectionHeader icon="water_drop" label="Water" />
            <div className="grid grid-cols-12 gap-4">
              {/* Hydrology map */}
              <Card
                className="col-span-12 md:col-span-5"
                title="Hydrology"
                subtitle="(context)"
              >
                <PBlock
                  source="Mapbox Static + Overpass Water Features"
                  note="Static satellite/topo basemap clipped to Odemira bbox + OSM water polygons (Mira river, Santa Clara dam, Foupana)."
                  height="h-44"
                />
                <div className="mt-2 flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-charcoal/50">
                      Largest stream
                    </span>
                    <P source="Overpass Water Features" width="w-24" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-charcoal/50">
                      Largest reservoir
                    </span>
                    <P source="Overpass Water Features" width="w-28" />
                  </div>
                </div>
              </Card>

              <div className="col-span-12 md:col-span-7 flex flex-col gap-4">
                {/* Water balance */}
                <Card
                  title="Water balance"
                  subtitle="(10-yr archival) P − ET₀ (mm)"
                  action={<Delta source="National baseline" />}
                >
                  <PBlock
                    source="Open-Meteo 50yr Archive (P) + ERA-Land (ET₀) — ET₀ NOT WIRED"
                    note="Precipitation series available from Open-Meteo. ET₀ requires ERA5-Land or Hargreaves derivation — not currently in pipeline."
                    height="h-40"
                  />
                  <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
                    <span>1975</span>
                    <span>1985</span>
                    <span>1995</span>
                    <span>2005</span>
                    <span>2015</span>
                    <span>2025</span>
                  </div>
                </Card>

                {/* GloFAS + Groundwater pair */}
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    title="GloFAS"
                    subtitle="(stream basin) discharge anomaly"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-brand-sage"
                        style={{ fontSize: 24 }}
                        aria-hidden
                      >
                        waves
                      </span>
                      <P source="GloFAS Flood Forecast" width="w-24" />
                    </div>
                    <div className="text-[10px] text-brand-charcoal/50 mt-2 leading-tight">
                      this week · vs 50-yr return-period reference
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Delta source="GloFAS climatology" />
                    </div>
                  </Card>

                  <Card title="Groundwater" subtitle="(DWR / SNIRH)">
                    <PBlock
                      source="SNIRH (NOT WIRED)"
                      note="Portuguese groundwater network not in pipeline. Need SNIRH API or scraped piezometer stations within Odemira (e.g. 590/22 — Évora)."
                      height="h-24"
                    />
                  </Card>
                </div>
              </div>

              {/* SPI-12 ribbon */}
              <Card
                className="col-span-12"
                title="SPI-12"
                subtitle="(drought index, 1925–today)"
              >
                <PBlock
                  source="SPI-12 1925–today — partial wiring"
                  note="Open-Meteo 50yr archive only covers 1975+. Pre-1975 series needs KNMI Climate Explorer or NOAA GHCN-monthly for Beja/Sines stations."
                  height="h-8"
                />
                <div className="flex items-center gap-4 mt-2 text-[9px] text-brand-charcoal/50 flex-wrap">
                  {[
                    { c: "#3d6b48", l: "Extremely wet" },
                    { c: "#7a9a6e", l: "Severely wet" },
                    { c: "#d6c89c", l: "Moderate drought" },
                    { c: "#b85a3a", l: "Severe drought" },
                    { c: "#7a2a14", l: "Extreme drought" },
                  ].map((s) => (
                    <span key={s.l} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5" style={{ background: s.c }} />
                      {s.l}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
                  {["1925", "1945", "1965", "1985", "2005", "2025"].map((y) => (
                    <span key={y}>{y}</span>
                  ))}
                </div>
              </Card>
            </div>
          </section>

          {/* BIODIVERSITY */}
          <section className="col-span-12 lg:col-span-6 bg-white/40 border border-black/10 p-5">
            <SectionHeader icon="eco" label="Biodiversity" />
            <div className="grid grid-cols-12 gap-4">
              {/* Top species */}
              <Card
                className="col-span-12 md:col-span-7"
                title="Top species"
                subtitle="(by observations)"
              >
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <PBlock
                        source="iNaturalist photo CDN"
                        height="h-20"
                      />
                      <div className="text-[10px] text-brand-charcoal leading-tight">
                        <P
                          source="iNaturalist Species"
                          width="w-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3 text-[9px] text-brand-charcoal/60 flex-wrap">
                  {[
                    { c: "#5a7256", l: "LC", t: "Least Concern" },
                    { c: "#7a9a6e", l: "NT", t: "Near Threatened" },
                    { c: "#c9a14a", l: "VU", t: "Vulnerable" },
                    { c: "#b85a3a", l: "EN", t: "Endangered" },
                    { c: "#7a2a14", l: "CR", t: "Critically Endangered" },
                  ].map((b) => (
                    <span key={b.l} className="flex items-center gap-1.5">
                      <span
                        className="text-white text-[9px] px-1.5 py-0.5 font-bold tracking-wide"
                        style={{ background: b.c }}
                      >
                        {b.l}
                      </span>
                      <span>{b.t}</span>
                    </span>
                  ))}
                </div>
              </Card>

              {/* Species observations trend */}
              <Card
                className="col-span-12 md:col-span-5"
                title="Species observations"
                subtitle="(13 trend windows)"
                action={<Delta source="National baseline" />}
              >
                <PBlock
                  source="iNaturalist trend windows — partial wiring"
                  note="Pipeline has 3 windows (1975–1994, 1995–2014, 2015–2025). 13 windows requested — need to extend the iNat window job to ~5-year rolls from 1970."
                  height="h-40"
                />
                <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
                  {["1970", "1985", "2000", "2015", "2025"].map((y) => (
                    <span key={y}>{y}</span>
                  ))}
                </div>
              </Card>

              {/* Total species */}
              <Card
                className="col-span-6 md:col-span-5"
                title="Total species"
              >
                <div className="flex items-end gap-3">
                  <P source="iNaturalist Species" width="w-20" />
                  <Delta source="Parish baseline" />
                </div>
                <div className="text-[10px] text-brand-charcoal/50 mt-1">
                  unique taxa observed · vs Odemira parish baseline
                </div>
                <div className="mt-2">
                  <PBlock
                    source="Decorative species illustration (static asset)"
                    height="h-16"
                    note="Decorative — no data."
                  />
                </div>
              </Card>

              {/* Habitat */}
              <Card
                className="col-span-6 md:col-span-7"
                title="Habitat"
                subtitle="(ESA WorldCover 2021)"
              >
                <PBlock
                  source="ESA WorldCover area aggregation — needs aggregator"
                  note="WorldCover WMS gives map tiles only. Need a pixel-area aggregator (zonal stats over Odemira bbox) to produce class % breakdown."
                  height="h-32"
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-brand-charcoal/60 mt-2">
                  {[
                    "Mosaic cropland",
                    "Forests",
                    "Shrubland",
                    "Grassland",
                    "Other",
                  ].map((c) => (
                    <div key={c} className="flex items-center justify-between">
                      <span>{c}</span>
                      <P
                        source="ESA WorldCover (aggregated)"
                        width="w-16"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </div>

        {/* ─── DATA GAPS LEDGER ────────────────────────────────── */}
        <section className="bg-white border border-black/10 p-5">
          <h2 className="font-serif text-lg text-brand-charcoal mb-1">
            Data gap ledger
          </h2>
          <p className="text-[12px] text-brand-charcoal/60 mb-4">
            Every cell flagged{" "}
            <span className="font-black text-rose-700">DATA?</span> above
            corresponds to a row below. Sources marked “wired @ point” exist in
            the pipeline but do not yet have a region-aggregate endpoint for
            Odemira.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[12px]">
            {[
              {
                k: "Regional 8-pt Baseline → Portugal national baseline",
                v: "Wired @ point only. Need national aggregation across Portugal grid.",
              },
              {
                k: "Open-Meteo 50yr Archive (climate trajectory)",
                v: "Wired @ point. Need /api/regional/odemira/climate-trajectory.",
              },
              {
                k: "Open-Meteo Climate Averages (monthly normals)",
                v: "Wired @ point. Need /api/regional/odemira/monthly-normals.",
              },
              {
                k: "Open-Meteo Forecast (next 5 days)",
                v: "Wired @ point. Need region-mean forecast over Odemira sample grid.",
              },
              {
                k: "IPMA Forecast",
                v: "Wired @ point (PT only). Region-mean over Odemira parishes needed.",
              },
              {
                k: "Open-Meteo Solar/Wind",
                v: "Wired @ point. Region-mean over Odemira grid.",
              },
              {
                k: "Pollen 12-month seasonality",
                v: "NOT WIRED. Google Pollen API returns current index only. Need ECMWF CAMS pollen reanalysis or equivalent.",
              },
              {
                k: "SoilGrids Properties (pH, OC, BD, depth)",
                v: "Wired @ point. Need zonal stats over Odemira bbox.",
              },
              {
                k: "SoilGrids Classification (WRB texture)",
                v: "Wired @ point. Need dominant class over Odemira bbox.",
              },
              {
                k: "Macrostrat Geology",
                v: "Wired @ point. Need dominant lithology over Odemira bbox.",
              },
              {
                k: "RUSLE-INE erosion risk",
                v: "NOT WIRED. Need INE Portugal soil-erosion raster (RUSLE-PT) or PNRA dataset.",
              },
              {
                k: "Mapbox Static + Overpass Water Features (hydrology map)",
                v: "Wired @ point. Need bbox-clipped static map for Odemira.",
              },
              {
                k: "Water balance P − ET₀ (10-yr)",
                v: "Partial. Precipitation in Open-Meteo 50yr. ET₀ requires ERA5-Land or Hargreaves derivation — NOT WIRED.",
              },
              {
                k: "GloFAS Flood Forecast (discharge anomaly)",
                v: "Wired @ point. Need basin-mean over Mira/Foupana/Sado.",
              },
              {
                k: "Groundwater (SNIRH)",
                v: "NOT WIRED. Portuguese SNIRH piezometer network not in pipeline.",
              },
              {
                k: "SPI-12 (1925–today)",
                v: "Partial. Open-Meteo 50yr covers 1975+. Pre-1975 needs KNMI Climate Explorer or NOAA GHCN-monthly for Beja / Sines.",
              },
              {
                k: "iNaturalist Species (top species + total)",
                v: "Wired @ point. Need bbox aggregation across Odemira.",
              },
              {
                k: "iNaturalist Threatened (IUCN badges)",
                v: "Wired @ point. Bbox aggregation across Odemira.",
              },
              {
                k: "iNaturalist trend windows (13 windows)",
                v: "Partial. Pipeline has 3 windows. Extend iNat window job to ~5-year rolls from 1970 → 13 windows.",
              },
              {
                k: "ESA WorldCover habitat composition",
                v: "Partial. WMS gives tiles. Need pixel-area aggregator (zonal stats) over Odemira bbox.",
              },
              {
                k: "NASA FIRMS Historical",
                v: "Failing (HTTP 400). Not used in current mockup but needs rotating/repaired endpoint before historical fire trend can be added.",
              },
            ].map((row) => (
              <div
                key={row.k}
                className="flex flex-col gap-0.5 py-1.5 border-b border-black/5"
              >
                <span className="font-bold text-rose-700 text-[11px] tracking-tight">
                  {row.k}
                </span>
                <span className="text-brand-charcoal/70">{row.v}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-[11px] text-brand-charcoal/50 pt-2">
          Region: Odemira ({ODEMIRA.area_km2.toLocaleString()} km²,{" "}
          {ODEMIRA.parishes} parishes, centroid {ODEMIRA.center.lat.toFixed(2)}°N{" "}
          {Math.abs(ODEMIRA.center.lng).toFixed(2)}°W). Static metadata only —
          all dynamic values require the regional aggregation layer noted in the
          gap ledger above.
        </footer>
      </div>
    </main>
  );
}
