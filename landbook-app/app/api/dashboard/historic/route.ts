import { NextResponse } from "next/server";
import { cv, empty } from "@/lib/confidence";
import { getFactsDoc, factsFreshness } from "@/lib/facts-source";
import type { ConfidenceValue } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

interface YearlyClimate {
  year: number;
  meanTemp: number | null;
  precip: number | null;
}

interface HistoricPanelData {
  yearlyClimate: ConfidenceValue<YearlyClimate[]> | null;
  tempTrend: ConfidenceValue | null;
  precipTrend: ConfidenceValue | null;
  geology: ConfidenceValue<{ name: string; age: string | null }[]> | null;
  elevation: ConfidenceValue | null;
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

  const trends = doc?.trends ? (doc.trends as Record<string, unknown>) : null;
  const yearly =
    (trends ? (unwrap(trends.yearly) as Array<Record<string, unknown>> | null) : null) || [];
  const tempTrend = trends ? (unwrap(trends.tempPerDecade) as number | null) : null;
  const precipTrend = trends ? (unwrap(trends.precipPerDecade) as number | null) : null;

  const yearlyClimate: YearlyClimate[] = yearly
    .map((y) => ({
      year: typeof y.year === "number" ? (y.year as number) : Number(y.year),
      meanTemp: typeof y.meanTemp === "number" ? (y.meanTemp as number) : null,
      precip: typeof y.precip === "number" ? (y.precip as number) : null,
    }))
    .filter((y) => Number.isFinite(y.year));

  const geo = doc?.geology ? (doc.geology as Record<string, unknown>) : null;
  const lithology = geo ? (unwrap(geo.lithology) as string | null) : null;
  const period = geo ? (unwrap(geo.period) as string | null) : null;
  const age = geo ? (unwrap(geo.age) as string | null) : null;
  const geology: { name: string; age: string | null }[] = lithology
    ? [{ name: `${period ? period + " — " : ""}${lithology}`, age: age ?? null }]
    : [];

  const terrain = doc?.terrain ? (doc.terrain as Record<string, unknown>) : null;
  const elevation = terrain ? (unwrap(terrain.elevation) as number | null) : null;

  const ts = freshness.updatedAt || undefined;

  const data: HistoricPanelData = {
    yearlyClimate: yearlyClimate.length
      ? cv(yearlyClimate, 0.4, "Pipeline canonical", {
          sourceDetail: "Open-Meteo 50-yr archive (per-year mean)",
          timestamp: ts,
        })
      : empty<YearlyClimate[]>("Pipeline canonical", doc ? "no yearly archive" : "no facts on file"),
    tempTrend:
      tempTrend !== null && tempTrend !== undefined
        ? cv(Number(tempTrend.toFixed(2)), 0.4, "Pipeline canonical", {
            sourceDetail: "linear trend from canonical archive",
            unit: "°C/decade",
            timestamp: ts,
          })
        : null,
    precipTrend:
      precipTrend !== null && precipTrend !== undefined
        ? cv(Math.round(precipTrend), 0.4, "Pipeline canonical", {
            sourceDetail: "linear trend from canonical archive",
            unit: "mm/decade",
            timestamp: ts,
          })
        : null,
    geology: geology.length
      ? cv(geology, 0.4, "Pipeline canonical", { sourceDetail: "Macrostrat at point", timestamp: ts })
      : null,
    elevation:
      typeof elevation === "number"
        ? cv(Math.round(elevation), 0.6, "Pipeline canonical", {
            sourceDetail: "Open-Meteo SRTM via canonical",
            unit: "m",
            timestamp: ts,
          })
        : null,
  };

  return NextResponse.json({ ok: true, data, freshness });
}
