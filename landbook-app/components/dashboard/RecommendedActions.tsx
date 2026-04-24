"use client";

import { useEffect, useState } from "react";
import type { Sensor, SensorType } from "@/lib/dashboard-types";

interface Recommendation {
  title: string;
  reason: string;
  sensorType: SensorType | null;
  severity: "low" | "mid" | "high";
}

export function RecommendedActions({ landbookId }: { landbookId: string }) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sensorsRes] = await Promise.all([
        fetch(`/api/sensors?landbookId=${landbookId}`).then((r) => r.json()).catch(() => null),
      ]);
      if (cancelled) return;
      const sensors: Sensor[] = sensorsRes?.sensors ?? [];
      const deployed = new Set(sensors.map((s) => s.type));
      const out: Recommendation[] = [];

      if (!deployed.has("weather")) {
        out.push({
          title: "Deploy a weather station",
          reason:
            "Current readings rely on Open-Meteo modeled data (0.4). A station on-parcel lifts temperature, humidity, wind and rain to measured (1.0).",
          sensorType: "weather",
          severity: "mid",
        });
      }
      if (!deployed.has("soil")) {
        out.push({
          title: "Deploy a soil sensor",
          reason:
            "Soil moisture and real-time pH are unavailable; SoilGrids only gives 250m modeled averages (0.4).",
          sensorType: "soil",
          severity: "high",
        });
      }
      if (!deployed.has("water")) {
        out.push({
          title: "Deploy a water sensor",
          reason:
            "Hydrology comes from OSM geometry only (0.6). A level/flow sensor at the nearest waterway adds live measurement (1.0).",
          sensorType: "water",
          severity: "mid",
        });
      }
      if (!deployed.has("audio")) {
        out.push({
          title: "Deploy an audio sensor",
          reason:
            "Species data is limited to public iNaturalist uploads. An audio sensor captures continuous avian and insect activity.",
          sensorType: "audio",
          severity: "low",
        });
      }

      setRecs(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [landbookId]);

  if (!recs || recs.length === 0) return null;

  return (
    <section className="bg-white border border-black/10 p-5">
      <header className="flex items-center gap-3 mb-3">
        <span
          className="material-symbols-outlined text-brand-terracotta"
          style={{ fontSize: 20 }}
          aria-hidden
        >
          priority_high
        </span>
        <div>
          <h2 className="font-serif text-lg text-brand-charcoal">
            Recommended actions
          </h2>
          <p className="text-[11px] tracking-[0.1em] uppercase text-brand-charcoal/50">
            Upgrade confidence tier by deploying sensors
          </p>
        </div>
      </header>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.map((r, i) => (
          <li key={i} className="border border-black/5 p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm text-brand-charcoal">
                {r.title}
              </span>
              <SeverityDot severity={r.severity} />
            </div>
            <span className="text-[11px] text-brand-charcoal/70 leading-relaxed">
              {r.reason}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SeverityDot({ severity }: { severity: Recommendation["severity"] }) {
  const color =
    severity === "high"
      ? "bg-rose-500"
      : severity === "mid"
        ? "bg-amber-500"
        : "bg-brand-sage";
  return <span className={`w-2 h-2 rounded-full ${color}`} aria-hidden />;
}
