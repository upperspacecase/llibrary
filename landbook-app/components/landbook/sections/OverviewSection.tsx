import type { Property, Scores, Economics, Water, FireData, Maps, Meta, Narratives, ReportData } from "@/lib/types";
import {
  SectionTitle, Gauge, KPI, Hairline, PullQuote, SubsectionHeader,
} from "@/components/river";

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

export function OverviewSection({
  property,
  scores,
  economics,
  water,
  fire,
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
  maps: Maps;
  meta: Meta;
  allNarratives: Narratives;
  narratives?: Narratives["executiveSummary"];
}) {
  return (
    <section id="overview">
      <SectionTitle title="Overview" />

      {/* 1.1 Property Identity */}
      <SubsectionHeader id="1.1" title="Property Identity" sources={["Pipeline"]} />
      <div className="mb-8">
        <div className="serif-title text-lg text-brand-forest mb-1">{property.name}</div>
        <div className="text-sm text-brand-sage mb-2">{property.address}</div>
        {property.coords?.lat != null && (
          <div className="text-xs font-mono text-brand-sage">
            {property.coords.lat.toFixed(5)}, {property.coords.lng.toFixed(5)}
          </div>
        )}
        {property.area != null && (
          <div className="text-xs text-brand-sage mt-1">{property.area.toFixed(1)} ha</div>
        )}
      </div>
      {/* TODO: Land Use Designation & Ownership Structure — re-enable when data pipeline supports it
      <PlaceholderBox
        id="1.1"
        title="Land Use Designation & Ownership Structure"
        status="NEW — NOT IN DATA PIPELINE"
      />
      */}

      <Hairline />

      {/* 1.2 Hero Metrics Dashboard */}
      <SubsectionHeader id="1.2" title="Hero Metrics Dashboard" sources={["Pipeline", "Computed"]} />
      <div className="grid grid-cols-3 gap-8 mb-8">
        <Gauge value={scores.naturalCapital} max={100} color="forest" label="Natural Capital" />
        <Gauge value={water.securityIndex} max={10} color="forest" label="Water Security" />
        <Gauge value={fire.riskScore} max={5} color="terracotta" label="Fire Risk" />
      </div>
      <div className="grid grid-cols-4 gap-8 mb-8">
        <KPI value={property.area?.toFixed(1)} unit="ha" label="Total Area" />
        <KPI
          value={economics.valuePerHa ? `\u20ac${economics.valuePerHa.toLocaleString()}` : null}
          unit="/ha"
          label="Ecosystem Value"
        />
        <KPI value={scores.carbon} unit="/100" label="Carbon Score" />
        <KPI value={scores.biodiversity} unit="/100" label="Biodiversity Score" />
      </div>
      {/* Data Confidence — Verified / Computed / AI / Unverified breakdown */}
      {(() => {
        const c = classifyDataSources(meta, { narratives: allNarratives });
        const verifiedPct = Math.round((c.verified / c.total) * 100);
        const computedPct = Math.round((c.computed / c.total) * 100);
        const aiPct = Math.round((c.ai / c.total) * 100);
        const unverifiedPct = 100 - verifiedPct - computedPct - aiPct;
        const unc = meta.uncertainty;

        const segments = [
          { label: "Verified", count: c.verified, pct: verifiedPct, color: "bg-brand-forest" },
          { label: "Computed", count: c.computed, pct: computedPct, color: "bg-brand-forest/50" },
          { label: "AI-Generated", count: c.ai, pct: aiPct, color: "bg-brand-sage" },
          ...(c.unverified > 0 ? [{ label: "Unverified", count: c.unverified, pct: unverifiedPct, color: "bg-brand-terracotta" }] : []),
        ];

        return (
          <div className="border-[0.5px] border-brand-sage/30 p-6 mb-8">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage mb-4">
              Sources &amp; Methods
            </div>
            {/* Stacked bar */}
            <div className="flex h-3 w-full overflow-hidden mb-4">
              {segments.map((seg) => (
                <div key={seg.label} className={`${seg.color} h-full`} style={{ width: `${seg.pct}%` }} />
              ))}
            </div>
            {/* Legend with counts */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-4">
              {segments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 ${seg.color} shrink-0`} />
                  <div>
                    <div className="text-sm font-black text-brand-forest">{seg.count} <span className="font-bold text-[10px] text-brand-sage">({seg.pct}%)</span></div>
                    <div className="text-[10px] text-brand-sage">{seg.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between pt-3 border-t-[0.5px] border-brand-sage/20">
              <div className="text-[10px] text-brand-sage">
                {c.total} total data points across {Object.keys(meta.apiStatus || {}).length} API sources
              </div>
              {unc && (
                <div className="text-sm font-bold text-brand-forest">{unc.label}</div>
              )}
            </div>
          </div>
        );
      })()}

      <Hairline />

      {/* 1.3 At-a-Glance Summary */}
      <SubsectionHeader id="1.3" title="At-a-Glance Summary" sources={["AI"]} />
      {narratives?.intro ? (
        <p className="text-[14.6px] leading-relaxed text-brand-charcoal mb-8 max-w-[500px]">
          {narratives.intro}
        </p>
      ) : (
        <p className="text-sm text-brand-sage mb-8">No summary generated yet.</p>
      )}

      <Hairline />

      {/* 1.4 Key Visual Signature */}
      <SubsectionHeader id="1.4" title="Key Visual Signature" sources={["Pipeline", "Computed"]} />
      {maps.satellite ? (
        <div className="border-[0.5px] border-brand-sage/30 overflow-hidden mb-6">
          <img src={maps.satellite} alt="Satellite view" className="w-full h-64 object-cover" />
        </div>
      ) : (
        <div className="h-48 bg-brand-sage/10 flex items-center justify-center text-brand-sage text-sm mb-6">
          Satellite image not available
        </div>
      )}

      {/* Scorecard bars (existing) */}
      {(() => {
        const reg = scores.regional || {} as Record<string, number>;
        const dims = [
          { label: "Carbon", score: scores.carbon || 0, avg: reg.carbon || 0 },
          { label: "Biodiversity", score: scores.biodiversity || 0, avg: reg.biodiversity || 0 },
          { label: "Water", score: scores.water || 0, avg: reg.water || 0 },
          { label: "Soil", score: scores.soil || 0, avg: reg.soil || 0 },
          { label: "Pollination", score: scores.pollination || 0, avg: reg.pollination || 0 },
        ];
        return dims.map((dim) => {
          const diff = dim.score - dim.avg;
          const sign = diff > 0 ? "+" : "";
          const pct = Math.min(dim.score, 100);
          return (
            <div key={dim.label} className="flex items-center gap-6 py-3 border-b-[0.5px] border-brand-sage/20 last:border-0">
              <div className="w-24 text-sm font-bold text-brand-forest">{dim.label}</div>
              <div className="flex-1">
                <div className="h-2 bg-brand-sage/20 w-full">
                  <div className="h-full bg-brand-forest" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="w-12 text-right text-sm font-black text-brand-forest">{dim.score}</div>
              <div className={`w-20 text-right text-[10px] font-bold ${diff >= 0 ? "text-brand-sage" : "text-brand-terracotta"}`}>
                {sign}{diff} vs avg
              </div>
            </div>
          );
        });
      })()}

      {/* Radar / Spider chart — property scores vs regional average */}
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
        const cx = 150, cy = 150, maxR = 110;
        const angleStep = (2 * Math.PI) / n;
        const startAngle = -Math.PI / 2; // top

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
          <div className="flex justify-center mb-8 mt-4">
            <svg viewBox="0 0 300 300" className="w-72 h-72">
              {/* Grid rings */}
              {gridLevels.map((level) => {
                const pts = Array.from({ length: n }, (_, i) => pointAt(i, level));
                return (
                  <polygon
                    key={level}
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#A3B18A"
                    strokeOpacity={0.25}
                    strokeWidth={0.5}
                  />
                );
              })}
              {/* Axis lines */}
              {dims.map((_, i) => {
                const p = pointAt(i, 100);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={p.x}
                    y2={p.y}
                    stroke="#A3B18A"
                    strokeOpacity={0.25}
                    strokeWidth={0.5}
                  />
                );
              })}
              {/* Regional average polygon */}
              <path d={toPath(avgPoints)} fill="#A3B18A" fillOpacity={0.15} stroke="#A3B18A" strokeWidth={1} strokeDasharray="4 3" />
              {/* Property polygon */}
              <path d={toPath(propertyPoints)} fill="#1B4332" fillOpacity={0.12} stroke="#1B4332" strokeWidth={1.5} />
              {/* Property score dots */}
              {propertyPoints.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill="#1B4332" />
              ))}
              {/* Labels */}
              {dims.map((d, i) => {
                const p = pointAt(i, 118);
                const anchor = p.x < cx - 5 ? "end" : p.x > cx + 5 ? "start" : "middle";
                return (
                  <text
                    key={d.label}
                    x={p.x}
                    y={p.y}
                    textAnchor={anchor}
                    dominantBaseline="central"
                    className="text-[10px] font-bold fill-brand-forest"
                  >
                    {d.label}
                  </text>
                );
              })}
            </svg>
          </div>
        );
      })()}
      <div className="flex items-center gap-6 justify-center mb-8 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-[2px] bg-brand-forest" />
          <span className="text-brand-forest font-bold">Property</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-[2px] bg-brand-sage border-dashed" style={{ borderTop: "2px dashed #A3B18A", height: 0 }} />
          <span className="text-brand-sage font-bold">Regional Avg</span>
        </div>
      </div>

      <PullQuote text={narratives?.pullQuote} />
    </section>
  );
}
