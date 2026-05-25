"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
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
}

export const MapPanel = forwardRef<MapPanelHandle, MapPanelProps>(
  function MapPanel({ token, onPolygonChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);

    useEffect(() => {
      if (!token || !containerRef.current) return;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
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

      return () => {
        map.remove();
        mapRef.current = null;
        drawRef.current = null;
      };
    }, [token, onPolygonChange]);

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
      <div
        ref={containerRef}
        className="relative min-h-[420px] overflow-hidden rounded-lg border border-brand-sage/30"
      />
    );
  }
);
