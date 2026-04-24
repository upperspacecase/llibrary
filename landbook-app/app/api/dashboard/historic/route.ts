import { NextResponse } from "next/server";
import { cv, empty } from "@/lib/confidence";
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

function linearTrendPerDecade(xs: number[], ys: number[]): number | null {
  if (xs.length < 5) return null;
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return null;
  return (num / den) * 10;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { ok: false, error: "lat, lng required" },
      { status: 400 }
    );
  }

  let yearlyClimate: YearlyClimate[] = [];
  let tempTrend: number | null = null;
  let precipTrend: number | null = null;
  let archiveErrored = false;

  try {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - 29;
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startYear}-01-01&end_date=${endYear}-12-31&daily=temperature_2m_mean,precipitation_sum&timezone=auto`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const j = await res.json();
      const daily = j.daily;
      if (daily?.time) {
        const byYear: Record<number, { t: number; p: number; n: number }> = {};
        for (let i = 0; i < daily.time.length; i++) {
          const y = parseInt(daily.time[i].slice(0, 4));
          if (!byYear[y]) byYear[y] = { t: 0, p: 0, n: 0 };
          const t = daily.temperature_2m_mean[i];
          const p = daily.precipitation_sum[i];
          if (typeof t === "number" && typeof p === "number") {
            byYear[y].t += t;
            byYear[y].p += p;
            byYear[y].n += 1;
          }
        }
        yearlyClimate = Object.entries(byYear)
          .filter(([, v]) => v.n > 300)
          .map(([year, v]) => ({
            year: parseInt(year),
            meanTemp: Number((v.t / v.n).toFixed(2)),
            precip: Math.round(v.p),
          }))
          .sort((a, b) => a.year - b.year);

        const years = yearlyClimate.map((y) => y.year);
        const temps = yearlyClimate
          .map((y) => y.meanTemp)
          .filter((v): v is number => v !== null);
        const precs = yearlyClimate
          .map((y) => y.precip)
          .filter((v): v is number => v !== null);
        tempTrend = linearTrendPerDecade(years.slice(0, temps.length), temps);
        precipTrend = linearTrendPerDecade(years.slice(0, precs.length), precs);
      }
    } else {
      archiveErrored = true;
    }
  } catch {
    archiveErrored = true;
  }

  const geology: { name: string; age: string | null }[] = [];
  let geologyErrored = false;
  try {
    const res = await fetch(
      `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const j = await res.json();
      for (const unit of j?.success?.data || []) {
        geology.push({
          name: unit.name || unit.strat_name || "Unknown unit",
          age: unit.best_age_top && unit.best_age_bottom
            ? `${unit.best_age_top}–${unit.best_age_bottom} Ma`
            : unit.age || null,
        });
      }
    } else {
      geologyErrored = true;
    }
  } catch {
    geologyErrored = true;
  }

  let elevation: number | null = null;
  let elevationErrored = false;
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`,
      { next: { revalidate: 86400 } }
    );
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j.elevation) && typeof j.elevation[0] === "number") {
        elevation = j.elevation[0];
      }
    } else {
      elevationErrored = true;
    }
  } catch {
    elevationErrored = true;
  }

  const data: HistoricPanelData = {
    yearlyClimate: yearlyClimate.length
      ? cv(yearlyClimate, 0.4, "Open-Meteo archive", {
          sourceDetail: "30-year daily reanalysis",
        })
      : empty<YearlyClimate[]>("Open-Meteo archive", archiveErrored ? "unavailable" : "no data"),
    tempTrend:
      tempTrend !== null
        ? cv(Number(tempTrend.toFixed(2)), 0.4, "Open-Meteo archive", {
            sourceDetail: "linear trend, 30-year",
            unit: "°C/decade",
          })
        : null,
    precipTrend:
      precipTrend !== null
        ? cv(Math.round(precipTrend), 0.4, "Open-Meteo archive", {
            sourceDetail: "linear trend, 30-year",
            unit: "mm/decade",
          })
        : null,
    geology: geology.length
      ? cv(geology, 0.4, "Macrostrat", { sourceDetail: "geologic units at point" })
      : geologyErrored
        ? empty<{ name: string; age: string | null }[]>("Macrostrat", "unavailable")
        : null,
    elevation:
      elevation !== null
        ? cv(Math.round(elevation), 0.6, "Copernicus GLO-90", {
            sourceDetail: "90m DEM via Open-Meteo",
            unit: "m",
          })
        : elevationErrored
          ? empty("Elevation", "unavailable")
          : null,
  };

  return NextResponse.json({ ok: true, data });
}
