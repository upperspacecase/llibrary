"use client";

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapPanelHandle {
  flyTo: (lng: number, lat: number) => void;
  startDrawing: () => void;
  setPolygon: (ring: number[][]) => void;
  clear: () => void;
}

export interface MapPanelProps {
  token: string | undefined;
  onPolygonChange: (ring: number[][] | null) => void;
}

const STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
} as const;
type StyleKey = keyof typeof STYLES;

// Region default, matching landlibrary.co/create (Odemira, Portugal).
const REGION_CENTER: [number, number] = [-8.64, 37.5967];
const REGION_ZOOM = 10;

// Brand-coloured draw layers — landlibrary.co/create uses yellow; we keep the
// same point-by-point UX but in agent/new's palette (cream vertices/lines pop
// on satellite, forest fill).
const COLORS = {
  point: "#F5F1E8",
  pointStroke: "#2C2C2C",
  firstStroke: "#1B3A2F",
  line: "#F5F1E8",
  fill: "#1B3A2F",
  outline: "#F5F1E8",
} as const;

const SRC = { points: "draw-points", first: "first-point", line: "draw-line", poly: "draw-polygon" } as const;
const LYR = {
  points: "draw-points-layer",
  first: "first-point-layer",
  line: "draw-line-layer",
  fill: "draw-polygon-fill",
  outline: "draw-polygon-line",
} as const;

const INSTRUCTIONS = {
  start: "Search a location, then click the map to start drawing your boundary.",
  keep: "Keep clicking to add points.",
  close: "Click near the first point to close the boundary.",
  set: "Boundary set — fill in the details to continue.",
} as const;
type Instruction = keyof typeof INSTRUCTIONS;

const emptyFC = (): FeatureCollection => ({ type: "FeatureCollection", features: [] });
const pointsFC = (pts: number[][]): FeatureCollection => ({
  type: "FeatureCollection",
  features: pts.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } })),
});
const lineFeature = (pts: number[][]): Feature<LineString> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: pts },
});
const polyFeature = (ring: number[][]): Feature<Polygon> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates: [ring] },
});
function isClosedRing(ring: number[][]): boolean {
  if (ring.length < 4) return false;
  const a = ring[0]!;
  const b = ring[ring.length - 1]!;
  return a[0] === b[0] && a[1] === b[1];
}

