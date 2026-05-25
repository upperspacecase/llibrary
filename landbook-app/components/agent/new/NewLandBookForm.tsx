"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import area from "@turf/area";
import length from "@turf/length";
import type {
  Feature,
  FeatureCollection,
  LineString,
  Polygon,
  MultiPolygon,
} from "geojson";
import { kml as kmlToGeoJson } from "@tmcw/togeojson";
import {
  Eyebrow,
  PillButton,
  Field,
  TextInput,
  Icon,
} from "@/components/agent/primitives";
import { AddressSearch, type AddressSuggestion } from "./AddressSearch";
import { MapPanel, type MapPanelHandle } from "./MapPanel";
import { createLandbook } from "@/app/agent/new/actions";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function ringFromGeoJson(text: string): number[][] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  return extractFirstPolygonRing(parsed);
}

function ringFromKml(text: string): number[][] | null {
  try {
    const dom = new DOMParser().parseFromString(text, "text/xml");
    const fc = kmlToGeoJson(dom);
    return extractFirstPolygonRing(fc);
  } catch {
    return null;
  }
}

function extractFirstPolygonRing(input: unknown): number[][] | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as { type?: string };

  if (obj.type === "FeatureCollection") {
    const fc = input as FeatureCollection;
    for (const f of fc.features) {
      const ring = extractFirstPolygonRing(f);
      if (ring) return ring;
    }
    return null;
  }

  if (obj.type === "Feature") {
    const f = input as Feature;
    return extractFirstPolygonRing(f.geometry);
  }

  if (obj.type === "Polygon") {
    const poly = input as Polygon;
    return (poly.coordinates?.[0] as number[][]) ?? null;
  }

  if (obj.type === "MultiPolygon") {
    const mp = input as MultiPolygon;
    return (mp.coordinates?.[0]?.[0] as number[][]) ?? null;
  }

  return null;
}

