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
import { LocationFinder, type LocationResult } from "./LocationFinder";
import { MapPanel, type MapPanelHandle } from "./MapPanel";
import { createLandbook, type CreateLandbookInput } from "@/app/agent/new/actions";

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
  const [areaModal, setAreaModal] = useState<null | "small" | "large">(null);
  const [isPending, startTransition] = useTransition();

  const pendingPayload = useRef<CreateLandbookInput | null>(null);
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

  function formatPerimeter(m: number): string {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${Math.round(m)} m`;
  }

  const canSubmit = Boolean(boundary && address.trim().length > 0 && !isPending);

  function handleAddressSelect(s: LocationResult) {
    mapRef.current?.flyTo(s.center[0], s.center[1]);
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

  function doSubmit(payload: CreateLandbookInput) {
    setAreaModal(null);
    setError(null);
    startTransition(async () => {
      try {
        await createLandbook(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save LandBook.");
      }
    });
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
    const finalOverride =
      Number.isFinite(overrideHa) && overrideHa > 0 ? overrideHa : null;
    const payload: CreateLandbookInput = {
      name,
      address: address.trim(),
      cadastralRef: String(fd.get("cadastralRef") ?? ""),
      clientName: String(fd.get("clientName") ?? ""),
      email: String(fd.get("email") ?? ""),
      boundary,
      areaOverrideHa: finalOverride,
    };
    setError(null);

    // Informational area gates — these inform but don't reject (the agent can
    // continue, or request a custom quote for very large parcels).
    const effectiveHa = finalOverride ?? metrics?.areaHa ?? null;
    if (effectiveHa != null && effectiveHa < 4) {
      pendingPayload.current = payload;
      setAreaModal("small");
      return;
    }
    if (effectiveHa != null && effectiveHa > 250) {
      pendingPayload.current = payload;
      setAreaModal("large");
      return;
    }
    doSubmit(payload);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_minmax(380px,460px)]"
    >
      {/* Map pane — left, dominant */}
      <div className="relative order-1 h-[55vh] min-h-[320px] lg:order-none lg:h-auto lg:min-h-0">
        <MapPanel
          ref={mapRef}
          token={MAPBOX_TOKEN}
          onPolygonChange={setBoundary}
        />
      </div>

      {/* Sidebar — right, scrolls independently on desktop */}
      <aside className="order-2 flex flex-col border-t border-brand-sage/20 bg-white lg:order-none lg:max-h-full lg:overflow-y-auto lg:border-l lg:border-t-0">
        <div className="flex-1 space-y-6 p-6 sm:p-8">
          <div>
            <Eyebrow>New LandBook</Eyebrow>
            <h2 className="serif-title mt-2 text-2xl leading-tight text-brand-charcoal">
              Tell us about the property.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-brand-charcoal/60">
              Search the location or use your position, then click the map to draw
              the boundary.
            </p>
          </div>

          <Field label="Property title" hint="Shown as the LandBook name in your dashboard.">
            <TextInput name="name" placeholder="e.g. Quinta do Vale da Porca" />
          </Field>

          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
              Postcode / Location
            </span>
            <div className="mt-2">
              <LocationFinder
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

          {/* Boundary result — area + perimeter + override */}
          <div className="rounded border border-brand-sage/30 bg-brand-cream/40 p-4">
            <div className="grid grid-cols-2 gap-4">
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
                <p className="mt-1 font-serif text-lg font-bold tabular-nums text-brand-charcoal">
                  {metrics ? formatPerimeter(metrics.perimeterM) : "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 border-t border-brand-sage/20 pt-4">
              <button
                type="button"
                onClick={handleUploadClick}
                className="w-full rounded border border-brand-sage/40 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70 transition hover:border-brand-charcoal"
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
        </div>

        {/* Footer — sticky-feeling submit bar */}
        <div className="border-t border-brand-sage/20 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
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
              {isPending ? "Saving…" : "Save & continue"}
            </PillButton>
          </div>
          <p className="mt-3 text-[10px] text-brand-charcoal/45">
            Your data stays private.
          </p>
        </div>
      </aside>

      {areaModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setAreaModal(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {areaModal === "small" ? (
              <>
                <h3 className="font-serif text-xl text-brand-forest">
                  Small parcel
                </h3>
                <p className="mt-3 text-sm text-brand-charcoal/70">
                  We only assess land parcels bigger than 4&nbsp;ha. You can
                  still submit this one, but some natural-capital layers may be
                  limited.
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAreaModal(null)}
                    className="px-4 py-2 text-sm text-brand-charcoal/60 hover:text-brand-forest"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = pendingPayload.current;
                      if (p) doSubmit(p);
                    }}
                    className="rounded-full bg-brand-charcoal px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream"
                  >
                    Submit anyway
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-serif text-xl text-brand-forest">
                  Large parcel
                </h3>
                <p className="mt-3 text-sm text-brand-charcoal/70">
                  LandBook assesses land up to 250&nbsp;ha. For anything larger
                  we provide a custom quote. Would you like to submit this land
                  for a quote?
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAreaModal(null)}
                    className="px-4 py-2 text-sm text-brand-charcoal/60 hover:text-brand-forest"
                  >
                    Cancel
                  </button>
                  <a
                    href="mailto:hi@landlibrary.co?subject=Custom%20quote%20%E2%80%94%20parcel%20over%20250ha"
                    className="rounded-full border border-brand-charcoal px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-charcoal transition hover:bg-brand-charcoal hover:text-brand-cream"
                  >
                    Request a quote
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const p = pendingPayload.current;
                      if (p) doSubmit(p);
                    }}
                    className="rounded-full bg-brand-charcoal px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream"
                  >
                    Submit anyway
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
