"use client";

import type { ConfidenceValue } from "@/lib/dashboard-types";
import { PanelCard, PanelError, PanelSkeleton } from "../PanelCard";
import { ConfidenceValueDisplay } from "../ConfidenceValueDisplay";
import { usePanelData } from "../usePanelData";

interface WeatherData {
  temperature: ConfidenceValue | null;
  humidity: ConfidenceValue | null;
  windSpeed: ConfidenceValue | null;
  precipitation: ConfidenceValue | null;
  annualMeanTemp: ConfidenceValue | null;
  annualRainfall: ConfidenceValue | null;
  monthlyMeanTemp: { month: number; value: number }[];
  monthlyPrecip: { month: number; value: number }[];
}

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function WeatherPanel({
  landbookId,
  lat,
  lng,
}: {
  landbookId: string;
  lat: number;
  lng: number;
}) {
  const { data, error, loading } = usePanelData<WeatherData>(
    `/api/dashboard/weather?landbookId=${landbookId}&lat=${lat}&lng=${lng}`
  );

  return (
    <PanelCard title="Weather" subtitle="Live + 30-year normal" icon="thermostat">
      {loading && <PanelSkeleton rows={4} />}
      {error && <PanelError source="weather" message={error} />}
      {data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-4">
            <ConfidenceValueDisplay
              label="Temperature"
              cv={data.temperature}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(1)}`)}
            />
            <ConfidenceValueDisplay
              label="Humidity"
              cv={data.humidity}
              format={(v) => (v === null ? "—" : `${Math.round(Number(v))}`)}
            />
            <ConfidenceValueDisplay
              label="Wind"
              cv={data.windSpeed}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(1)}`)}
            />
            <ConfidenceValueDisplay
              label="Rain (current)"
              cv={data.precipitation}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(1)}`)}
            />
            <ConfidenceValueDisplay
              label="Annual mean"
              cv={data.annualMeanTemp}
            />
            <ConfidenceValueDisplay
              label="Annual rainfall"
              cv={data.annualRainfall}
            />
          </div>
          {data.monthlyMeanTemp.some((m) => m.value !== 0) && (
            <MonthlySpark
              title="Monthly mean temp"
              values={data.monthlyMeanTemp.map((m) => m.value)}
              unit="°C"
            />
          )}
          {data.monthlyPrecip.some((m) => m.value !== 0) && (
            <MonthlyBars
              title="Monthly precipitation"
              values={data.monthlyPrecip.map((m) => m.value)}
              unit="mm"
            />
          )}
        </div>
      )}
    </PanelCard>
  );
}

function MonthlySpark({
  title,
  values,
  unit,
}: {
  title: string;
  values: number[];
  unit: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50 mb-1">
        {title}
      </div>
      <svg viewBox="0 0 120 40" className="w-full h-10">
        <polyline
          fill="none"
          stroke="#1B3A2F"
          strokeWidth="1"
          points={values
            .map((v, i) => {
              const x = (i / (values.length - 1)) * 120;
              const y = 36 - ((v - min) / range) * 32;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
      <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>
      <div className="text-[10px] text-brand-charcoal/50 mt-1">
        min {min.toFixed(1)}{unit} · max {max.toFixed(1)}{unit}
      </div>
    </div>
  );
}

function MonthlyBars({
  title,
  values,
  unit,
}: {
  title: string;
  values: number[];
  unit: string;
}) {
  const max = Math.max(...values);
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50 mb-1">
        {title}
      </div>
      <svg viewBox="0 0 120 40" className="w-full h-10">
        {values.map((v, i) => {
          const h = (v / max) * 36;
          const x = i * 10;
          return (
            <rect
              key={i}
              x={x}
              y={40 - h}
              width={8}
              height={h}
              fill="#8B9A7E"
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
        {MONTHS.map((m, i) => (
          <span key={i} className="w-[10px] text-center">
            {m}
          </span>
        ))}
      </div>
      <div className="text-[10px] text-brand-charcoal/50 mt-1">
        peak {max.toFixed(0)}{unit}
      </div>
    </div>
  );
}
