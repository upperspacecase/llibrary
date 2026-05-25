"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import area from "@turf/area";
import centroid from "@turf/centroid";
import length from "@turf/length";
import type { Feature, LineString, Polygon } from "geojson";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { Landbook } from "@/lib/types";

export interface CreateLandbookInput {
  name: string;
  address: string;
  cadastralRef: string;
  clientName: string;
  email: string;
  /** Polygon ring as [lng, lat][]; first point should equal last */
  boundary: number[][];
}

function isClosedRing(ring: number[][]): boolean {
  if (ring.length < 4) return false;
  const [fx, fy] = ring[0]!;
  const [lx, ly] = ring[ring.length - 1]!;
  return fx === lx && fy === ly;
}

export async function createLandbook(input: CreateLandbookInput): Promise<void> {
  const user = await requireCurrentUser();

  const trimmedAddress = input.address.trim();
  if (!trimmedAddress) throw new Error("Address is required");

  const ring = input.boundary;
  if (!Array.isArray(ring) || ring.length < 4) {
    throw new Error("Boundary must have at least 3 vertices");
  }
  const closed = isClosedRing(ring) ? ring : [...ring, ring[0]!];

  const polygon: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [closed] },
  };

  const sqMeters = area(polygon);
  const hectares = sqMeters / 10000;
  const ringLine: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: closed },
  };
  const perimeterMeters = length(ringLine, { units: "kilometers" }) * 1000;
  const c = centroid(polygon).geometry.coordinates;

  const id = randomUUID();
  const now = new Date().toISOString();

  const doc: Landbook = {
    id,
    ownerId: user.uid,
    name: input.name.trim() || undefined,
    clientName: input.clientName.trim() || undefined,
    cadastralRef: input.cadastralRef.trim() || undefined,
    boundary: closed,
    center: { lat: c[1]!, lng: c[0]! },
    area: hectares,
    perimeter: perimeterMeters,
    address: trimmedAddress,
    email: input.email.trim() || undefined,
    data: null,
    created: now,
    updated: now,
  };

  const collection = await getCollection<Landbook>("landbooks");
  await collection.insertOne(doc);

  redirect(`/agent/${id}/edit`);
}
