"use client";

import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Feature, Polygon } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

export interface MapPanelHandle {
  flyTo: (lng: number, lat: number) => void;
  startDrawing: () => void;
  setPolygon: (ring: number[][]) => void;
  clear: () => void;
}

export interface MapPanelProps {
  token: string | undefined;
  onPolygonChange: (ring: number[][] | null) => void;
  hasPolygon: boolean;
}

const STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
} as const;
type StyleKey = keyof typeof STYLES;

export const MapPanel = forwardRef<MapPanelHandle, MapPanelProps>(
  function MapPanel({ token, onPolygonChange, hasPolygon }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);
    const [style, setStyleKey] = useState<StyleKey>("satellite");

    useEffect(() => {
      if (!token || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLES.satellite,
        center: [0, 20],
        zoom: 1.5,
      });
      mapRef.current = map;

      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
      });
      drawRef.current = draw;
      map.addControl(draw);

      const emitPolygon = () => {
        const fc = draw.getAll();
        const firstPolygon = fc.features.find(
          (f): f is Feature<Polygon> =>
            f.geometry?.type === "Polygon" &&
            Array.isArray((f.geometry as Polygon).coordinates?.[0]) &&
            ((f.geometry as Polygon).coordinates?.[0]?.length ?? 0) >= 4
        );
        if (!firstPolygon) {
          onPolygonChange(null);
          return;
        }
        onPolygonChange(firstPolygon.geometry.coordinates[0]!);
      };

      map.on("draw.create", emitPolygon);
      map.on("draw.update", emitPolygon);
      map.on("draw.delete", emitPolygon);

      // Let agents draw by clicking the map straight away (like the create
      // page) without first pressing a button.
      map.once("load", () => {
        if (draw.getAll().features.length === 0) {
          try {
            draw.changeMode("draw_polygon");
          } catch {
            // draw not ready — the "Draw on map" button is the fallback
          }
        }
      });

      return () => {
        map.remove();
        mapRef.current = null;
        drawRef.current = null;
      };
    }, [token, onPolygonChange]);

    // Switch basemap style without remounting the map; reattach the draw
    // control + features once the new style finishes loading.
    useEffect(() => {
      const map = mapRef.current;
      const draw = drawRef.current;
      if (!map || !draw) return;
      const saved = draw.getAll();
      try {
        map.removeControl(draw);
      } catch {
        // not attached — ignore
      }
      map.setStyle(STYLES[style]);
      const onLoad = () => {
        map.addControl(draw);
        if (saved.features.length) draw.set(saved);
      };
      map.once("styledata", onLoad);
    }, [style]);

    useImperativeHandle(ref, () => ({
      flyTo(lng, lat) {
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, essential: true });
      },
      startDrawing() {
        if (!drawRef.current) return;
        drawRef.current.deleteAll();
        drawRef.current.changeMode("draw_polygon");
        onPolygonChange(null);
      },
      setPolygon(ring) {
        const draw = drawRef.current;
        const map = mapRef.current;
        if (!draw || !map) return;
        if (ring.length < 4) return;
        const closed =
          ring[0]![0] === ring[ring.length - 1]![0] &&
          ring[0]![1] === ring[ring.length - 1]![1]
            ? ring
            : [...ring, ring[0]!];
        draw.deleteAll();
        const feature: Feature<Polygon> = {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [closed] },
        };
        draw.add(feature);
        onPolygonChange(closed);
        const lngs = closed.map((c) => c[0]!);
        const lats = closed.map((c) => c[1]!);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        );
        map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 800 });
      },
      clear() {
        drawRef.current?.deleteAll();
        onPolygonChange(null);
      },
    }));

    function resetBoundary() {
      drawRef.current?.deleteAll();
      onPolygonChange(null);
      // Re-arm drawing so the agent can immediately draw a new boundary.
      try {
        drawRef.current?.changeMode("draw_polygon");
      } catch {
        // ignore
      }
    }

    if (!token) {
      return (
        <div className="relative flex min-h-[420px] items-center justify-center rounded-lg border border-brand-sage/30 bg-brand-forest px-6 text-center text-brand-cream/85">
          <p className="max-w-xs text-sm leading-snug">
            Mapbox token is not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable
            the interactive map.
          </p>
        </div>
      );
    }

    return (
      <div className="relative">
        <div
          ref={containerRef}
          className="relative min-h-[460px] overflow-hidden rounded-lg border border-brand-sage/30 lg:min-h-[680px]"
        />
        {!hasPolygon && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
            <span className="rounded-full bg-brand-charcoal/85 px-4 py-1.5 text-center text-[11px] font-medium text-brand-cream shadow backdrop-blur">
              Click the map to drop points and draw your boundary
            </span>
          </div>
        )}
        {/* Top map controls */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
          <div className="pointer-events-auto">
            {hasPolygon && (
              <button
                type="button"
                onClick={resetBoundary}
                className="rounded-full bg-brand-charcoal/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-cream shadow backdrop-blur transition hover:bg-brand-charcoal"
              >
                Reset boundary
              </button>
            )}
          </div>
          <div
            role="group"
            aria-label="Map style"
            className="pointer-events-auto flex overflow-hidden rounded-full bg-brand-charcoal/85 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-cream/75 shadow backdrop-blur"
          >
            {(["satellite", "terrain"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStyleKey(key)}
                aria-pressed={style === key}
                className={
                  style === key
                    ? "bg-brand-cream px-3 py-1.5 text-brand-charcoal"
                    : "px-3 py-1.5 transition hover:text-brand-cream"
                }
              >
                {key === "satellite" ? "Satellite" : "Terrain"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
