import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty } from "@/lib/confidence";
import { getFactsDoc, factsFreshness } from "@/lib/facts-source";
import type { ConfidenceValue } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

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

interface SpeciesPanelData {
  observationCount: ConfidenceValue | null;
  speciesCount: ConfidenceValue | null;
  topSpecies: ConfidenceValue<SpeciesEntry[]> | null;
  iconicBreakdown: ConfidenceValue<Record<string, number>> | null;
  audioEvents: ConfidenceValue<AudioEvent[]> | null;
}

const unwrap = (field: unknown): unknown => {
  if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
    return (field as Record<string, unknown>).value;
  }
  return field ?? null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  if (!landbookId) {
    return NextResponse.json({ ok: false, error: "landbookId required" }, { status: 400 });
  }

  const doc = await getFactsDoc(landbookId);
  const freshness = factsFreshness(doc);

  const sensors = await listSensorsForLandbook(landbookId);
  const audioSensors = sensors.filter((s) => s.type === "audio");
  const audioEvents: AudioEvent[] = [];
  for (const s of audioSensors) {
    const readings = await latestReadingsForSensor(s.id, 25);
    for (const r of readings) {
      audioEvents.push({
        sensorId: s.id,
        metric: r.metric,
        value: r.value,
        timestamp: r.timestamp,
        unit: r.unit,
      });
    }
  }

  const species = doc?.species ? (doc.species as Record<string, unknown>) : null;
  const total = species ? (unwrap(species.total) as number | null) : null;
  const top10 = (species ? (unwrap(species.top10) as Array<Record<string, unknown>> | null) : null) || [];
  const groups = (species ? (unwrap(species.groups) as Array<Record<string, unknown>> | null) : null) || [];

  const topSpecies: SpeciesEntry[] = top10.map((s) => ({
    name: (s.scientificName as string) || (s.name as string) || "Unknown",
    commonName: (s.name as string) || null,
    taxonId: typeof s.id === "number" ? (s.id as number) : null,
    count: typeof s.count === "number" ? (s.count as number) : 0,
    iconicGroup: typeof s.group === "string" ? (s.group as string) : null,
  }));

  const iconic: Record<string, number> = {};
  for (const g of groups) {
    if (typeof g.name === "string" && typeof g.count === "number") {
      iconic[g.name] = g.count;
    }
  }
  const speciesCount = topSpecies.length || groups.length;

  const detail = "Pipeline canonical (iNaturalist)";
  const ts = freshness.updatedAt || undefined;

  const data: SpeciesPanelData = {
    observationCount:
      typeof total === "number"
        ? cv(total, 1.0, "Pipeline canonical", { sourceDetail: detail, timestamp: ts })
        : empty("Pipeline canonical", doc ? "no species count" : "no facts on file"),
    speciesCount: cv(speciesCount, 1.0, "Pipeline canonical", {
      sourceDetail: "unique taxa from canonical",
      timestamp: ts,
    }),
    topSpecies:
      topSpecies.length > 0
        ? cv(topSpecies, 1.0, "Pipeline canonical", { sourceDetail: detail, timestamp: ts })
        : doc
          ? cv([], 1.0, "Pipeline canonical", { sourceDetail: "no top species", timestamp: ts })
          : null,
    iconicBreakdown: Object.keys(iconic).length
      ? cv(iconic, 1.0, "Pipeline canonical", {
          sourceDetail: "observations by iconic taxon",
          timestamp: ts,
        })
      : null,
    audioEvents: audioEvents.length
      ? cv(audioEvents, 1.0, "audio sensor", {
          sourceDetail: `${audioSensors.length} deployed`,
        })
      : null,
  };

  return NextResponse.json({ ok: true, data, freshness });
}
