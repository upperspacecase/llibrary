import type { Property, Scores, Economics, Water, FireData, RiskData, Energy, Maps, Meta, Narratives, ReportData } from "@/lib/types";
import { Hairline } from "@/components/river";

/**
 * Classify every data field in the report as Verified / Computed / Unverified.
 *
 * - Verified:   field's source API succeeded (apiStatus[key] === 'ok')
 * - Computed:   derived from verified API data via algorithms (scores, economics, actions, etc.)
 * - Unverified: field's source API failed, so data is missing or fallback
 *
 * The mapping below traces each ReportData section back to its pipeline source(s).
 * This is NOT hardcoded counts — it walks the real apiStatus to classify.
 */
function classifyDataSources(meta: Meta, data: Pick<ReportData, "narratives">) {
  const s = meta.apiStatus || {};
  const ok = (key: string) => s[key] === "ok";

  // Each report section → which apiStatus keys feed it, and how many fields it contributes
  const apiSections: Array<{ label: string; apis: string[]; fields: number }> = [
    { label: "Property",       apis: ["admin", "nominatim"],                    fields: 7 },
    { label: "Climate",        apis: ["climate", "forecast", "ipmaForecast"],   fields: 12 },
    { label: "Terrain",        apis: ["elevation", "terrainProfile"],           fields: 5 },
    { label: "Soil",           apis: ["soilProps", "soilClass"],                fields: 9 },
    { label: "Geology",        apis: ["geology"],                               fields: 4 },
    { label: "Water",          apis: ["water", "flood"],                        fields: 7 },
    { label: "Species",        apis: ["species", "threatened", "gbif"],         fields: 7 },
    { label: "Fire",           apis: ["activeFires", "historicalFires", "riskScores"], fields: 5 },
    { label: "Flood & Drought",apis: ["riskScores"],                            fields: 4 },
    { label: "Energy",         apis: ["solarWind"],                             fields: 5 },
    { label: "Land Cover",     apis: ["landCover"],                             fields: 2 },
    { label: "Regional",       apis: ["protectedAreas", "regionalBaseline"],    fields: 3 },
    { label: "Maps",           apis: ["mapbox"],                                fields: 4 },
    { label: "Pollen",         apis: ["pollen"],                                fields: 1 },
  ];

  // Computed sections — derived algorithmically from API data, not direct API fields
  const computedFields = [
    { label: "Scores & Natural Capital", fields: 8 },
    { label: "Ecosystem Services",       fields: 7 },
    { label: "Economics & NPV",          fields: 8 },
    { label: "Revenue Scenarios",        fields: 4 },
    { label: "Carbon Stock & Credits",   fields: 5 },
    { label: "Risk Profile",             fields: 3 },
    { label: "Trends",                   fields: 4 },
    { label: "Compliance",               fields: 2 },
    { label: "Actions",                  fields: 3 },
  ];

  // Count narratives that actually have content (AI-generated)
  const n = data.narratives || {};
  const narrativeKeys = Object.keys(n) as Array<keyof typeof n>;
  const aiFields = narrativeKeys.filter(k => {
    const val = n[k];
    return val && typeof val === "object" && Object.values(val).some(v => v);
  }).length;

  let verified = 0;
  let unverified = 0;

  for (const section of apiSections) {
    // A section is verified if ANY of its source APIs succeeded
    const anyOk = section.apis.some(ok);
    if (anyOk) {
      verified += section.fields;
    } else {
      unverified += section.fields;
    }
  }

  const computed = computedFields.reduce((sum, s) => sum + s.fields, 0);
  const total = verified + computed + aiFields + unverified;

  return { verified, computed, ai: aiFields, unverified, total };
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  if (value >= 1_000_000) return `\u20ac${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `\u20ac${(value / 1_000).toFixed(1)}K`;
  return `\u20ac${value.toLocaleString()}`;
}

function formatScore(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  return (value / 10).toFixed(1);
}

function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}\u00b0 ${ns}, ${Math.abs(lng).toFixed(4)}\u00b0 ${ew}`;
}

