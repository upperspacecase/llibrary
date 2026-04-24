"use client";

import type { ConfidenceValue } from "@/lib/dashboard-types";
import { PanelCard, PanelError, PanelSkeleton } from "../PanelCard";
import { ConfidenceValueDisplay } from "../ConfidenceValueDisplay";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { usePanelData } from "../usePanelData";

interface YearlyClimate {
  year: number;
  meanTemp: number | null;
  precip: number | null;
}

interface HistoricData {
  yearlyClimate: ConfidenceValue<YearlyClimate[]> | null;
  tempTrend: ConfidenceValue | null;
  precipTrend: ConfidenceValue | null;
  geology: ConfidenceValue<{ name: string; age: string | null }[]> | null;
  elevation: ConfidenceValue | null;
}

export function HistoricPanel({
  landbookId,
  lat,
  lng,
}: {
  landbookId: string;
  lat: number;
  lng: number;
}) {
  void landbookId;
  const { data, error, loading } = usePanelData<HistoricData>(
    `/api/dashboard/historic?lat=${lat}&lng=${lng}`
  );

  return (
    <PanelCard
      title="Historic"
      subtitle="Climate trend + geology"
      icon="history"
      span={2}
    >
      {loading && <PanelSkeleton rows={4} />}
      {error && <PanelError source="historic" message={error} />}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-x-4">
              <ConfidenceValueDisplay label="Elevation" cv={data.elevation} />
              <ConfidenceValueDisplay label="Temp trend" cv={data.tempTrend} />
              <ConfidenceValueDisplay label="Precip trend" cv={data.precipTrend} />
            </div>
            {data.geology?.value && Array.isArray(data.geology.value) && data.geology.value.length > 0 && (
              <GeologyList
                units={data.geology.value}
                confidence={data.geology.confidence}
              />
            )}
          </div>
          <div>
            {data.yearlyClimate?.value &&
              Array.isArray(data.yearlyClimate.value) &&
              data.yearlyClimate.value.length > 0 && (
                <YearlyClimateChart
                  data={data.yearlyClimate.value}
                  confidence={data.yearlyClimate.confidence}
                />
              )}
          </div>
        </div>
      )}
    </PanelCard>
  );
}

function GeologyList({
  units,
  confidence,
}: {
  units: { name: string; age: string | null }[];
  confidence: ConfidenceValue["confidence"];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          Geologic units
        </span>
        <ConfidenceBadge confidence={confidence} source="Macrostrat" compact />
      </div>
      <ul className="border border-black/5 divide-y divide-black/5">
        {units.slice(0, 4).map((u, i) => (
          <li key={i} className="flex justify-between px-2 py-1.5 text-[11px]">
            <span className="text-brand-charcoal">{u.name}</span>
            {u.age && <span className="font-mono text-brand-charcoal/60">{u.age}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function YearlyClimateChart({
  data,
  confidence,
}: {
  data: YearlyClimate[];
  confidence: ConfidenceValue["confidence"];
}) {
  const temps = data.map((d) => d.meanTemp).filter((v): v is number => v !== null);
  const precs = data.map((d) => d.precip).filter((v): v is number => v !== null);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);
  const pMax = Math.max(...precs);
  const yearMin = data[0]?.year ?? 0;
  const yearMax = data[data.length - 1]?.year ?? 0;
  const yearRange = yearMax - yearMin || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          30-year climate
        </span>
        <ConfidenceBadge confidence={confidence} source="Open-Meteo archive" compact />
      </div>
      <svg viewBox="0 0 200 100" className="w-full h-32 border border-black/5 bg-brand-cream/50">
        {data.map((d, i) => {
          if (d.precip === null) return null;
          const x = ((d.year - yearMin) / yearRange) * 200;
          const h = (d.precip / pMax) * 40;
          return (
            <rect
              key={`p-${i}`}
              x={x - 2}
              y={100 - h}
              width={4}
              height={h}
              fill="#8B9A7E"
              opacity={0.5}
            />
          );
        })}
        <polyline
          fill="none"
          stroke="#C4705A"
          strokeWidth="1.2"
          points={data
            .filter((d) => d.meanTemp !== null)
            .map((d) => {
              const x = ((d.year - yearMin) / yearRange) * 200;
              const y = 55 - ((d.meanTemp! - tMin) / (tMax - tMin || 1)) * 40;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
      <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
        <span>{yearMin}</span>
        <span className="text-[#C4705A]">Mean temp</span>
        <span className="text-[#8B9A7E]">Rainfall</span>
        <span>{yearMax}</span>
      </div>
    </div>
  );
}
