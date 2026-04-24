import { NextResponse } from "next/server";
import { listSensorsForLandbook, latestReadingsForSensor } from "@/lib/sensors";
import { cv, empty } from "@/lib/confidence";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const landbookId = searchParams.get("landbookId");
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  if (!landbookId || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { ok: false, error: "landbookId, lat, lng required" },
      { status: 400 }
    );
  }

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

  const radius = 5;
  const inatUrl = `https://api.inaturalist.org/v1/observations?lat=${lat}&lng=${lng}&radius=${radius}&quality_grade=research&per_page=200&order=desc&order_by=observed_on`;

  let topSpecies: SpeciesEntry[] = [];
  let observationCount = 0;
  let speciesCount = 0;
  const iconic: Record<string, number> = {};
  let errored = false;

  try {
    const res = await fetch(inatUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const j = await res.json();
      observationCount = j.total_results ?? j.results?.length ?? 0;
      const byTaxon: Map<number, SpeciesEntry> = new Map();
      for (const obs of j.results || []) {
        const taxon = obs.taxon;
        if (!taxon) continue;
        const id = taxon.id;
        const existing = byTaxon.get(id);
        if (existing) {
          existing.count += 1;
        } else {
          byTaxon.set(id, {
            name: taxon.name,
            commonName: taxon.preferred_common_name || null,
            taxonId: id,
            count: 1,
            iconicGroup: taxon.iconic_taxon_name || null,
          });
        }
        if (taxon.iconic_taxon_name) {
          iconic[taxon.iconic_taxon_name] =
            (iconic[taxon.iconic_taxon_name] || 0) + 1;
        }
      }
      speciesCount = byTaxon.size;
      topSpecies = Array.from(byTaxon.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } else {
      errored = true;
    }
  } catch {
    errored = true;
  }

  const data: SpeciesPanelData = {
    observationCount: errored
      ? empty("iNaturalist", "unavailable")
      : cv(observationCount, 1.0, "iNaturalist", {
          sourceDetail: `research-grade within ${radius}km`,
        }),
    speciesCount: errored
      ? null
      : cv(speciesCount, 1.0, "iNaturalist", {
          sourceDetail: "unique taxa observed",
        }),
    topSpecies:
      topSpecies.length > 0
        ? cv(topSpecies, 1.0, "iNaturalist", {
            sourceDetail: "research-grade observations",
          })
        : errored
          ? null
          : cv([], 1.0, "iNaturalist", { sourceDetail: "no observations yet" }),
    iconicBreakdown: Object.keys(iconic).length
      ? cv(iconic, 1.0, "iNaturalist", {
          sourceDetail: "observations grouped by iconic taxon",
        })
      : null,
    audioEvents: audioEvents.length
      ? cv(audioEvents, 1.0, "audio sensor", {
          sourceDetail: `${audioSensors.length} deployed`,
        })
      : null,
  };

  return NextResponse.json({ ok: true, data });
}