export function OverviewSection({
  property,
  scores,
  economics,
  water,
  fire,
  flood,
  drought,
  energy,
  maps,
  meta,
  allNarratives,
  narratives,
}: {
  property: Property;
  scores: Scores;
  economics: Economics;
  water: Water;
  fire: FireData;
  flood: RiskData;
  drought: RiskData;
  energy: Energy;
  maps: Maps;
  meta: Meta;
  allNarratives: Narratives;
  narratives?: Narratives["overview"];
}) {
  const intro = narratives?.intro || null;
  const callout = narratives?.callout || null;

  return (
    <section id="overview">
      {/* Block 1 — Header */}
      <header>
        <h1 className="font-headline text-5xl font-bold text-brand-forest tracking-tighter mb-2">
          {property.name}
        </h1>
      </header>

      {/* Block 2 — Hero Image */}
      <section className="mb-8">
        <div className="relative h-[480px] w-full overflow-hidden">
          {maps.satellite ? (
            <img
              alt={property.name}
              className="w-full h-full object-contain"
              src={maps.satellite}
            />
          ) : (
            <div className="w-full h-full bg-brand-sage/10 flex items-center justify-center text-brand-sage text-sm">
              Satellite image not available
            </div>
          )}
          {property.coords?.lat != null && (
            <div className="absolute top-4 left-4 bg-brand-forest px-4 py-2 shadow-lg">
              <p className="text-[11px] font-bold tracking-widest text-white font-body uppercase">
                {formatCoord(property.coords.lat, property.coords.lng)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Block 3 — Editorial Narrative */}
      <section className="mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <p className="text-[14px] leading-relaxed text-on-surface font-body text-justify">
              {intro || `${property.name} is a ${property.area != null ? `${property.area.toFixed(1)} hectare` : ""} property located in ${property.address || "the region"}. ${scores.naturalCapital != null ? `With a Natural Capital score of ${(scores.naturalCapital / 10).toFixed(1)} out of 10, the property ${scores.naturalCapital >= 70 ? "demonstrates strong ecological foundations" : scores.naturalCapital >= 40 ? "presents meaningful potential for ecological enhancement" : "offers significant opportunity for natural capital development"}.` : ""}`}
            </p>
          </div>
          <div className="relative pt-4">
            <div className="border-l-[6px] border-brand-terracotta pl-8 py-4">
              <blockquote className="text-brand-forest leading-tight text-2xl font-serif italic">
                &ldquo;{callout || `A ${property.area != null ? `${property.area.toFixed(1)} ha` : ""} natural capital assessment.`}&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Block 4 — Key Metrics */}
      <section className="mb-20">
        <Hairline />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-10">
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Total Area
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {property.area != null ? property.area.toFixed(1) : "\u2014"}
              <span className="text-base ml-1">ha</span>
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Annual Natural Capital
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {formatCurrency(economics.totalValue)}
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Long-Term Value
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {formatCurrency(economics.npv?.thirtyYear)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-10">
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Water Security
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {water.securityIndex != null ? water.securityIndex.toFixed(1) : "\u2014"}
              <span className="text-base ml-1 text-brand-sage">/10</span>
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Biodiversity Score
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {formatScore(scores.biodiversity)}
              <span className="text-base ml-1 text-brand-sage">/10</span>
            </p>
          </div>
          <div className="flex justify-between items-baseline border-b border-outline-variant pb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase font-body">
              Energy Independence
            </span>
            <p className="text-[32px] font-bold tracking-tighter text-brand-forest leading-none font-serif">
              {energy.independenceScore != null ? energy.independenceScore.toFixed(1) : "\u2014"}
              <span className="text-base ml-1 text-brand-sage">/10</span>
            </p>
          </div>
        </div>
      </section>

      {/* Block 5 — Performance Indicators */}
      <section className="mb-20">
        <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-10 font-body">
          Performance Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Fire Risk */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase font-body">
                Fire Risk
              </p>
              <span className="text-xl font-bold font-serif text-brand-forest">
                {fire.riskScore != null ? `${fire.riskScore}/5` : "\u2014"}
              </span>
            </div>
            <div className="h-2 w-full bg-brand-sage/20">
              <div
                className="h-full bg-brand-terracotta"
                style={{ width: `${Math.min((fire.riskScore || 0) * 20, 100)}%` }}
              />
            </div>
          </div>

          {/* Flood Risk */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase font-body">
                Flood Risk
              </p>
              <span className="text-xl font-bold font-serif text-brand-forest">
                {flood.riskScore != null ? `${flood.riskScore}/5` : "\u2014"}
              </span>
            </div>
            <div className="h-2 w-full bg-brand-sage/20">
              <div
                className="h-full bg-brand-amber"
                style={{ width: `${Math.min((flood.riskScore || 0) * 20, 100)}%` }}
              />
            </div>
          </div>

          {/* Drought Risk */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase font-body">
                Drought Risk
              </p>
              <span className="text-xl font-bold font-serif text-brand-forest">
                {drought.riskScore != null ? `${drought.riskScore}/5` : "\u2014"}
              </span>
            </div>
            <div className="h-2 w-full bg-brand-sage/20">
              <div
                className="h-full bg-brand-sage"
                style={{ width: `${Math.min((drought.riskScore || 0) * 20, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Block 6 — Radar Chart & Block 7 — Sources */}
      <section className="flex flex-col items-center pb-10 mt-auto border-t-[0.5pt] border-outline-variant pt-16">
        {/* Radar Chart */}
        <div className="w-full mb-8">
          <h4 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-8 font-body text-center">
            Regional Comparison
          </h4>
          {(() => {
            const reg = scores.regional || {} as Record<string, number>;
            const dims = [
              { label: "Carbon", value: scores.carbon || 0, avg: reg.carbon || 0 },
              { label: "Biodiversity", value: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
              { label: "Water", value: scores.water || 0, avg: reg.water || 0 },
              { label: "Soil", value: scores.soil || 0, avg: reg.soil || 0 },
              { label: "Pollination", value: scores.pollination || 0, avg: reg.pollination || 0 },
            ];
            const n = dims.length;
            const cx = 200, cy = 200, maxR = 140;
            const angleStep = (2 * Math.PI) / n;
            const startAngle = -Math.PI / 2;

            const pointAt = (i: number, val: number) => {
              const angle = startAngle + i * angleStep;
              const r = (val / 100) * maxR;
              return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
            };

            const gridLevels = [20, 40, 60, 80, 100];

            const propertyPoints = dims.map((d, i) => pointAt(i, d.value));
            const avgPoints = dims.map((d, i) => pointAt(i, d.avg));

            const toPath = (pts: { x: number; y: number }[]) =>
              pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

            return (
              <div className="flex justify-center items-center py-4 relative">
                <svg className="w-[320px] h-[320px]" viewBox="0 0 400 400">
                  {/* Grid rings */}
                  {gridLevels.map((level) => {
                    const pts = Array.from({ length: n }, (_, i) => pointAt(i, level));
                    return (
                      <polygon
                        key={level}
                        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                        fill="none"
                        stroke="#8B9A7E"
                        strokeOpacity={0.3}
                        strokeWidth={0.5}
                      />
                    );
                  })}
                  {/* Regional average polygon */}
                  <path
                    d={toPath(avgPoints)}
                    fill="rgba(139,154,126,0.08)"
                    stroke="#8B9A7E"
                    strokeWidth={1.5}
                    strokeDasharray="4"
                  />
                  {/* Property polygon */}
                  <path
                    d={toPath(propertyPoints)}
                    fill="rgba(27,58,47,0.15)"
                    stroke="#1B3A2F"
                    strokeWidth={2}
                  />
                  {/* Property score dots */}
                  {propertyPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={3} fill="#1B3A2F" />
                  ))}
                </svg>
                {/* Axis labels positioned around the chart */}
                {dims.map((d, i) => {
                  const p = pointAt(i, 125);
                  const relX = ((p.x / 400) * 100);
                  const relY = ((p.y / 400) * 100);
                  return (
                    <span
                      key={d.label}
                      className="absolute text-[10px] uppercase font-bold tracking-widest text-brand-forest font-body whitespace-nowrap"
                      style={{
                        left: `${relX}%`,
                        top: `${relY}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {d.label}
                    </span>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex justify-center gap-8 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-brand-forest" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-sage font-body">
                Property
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 border-b border-dashed border-brand-sage" />
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-sage font-body">
                Regional Average
              </span>
            </div>
          </div>
        </div>

        {/* Sources & Confidence */}
        <div className="hairline w-full my-4 opacity-50" />
        <div className="w-full space-y-8 mt-8">
          {(() => {
            const c = classifyDataSources(meta, { narratives: allNarratives });
            const apiStatus = meta.apiStatus || {};
            const apiKeys = Object.keys(apiStatus);
            const verifiedApis = apiKeys.filter((k) => apiStatus[k] === "ok").length;

            const denom = c.verified + c.computed + c.unverified + c.ai;
            const pct = (n: number) => (denom > 0 ? Math.round((n / denom) * 100) : 0);
            const aggregatedPct = pct(c.verified);
            const computedPct = pct(c.computed);
            const syntheticPct = pct(c.unverified);
            const aiPct = 100 - aggregatedPct - computedPct - syntheticPct;
            const unc = meta.uncertainty;

            const segments = [
              {
                label: "Aggregated",
                pct: aggregatedPct,
                color: "bg-brand-forest",
                desc: `Verified API data from ${verifiedApis} sources.`,
              },
              {
                label: "Computed",
                pct: computedPct,
                color: "bg-brand-sage",
                desc: "Algorithmically derived from verified API data.",
              },
              {
                label: "Synthetic",
                pct: syntheticPct,
                color: "bg-brand-sage/50",
                desc: "Modelled or interpolated values where direct data is unavailable.",
              },
              {
                label: "AI Inference",
                pct: aiPct,
                color: "bg-brand-sage/20",
                desc: "AI-generated narrative synthesis across the aggregated layers.",
              },
            ];

            return (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase font-body">
                    Landbook Sources
                  </h4>
                  {unc && (
                    <span className="text-[10px] italic text-brand-forest font-body">
                      {unc.label} Confidence
                    </span>
                  )}
                </div>
                <div className="flex h-12 w-full mb-8">
                  {segments.map((seg) => (
                    <div
                      key={seg.label}
                      className={`${seg.color} h-full`}
                      style={{ width: `${seg.pct}%` }}
                      title={`${seg.label} ${seg.pct}%`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {segments.map((seg, i) => (
                    <div key={seg.label} className={`space-y-1 ${i % 2 === 1 ? "text-right" : ""}`}>
                      <span className="text-[10px] font-bold text-brand-forest uppercase tracking-widest font-body block">
                        {seg.pct}% {seg.label}
                      </span>
                      <p className={`text-[11px] text-brand-sage leading-relaxed italic font-body ${i % 2 === 1 ? "text-right" : ""}`}>
                        {seg.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>
    </section>
  );
}