export const MapPanel = forwardRef<MapPanelHandle, MapPanelProps>(
  function MapPanel({ token, onPolygonChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const pointsRef = useRef<number[][]>([]); // open [lng,lat][] (no closing dupe)
    const closedRef = useRef(false);
    const apiRef = useRef<MapPanelHandle | null>(null);
    const [style, setStyleKey] = useState<StyleKey>("satellite");
    const [instruction, setInstruction] = useState<Instruction>("start");
    const [hasPoints, setHasPoints] = useState(false);

    useEffect(() => {
      if (!token || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLES.satellite,
        center: REGION_CENTER,
        zoom: REGION_ZOOM,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const setData = (id: string, data: Feature | FeatureCollection) => {
        const src = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
        src?.setData(data);
      };
      const setVis = (ids: string[], v: "visible" | "none") =>
        ids.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", v));

      function emit() {
        const pts = pointsRef.current;
        if (closedRef.current && pts.length >= 3) onPolygonChange([...pts, pts[0]!]);
        else onPolygonChange(null);
      }

      function redraw() {
        const pts = pointsRef.current;
        setData(SRC.line, lineFeature(pts));
        setData(SRC.points, pointsFC(pts.slice(1)));
        setData(SRC.first, pts.length ? pointsFC([pts[0]!]) : emptyFC());
        if (closedRef.current && pts.length >= 3) {
          setData(SRC.poly, polyFeature([...pts, pts[0]!]));
          setVis([LYR.fill, LYR.outline], "visible");
          setVis([LYR.points, LYR.first, LYR.line], "none");
        } else {
          setVis([LYR.fill, LYR.outline], "none");
          setVis([LYR.points, LYR.first, LYR.line], "visible");
        }
      }

      function addLayers() {
        if (map.getSource(SRC.points)) {
          redraw();
          return;
        }
        map.addSource(SRC.points, { type: "geojson", data: emptyFC() });
        map.addLayer({
          id: LYR.points,
          type: "circle",
          source: SRC.points,
          paint: { "circle-radius": 6, "circle-color": COLORS.point, "circle-stroke-color": COLORS.pointStroke, "circle-stroke-width": 2 },
        });
        map.addSource(SRC.first, { type: "geojson", data: emptyFC() });
        map.addLayer({
          id: LYR.first,
          type: "circle",
          source: SRC.first,
          paint: { "circle-radius": 8, "circle-color": COLORS.point, "circle-stroke-color": COLORS.firstStroke, "circle-stroke-width": 2 },
        });
        map.addSource(SRC.line, { type: "geojson", data: lineFeature([]) });
        map.addLayer({
          id: LYR.line,
          type: "line",
          source: SRC.line,
          paint: { "line-color": COLORS.line, "line-width": 2, "line-dasharray": [6, 4] },
        });
        map.addSource(SRC.poly, { type: "geojson", data: polyFeature([]) });
        map.addLayer({ id: LYR.fill, type: "fill", source: SRC.poly, paint: { "fill-color": COLORS.fill, "fill-opacity": 0.25 }, layout: { visibility: "none" } });
        map.addLayer({ id: LYR.outline, type: "line", source: SRC.poly, paint: { "line-color": COLORS.outline, "line-width": 2.5 }, layout: { visibility: "none" } });
        redraw();
      }

      function fitToPoints() {
        const pts = pointsRef.current;
        if (pts.length < 2) return;
        const lngs = pts.map((c) => c[0]!);
        const lats = pts.map((c) => c[1]!);
        map.fitBounds(
          [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
          { padding: 80, maxZoom: 16, duration: 700 }
        );
      }

      function addPoint(lng: number, lat: number) {
        pointsRef.current = [...pointsRef.current, [lng, lat]];
        setHasPoints(true);
        setInstruction(pointsRef.current.length < 3 ? "keep" : "close");
        redraw();
      }

      function closePolygon() {
        if (pointsRef.current.length < 3) return;
        closedRef.current = true;
        setInstruction("set");
        redraw();
        fitToPoints();
        emit();
      }

      function clearAll() {
        pointsRef.current = [];
        closedRef.current = false;
        setHasPoints(false);
        setInstruction("start");
        redraw();
        onPolygonChange(null);
      }

      function setPolygonRing(ring: number[][]) {
        if (ring.length < 3) return;
        pointsRef.current = isClosedRing(ring) ? ring.slice(0, -1) : ring;
        closedRef.current = true;
        setHasPoints(true);
        setInstruction("set");
        redraw();
        fitToPoints();
        emit();
      }

      map.on("style.load", addLayers);

      map.on("click", (e) => {
        if (closedRef.current) return;
        const pts = pointsRef.current;
        if (pts.length >= 3) {
          const firstPx = map.project(pts[0] as [number, number]);
          const d = Math.hypot(firstPx.x - e.point.x, firstPx.y - e.point.y);
          if (d <= 20) {
            closePolygon();
            return;
          }
        }
        addPoint(e.lngLat.lng, e.lngLat.lat);
      });

      map.on("mousemove", (e) => {
        const canvas = map.getCanvas();
        if (closedRef.current) {
          canvas.style.cursor = "";
          return;
        }
        const pts = pointsRef.current;
        if (pts.length >= 3) {
          const firstPx = map.project(pts[0] as [number, number]);
          const near = Math.hypot(firstPx.x - e.point.x, firstPx.y - e.point.y) <= 20;
          canvas.style.cursor = near ? "pointer" : "crosshair";
        } else {
          canvas.style.cursor = pts.length > 0 ? "crosshair" : "";
        }
      });

      apiRef.current = {
        flyTo: (lng, lat) => map.flyTo({ center: [lng, lat], zoom: 14, essential: true }),
        startDrawing: clearAll,
        setPolygon: setPolygonRing,
        clear: clearAll,
      };

      return () => {
        map.remove();
        mapRef.current = null;
        apiRef.current = null;
      };
    }, [token, onPolygonChange]);

    // Switch basemap without remounting; style.load re-adds the draw layers.
    useEffect(() => {
      mapRef.current?.setStyle(STYLES[style]);
    }, [style]);

    useImperativeHandle(ref, () => ({
      flyTo: (lng, lat) => apiRef.current?.flyTo(lng, lat),
      startDrawing: () => apiRef.current?.startDrawing(),
      setPolygon: (ring) => apiRef.current?.setPolygon(ring),
      clear: () => apiRef.current?.clear(),
    }), []);

    if (!token) {
      return (
        <div className="relative flex h-full min-h-[420px] items-center justify-center bg-brand-forest px-6 text-center text-brand-cream/85">
          <p className="max-w-xs text-sm leading-snug">
            Mapbox token is not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the
            interactive map.
          </p>
        </div>
      );
    }

    return (
      <div className="relative h-full w-full">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />

        {/* Instruction pill — top centre */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-4">
          <span className="rounded-full bg-white/95 px-5 py-2.5 text-center text-[13px] font-medium text-brand-charcoal shadow-lg backdrop-blur">
            {INSTRUCTIONS[instruction]}
          </span>
        </div>

        {/* Reset — below the instruction once drawing has started */}
        {hasPoints && (
          <div className="absolute inset-x-0 top-[68px] z-10 flex justify-center px-4">
            <button
              type="button"
              onClick={() => apiRef.current?.clear()}
              className="pointer-events-auto rounded-full bg-brand-charcoal px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-cream shadow-lg transition hover:bg-brand-charcoal/85"
            >
              Reset boundary
            </button>
          </div>
        )}

        {/* Style toggle — top left (clear of the nav control) */}
        <div
          role="group"
          aria-label="Map style"
          className="absolute left-3 top-3 z-10 flex overflow-hidden rounded-full bg-brand-charcoal/85 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-cream/75 shadow backdrop-blur"
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
    );
  }
);
