import type { Property, Scores, Economics, Water, FireData, Maps, Meta, Narratives } from "@/lib/types";
import {
  SectionTitle, Gauge, KPI, Hairline, PullQuote, SubsectionHeader,
} from "@/components/river";

export function OverviewSection({
  property,
  scores,
  economics,
  water,
  fire,
  maps,
  meta,
  narratives,
}: {
  property: Property;
  scores: Scores;
  economics: Economics;
  water: Water;
  fire: FireData;
  maps: Maps;
  meta: Meta;
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
      {/* Data Confidence Summary — derived from pipeline apiStatus + uncertainty */}
      {(() => {
        const entries = Object.entries(meta.apiStatus || {});
        const total = entries.length;
        const apiOk = entries.filter(([, v]) => v === "ok").length;
        const apiFailed = total - apiOk;
        const apiPct = total > 0 ? Math.round((apiOk / total) * 100) : 0;
        const failedPct = total > 0 ? Math.round((apiFailed / total) * 100) : 0;
        const unc = meta.uncertainty;

        return (
          <div className="border-[0.5px] border-brand-sage/30 p-6 mb-8">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-sage mb-4">
              Data Confidence
            </div>
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <div className="text-2xl font-black text-brand-forest">{apiOk}</div>
                <div className="text-[10px] text-brand-sage">API sources succeeded</div>
              </div>
              <div>
                <div className="text-2xl font-black text-brand-terracotta">{apiFailed}</div>
                <div className="text-[10px] text-brand-sage">Sources failed</div>
              </div>
              <div>
                <div className="text-2xl font-black text-brand-forest">{total}</div>
                <div className="text-[10px] text-brand-sage">Total data points</div>
              </div>
            </div>
            {/* Completeness bar */}
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-brand-sage mb-1">
                <span>API completeness</span>
                <span>{apiPct}%</span>
              </div>
              <div className="h-2 bg-brand-sage/20 w-full">
                <div
                  className="h-full bg-brand-forest"
                  style={{ width: `${apiPct}%` }}
                />
              </div>
            </div>
            {apiFailed > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-[10px] text-brand-sage mb-1">
                  <span>Failed / unavailable</span>
                  <span>{failedPct}%</span>
                </div>
                <div className="h-2 bg-brand-sage/20 w-full">
                  <div
                    className="h-full bg-brand-terracotta"
                    style={{ width: `${failedPct}%` }}
                  />
                </div>
              </div>
            )}
            {unc && (
              <div className="flex items-baseline gap-4 pt-3 border-t-[0.5px] border-brand-sage/20">
                <div className="text-sm font-bold text-brand-forest">{unc.label}</div>
                <div className="text-[10px] text-brand-sage">
                  {unc.apisOk}/{unc.apisTotal} critical APIs &middot; {unc.completeness}% completeness
                </div>
              </div>
            )}
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
