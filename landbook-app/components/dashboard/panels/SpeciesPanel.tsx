"use client";

import type { ConfidenceValue } from "@/lib/dashboard-types";
import { PanelCard, PanelError, PanelSkeleton } from "../PanelCard";
import { ConfidenceValueDisplay } from "../ConfidenceValueDisplay";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { usePanelData } from "../usePanelData";

interface SpeciesEntry {
  name: string;
  commonName: string | null;
  taxonId: number | null;
  count: number;
  iconicGroup: string | null;
}

interface AudioEvent {
  sensorId: string;
  metric: string;
  value: number;
  timestamp: string;
  unit?: string;
}

interface SpeciesData {
  observationCount: ConfidenceValue | null;
  speciesCount: ConfidenceValue | null;
  topSpecies: ConfidenceValue<SpeciesEntry[]> | null;
  iconicBreakdown: ConfidenceValue<Record<string, number>> | null;
  audioEvents: ConfidenceValue<AudioEvent[]> | null;
}

export function SpeciesPanel({
  landbookId,
  lat,
  lng,
}: {
  landbookId: string;
  lat: number;
  lng: number;
}) {
  const { data, error, loading } = usePanelData<SpeciesData>(
    `/api/dashboard/species?landbookId=${landbookId}&lat=${lat}&lng=${lng}`
  );

  return (
    <PanelCard title="Species" subtitle="iNaturalist + audio events" icon="pets">
      {loading && <PanelSkeleton rows={4} />}
      {error && <PanelError source="species" message={error} />}
      {data && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-x-4">
            <ConfidenceValueDisplay
              label="Observations"
              cv={data.observationCount}
            />
            <ConfidenceValueDisplay
              label="Unique taxa"
              cv={data.speciesCount}
            />
          </div>
          {data.iconicBreakdown?.value && (
            <IconicBreakdown
              data={data.iconicBreakdown.value}
              confidence={data.iconicBreakdown.confidence}
            />
          )}
          {data.topSpecies?.value && Array.isArray(data.topSpecies.value) && data.topSpecies.value.length > 0 && (
            <TopSpeciesList
              species={data.topSpecies.value}
              confidence={data.topSpecies.confidence}
            />
          )}
          {data.audioEvents?.value && Array.isArray(data.audioEvents.value) && data.audioEvents.value.length > 0 && (
            <AudioEventList events={data.audioEvents.value} />
          )}
        </div>
      )}
    </PanelCard>
  );
}

function IconicBreakdown({
  data,
  confidence,
}: {
  data: Record<string, number>;
  confidence: ConfidenceValue["confidence"];
}) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          Iconic groups
        </span>
        <ConfidenceBadge confidence={confidence} source="iNaturalist" compact />
      </div>
      <div className="flex h-3 overflow-hidden">
        {entries.map(([group, count]) => (
          <span
            key={group}
            className="bg-brand-forest"
            style={{
              width: `${(count / total) * 100}%`,
              opacity: 0.3 + (count / total) * 0.7,
            }}
            title={`${group} — ${count}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-brand-charcoal/70 mt-1">
        {entries.slice(0, 6).map(([group, count]) => (
          <div key={group} className="flex justify-between">
            <span className="capitalize">{group.toLowerCase()}</span>
            <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSpeciesList({
  species,
  confidence,
}: {
  species: SpeciesEntry[];
  confidence: ConfidenceValue["confidence"];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          Top taxa
        </span>
        <ConfidenceBadge confidence={confidence} source="iNaturalist" compact />
      </div>
      <ul className="border border-black/5 divide-y divide-black/5">
        {species.slice(0, 6).map((s) => (
          <li
            key={s.taxonId ?? s.name}
            className="flex items-center justify-between px-2 py-1.5 text-[11px]"
          >
            <span className="flex flex-col">
              <span className="text-brand-charcoal italic">{s.name}</span>
              {s.commonName && (
                <span className="text-brand-charcoal/50 text-[10px]">
                  {s.commonName}
                </span>
              )}
            </span>
            <span className="font-mono text-brand-charcoal/70">×{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AudioEventList({ events }: { events: AudioEvent[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
          Audio sensor events
        </span>
        <ConfidenceBadge confidence={1.0} source="Audio sensor" compact />
      </div>
      <ul className="border border-black/5 divide-y divide-black/5 max-h-32 overflow-auto">
        {events.slice(0, 10).map((e, i) => (
          <li
            key={i}
            className="flex items-center justify-between px-2 py-1.5 text-[11px]"
          >
            <span>{e.metric}</span>
            <span className="font-mono text-brand-charcoal/70">
              {e.value}
              {e.unit || ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
