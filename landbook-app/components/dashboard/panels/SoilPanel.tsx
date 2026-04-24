"use client";

import type { ConfidenceValue } from "@/lib/dashboard-types";
import { PanelCard, PanelError, PanelSkeleton } from "../PanelCard";
import { ConfidenceValueDisplay } from "../ConfidenceValueDisplay";
import { usePanelData } from "../usePanelData";

interface SoilData {
  moisture: ConfidenceValue | null;
  temperature: ConfidenceValue | null;
  ph: ConfidenceValue | null;
  organicCarbon: ConfidenceValue | null;
  clay: ConfidenceValue | null;
  sand: ConfidenceValue | null;
  nitrogen: ConfidenceValue | null;
  cec: ConfidenceValue | null;
}

export function SoilPanel({
  landbookId,
  lat,
  lng,
}: {
  landbookId: string;
  lat: number;
  lng: number;
}) {
  const { data, error, loading } = usePanelData<SoilData>(
    `/api/dashboard/soil?landbookId=${landbookId}&lat=${lat}&lng=${lng}`
  );

  return (
    <PanelCard title="Soil" subtitle="Sensor + SoilGrids" icon="terrain">
      {loading && <PanelSkeleton rows={4} />}
      {error && <PanelError source="soil" message={error} />}
      {data && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-4">
            <ConfidenceValueDisplay
              label="Moisture"
              cv={data.moisture}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(2)}`)}
            />
            <ConfidenceValueDisplay
              label="Soil temp"
              cv={data.temperature}
              format={(v) => (v === null ? "—" : `${Number(v).toFixed(1)}`)}
            />
            <ConfidenceValueDisplay label="pH" cv={data.ph} />
            <ConfidenceValueDisplay
              label="Organic C"
              cv={data.organicCarbon}
            />
            <ConfidenceValueDisplay label="Clay" cv={data.clay} />
            <ConfidenceValueDisplay label="Sand" cv={data.sand} />
            <ConfidenceValueDisplay label="Nitrogen" cv={data.nitrogen} />
            <ConfidenceValueDisplay label="CEC" cv={data.cec} />
          </div>
          {data.clay?.value !== null &&
            data.sand?.value !== null &&
            data.clay &&
            data.sand && <TextureBar clay={Number(data.clay.value)} sand={Number(data.sand.value)} />}
        </div>
      )}
    </PanelCard>
  );
}

function TextureBar({ clay, sand }: { clay: number; sand: number }) {
  const silt = Math.max(0, 100 - clay - sand);
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50 mb-1">
        Texture
      </div>
      <div className="flex h-3 overflow-hidden">
        <span
          className="bg-[#a16207]"
          style={{ width: `${clay}%` }}
          title={`Clay ${clay.toFixed(0)}%`}
        />
        <span
          className="bg-[#d97706]"
          style={{ width: `${silt}%` }}
          title={`Silt ${silt.toFixed(0)}%`}
        />
        <span
          className="bg-[#fbbf24]"
          style={{ width: `${sand}%` }}
          title={`Sand ${sand.toFixed(0)}%`}
        />
      </div>
      <div className="flex justify-between text-[9px] text-brand-charcoal/50 mt-1">
        <span>Clay {clay.toFixed(0)}%</span>
        <span>Silt {silt.toFixed(0)}%</span>
        <span>Sand {sand.toFixed(0)}%</span>
      </div>
    </div>
  );
}
