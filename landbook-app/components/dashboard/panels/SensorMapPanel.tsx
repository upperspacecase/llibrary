"use client";

import { useEffect, useState } from "react";
import type { Sensor, SensorReading, SensorType } from "@/lib/dashboard-types";
import { PanelCard, PanelEmptyState, PanelError } from "../PanelCard";

type SensorWithReadings = Sensor & { latestReadings: SensorReading[] };

const TYPE_COLOR: Record<SensorType, string> = {
  weather: "#1B3A2F",
  water: "#0369a1",
  soil: "#a16207",
  audio: "#7c3aed",
};

const TYPE_ICON: Record<SensorType, string> = {
  weather: "partly_cloudy_day",
  water: "water_drop",
  soil: "terrain",
  audio: "graphic_eq",
};

const STATUS_DOT: Record<Sensor["status"], string> = {
  online: "bg-emerald-500",
  offline: "bg-neutral-400",
  stale: "bg-amber-500",
  pending: "bg-rose-400",
};

export function SensorMapPanel({
  landbookId,
  boundary,
  center,
}: {
  landbookId: string;
  boundary: number[][];
  center: { lat: number; lng: number };
}) {
  const [sensors, setSensors] = useState<SensorWithReadings[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sensors?landbookId=${encodeURIComponent(landbookId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) setError(data.error || "failed");
        else setSensors(data.sensors);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [landbookId]);

  const viewBox = computeViewBox(boundary, center);
  const boundaryPath = boundary.length
    ? boundary
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${project(pt, viewBox)}`)
        .join(" ") + " Z"
    : "";

  return (
    <PanelCard
      title="Sensor Network"
      subtitle={`${sensors?.length ?? 0} of 50 deployed`}
      icon="sensors"
      span={3}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-brand-cream border border-black/5 aspect-[16/9] relative">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            {boundaryPath && (
              <path
                d={boundaryPath}
                fill="#8B9A7E20"
                stroke="#1B3A2F"
                strokeWidth="0.4"
              />
            )}
            {sensors?.map((s) => {
              const [x, y] = project([s.position.lng, s.position.lat], viewBox);
              return (
                <g key={s.id}>
                  <circle
                    cx={x}
                    cy={y}
                    r={2}
                    fill={TYPE_COLOR[s.type]}
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </g>
              );
            })}
          </svg>
          {sensors && sensors.length === 0 && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <PanelEmptyState
                icon="sensors_off"
                title="No sensors deployed"
                hint="Register hardware via /api/sensors and point it at the ingest webhook."
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {error && <PanelError source="sensors" message={error} />}
          <TypeLegend sensors={sensors} />
          <SensorList sensors={sensors} />
        </div>
      </div>
    </PanelCard>
  );
}

function TypeLegend({ sensors }: { sensors: SensorWithReadings[] | null }) {
  const types: SensorType[] = ["weather", "water", "soil", "audio"];
  return (
    <div className="grid grid-cols-2 gap-2">
      {types.map((t) => {
        const count = sensors?.filter((s) => s.type === t).length ?? 0;
        return (
          <div
            key={t}
            className="flex items-center gap-2 text-[11px] text-brand-charcoal/80 border border-black/5 px-2 py-1.5"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: TYPE_COLOR[t] }}
            />
            <span className="capitalize flex-1">{t}</span>
            <span className="font-mono font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function SensorList({ sensors }: { sensors: SensorWithReadings[] | null }) {
  if (!sensors) return <p className="text-[11px] text-brand-charcoal/40">Loading…</p>;
  if (sensors.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-black/5 border border-black/5 max-h-64 overflow-auto">
      {sensors.map((s) => (
        <li key={s.id} className="flex items-center gap-2 px-2 py-1.5">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: TYPE_COLOR[s.type] }}
            aria-hidden
          >
            {TYPE_ICON[s.type]}
          </span>
          <span className="flex-1 text-[11px] truncate">{s.label}</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s.status]}`}
            title={s.status}
          />
        </li>
      ))}
    </ul>
  );
}

type ViewBox = { minLng: number; minLat: number; lngRange: number; latRange: number };

function computeViewBox(
  boundary: number[][],
  center: { lat: number; lng: number }
): ViewBox {
  if (!boundary.length) {
    const pad = 0.005;
    return {
      minLng: center.lng - pad,
      minLat: center.lat - pad,
      lngRange: pad * 2,
      latRange: pad * 2,
    };
  }
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of boundary) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  const lngRange = maxLng - minLng || 0.001;
  const latRange = maxLat - minLat || 0.001;
  const padLng = lngRange * 0.1;
  const padLat = latRange * 0.1;
  return {
    minLng: minLng - padLng,
    minLat: minLat - padLat,
    lngRange: lngRange + padLng * 2,
    latRange: latRange + padLat * 2,
  };
}

function project([lng, lat]: number[], v: ViewBox): [number, number] {
  const x = ((lng - v.minLng) / v.lngRange) * 100;
  const y = 100 - ((lat - v.minLat) / v.latRange) * 100;
  return [x, y];
}