export function NewLandBookForm() {
  const [address, setAddress] = useState("");
  const [boundary, setBoundary] = useState<number[][] | null>(null);
  const [areaOverride, setAreaOverride] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mapRef = useRef<MapPanelHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const metrics = useMemo(() => {
    if (!boundary || boundary.length < 4) return null;
    const ring = boundary;
    const closed =
      ring[0]![0] === ring[ring.length - 1]![0] &&
      ring[0]![1] === ring[ring.length - 1]![1]
        ? ring
        : [...ring, ring[0]!];
    const poly: Feature<Polygon> = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [closed] },
    };
    const ringLine: Feature<LineString> = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: closed },
    };
    return {
      areaHa: area(poly) / 10000,
      perimeterM: length(ringLine, { units: "kilometers" }) * 1000,
    };
  }, [boundary]);

  const vertexCount = boundary ? Math.max(0, boundary.length - 1) : 0;

  function formatArea(ha: number): string {
    if (ha >= 100) return `${ha.toFixed(1)} ha`;
    if (ha >= 1) return `${ha.toFixed(2)} ha`;
    return `${(ha * 10000).toFixed(0)} m²`;
  }

  function formatPerimeter(m: number): string {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  }

  const canSubmit = Boolean(boundary && address.trim().length > 0 && !isPending);

  function handleAddressSelect(s: AddressSuggestion) {
    mapRef.current?.flyTo(s.center[0], s.center[1]);
  }

  function handleDrawClick() {
    if (!MAPBOX_TOKEN) {
      setError("Mapbox token is not configured.");
      return;
    }
    setError(null);
    mapRef.current?.startDrawing();
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const lower = file.name.toLowerCase();
    let ring: number[][] | null = null;
    if (lower.endsWith(".kml")) {
      ring = ringFromKml(text);
    } else {
      ring = ringFromGeoJson(text);
      if (!ring && text.trim().startsWith("<")) {
        ring = ringFromKml(text);
      }
    }
    if (!ring) {
      setError("Could not find a polygon in that file.");
      return;
    }
    setError(null);
    mapRef.current?.setPolygon(ring);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!boundary) {
      setError("Draw or upload a boundary before continuing.");
      return;
    }
    if (!address.trim()) {
      setError("An address is required.");
      return;
    }
    const formEl = formRef.current;
    if (!formEl) return;
    const fd = new FormData(formEl);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) {
      setError("A property title is required.");
      return;
    }
    const overrideHa = areaOverride.trim() ? Number(areaOverride) : NaN;
    const payload = {
      name,
      address: address.trim(),
      cadastralRef: String(fd.get("cadastralRef") ?? ""),
      clientName: String(fd.get("clientName") ?? ""),
      email: String(fd.get("email") ?? ""),
      boundary,
      areaOverrideHa: Number.isFinite(overrideHa) && overrideHa > 0 ? overrideHa : null,
    };
    setError(null);
    startTransition(async () => {
      try {
        await createLandbook(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save LandBook.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr]"
    >
      <div className="space-y-6 rounded-lg border border-brand-sage/30 bg-white p-8">
        <Field label="Property title" hint="Shown as the LandBook name in your dashboard.">
          <TextInput
            name="name"
            placeholder="e.g. Quinta do Vale da Porca"
          />
        </Field>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
            Address or parish
          </span>
          <div className="mt-2">
            <AddressSearch
              value={address}
              onChange={setAddress}
              onSelect={handleAddressSelect}
              token={MAPBOX_TOKEN}
            />
          </div>
        </div>

        <Field label="Cadastral ref. (optional)">
          <TextInput name="cadastralRef" placeholder="—" />
        </Field>

        <div className="grid grid-cols-2 gap-4 rounded border border-brand-sage/30 bg-brand-cream/40 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55">
              Land size (ha)
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={areaOverride}
                onChange={(e) => setAreaOverride(e.target.value)}
                placeholder={metrics ? metrics.areaHa.toFixed(2) : "—"}
                className="w-full border-b border-brand-sage/40 bg-transparent pb-1 font-serif text-lg font-bold tabular-nums text-brand-charcoal outline-none placeholder:font-normal placeholder:text-brand-charcoal/55 focus:border-brand-charcoal"
              />
              <span className="text-[11px] text-brand-charcoal/55">ha</span>
            </div>
            <p className="mt-1 text-[10px] text-brand-charcoal/45">
              {metrics
                ? `Computed ${metrics.areaHa.toFixed(2)} ha — type to override.`
                : "Auto-computed once you draw."}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55">
              Perimeter
            </p>
            <p className="mt-1 font-serif text-lg font-bold text-brand-charcoal tabular-nums">
              {metrics ? formatPerimeter(metrics.perimeterM) : "—"}
            </p>
          </div>
        </div>

        <div className="border-t border-brand-sage/20 pt-6">
          <Eyebrow>Boundary</Eyebrow>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDrawClick}
              className="flex-1 rounded border border-brand-charcoal bg-brand-charcoal px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-cream hover:bg-transparent hover:text-brand-charcoal transition"
            >
              Draw on map
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex-1 rounded border border-brand-sage/40 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70 hover:border-brand-charcoal transition"
            >
              Upload KML / GeoJSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.geojson,.json,application/vnd.google-earth.kml+xml,application/geo+json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="border-t border-brand-sage/20 pt-6">
          <Eyebrow>Client / Seller</Eyebrow>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Field label="Name">
              <TextInput name="clientName" placeholder="Client or seller name" />
            </Field>
            <Field label="Email (for sharing)">
              <TextInput name="email" placeholder="optional" type="email" />
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-[11px] text-brand-terracotta" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60"
          >
            Save draft &amp; close
          </button>
          <PillButton
            variant="primary"
            icon={<Icon.ArrowRight />}
            type="submit"
            disabled={!canSubmit}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Continue to plan"}
          </PillButton>
        </div>
      </div>

      <div className="relative">
        <MapPanel
          ref={mapRef}
          token={MAPBOX_TOKEN}
          onPolygonChange={setBoundary}
          hasPolygon={Boolean(boundary)}
        />
        {boundary && metrics && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-brand-charcoal px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-cream">
            {formatArea(metrics.areaHa)} · {formatPerimeter(metrics.perimeterM)} · {vertexCount} vertices
          </div>
        )}
      </div>
    </form>
  );
}
