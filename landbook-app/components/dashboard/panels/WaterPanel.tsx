"use client";

import type { ConfidenceValue } from "@/lib/dashboard-types";
import { PanelCard, PanelError, PanelSkeleton } from "../PanelCard";
import { ConfidenceValueDisplay } from "../ConfidenceValueDisplay";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { usePanelData } from "../usePanelData";

interface WaterFeature {
  type: string;
  name: string | null;
  distanceM: number;
}

interface WaterData {
  sensorLevel: ConfidenceValue | null;
  sensorFlow: ConfidenceValue | null;
  features: ConfidenceValue<WaterFeature[]> | null;
  featureCount: ConfidenceValue | null;
  nearestDistance: ConfidenceValue | null;
}

export function WaterPanel({
  landbookId,
  lat,
  lng,
}: {
  landbookId: string;
  lat: number;
  lng: number;
}) {
  const { data, error, loading } = usePanelData<WaterData>(
    `/api/dashboard/water?landbookId=${landbookId}&lat=${lat}&lng=${lng}`
  );

  return (
    <PanelCard title="Water" subtitle="Sensor + OSM hydrology" icon="water_drop">
      {loading && <PanelSkeleton rows={4} />}
      {error && <PanelError source="water" message={error} />}
      {data && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-4">
            <ConfidenceValueDisplay
              label="Level"
              cv={data.sensorLevel}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(2)}`)}
            />
            <ConfidenceValueDisplay
              label="Flow"
              cv={data.sensorFlow}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(2)}`)}
            />
            <ConfidenceValueDisplay label="Features in 1.5km" cv={data.featureCount} />
            <ConfidenceValueDisplay label="Nearest" cv={data.nearestDistance} />
          </div>
          {data.features && Array.isArray(data.features.value) && data.features.value.length > 0 && (
            <FeatureList features={data.features.value} confidence={data.features.confidence} />
          )}
        </div>
      )}
    </PanelCard>
  );
}

function FeatureList({
  features,
  confidence,
}: {
  features: WaterFeature[];
  confidence: ConfidenceValue["confidence"];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          Nearest features
        </span>
        <ConfidenceBadge confidence={confidence} source="OpenStreetMap" compact />
      </div>
      <ul className="border border-black/5 divide-y divide-black/5 max-h-40 overflow-auto">
        {features.slice(0, 8).map((f, i) => (
          <li
            key={i}
            className="flex items-center justify-between px-2 py-1.5 text-[11px]"
          >
            <span className="flex items-center gap-2">
              <span className="capitalize text-brand-charcoal">{f.type}</span>
              {f.name && <span className="text-brand-charcoal/50">— {f.name}</span>}
            </span>
            <span className="font-mono text-brand-charcoal/60">{f.distanceM}m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
