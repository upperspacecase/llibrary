"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import area from "@turf/area";
import centroid from "@turf/centroid";
import length from "@turf/length";
import type { Feature, LineString, Polygon } from "geojson";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { Submission } from "@/lib/types";

export interface CreateLandbookInput {
  name: string;
  address: string;
  cadastralRef: string;
  clientName: string;
  email: string;
  /** Polygon ring as [lng, lat][]; first point should equal last */
  boundary: number[][];
  /** Hectares, overrides the computed area when provided */
  areaOverrideHa: number | null;
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

  // Match v1 store.js semantics: area in m², perimeter in m, center {lat,lng}.
  // boundary stored as [lat, lng][] (v1's convention) so the submissions
  // pipeline downstream doesn't need to flip coordinates.
  const computedSqMeters = area(polygon);
  const ringLine: Feature<LineString> = {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: closed },
  };
  const perimeterMeters = length(ringLine, { units: "kilometers" }) * 1000;
  const [cx, cy] = centroid(polygon).geometry.coordinates;
  const boundaryLatLng: number[][] = closed.slice(0, -1).map(([lng, lat]) => [lat!, lng!]);

  // Honor the agent's manual size override when present. Stored area is in
  // m²; override input is in ha. Always keep the computed value in
  // `areaComputed` so we can show "agent set X, computed Y" downstream.
  const overrideHa = input.areaOverrideHa;
  const finalSqMeters =
    overrideHa != null && Number.isFinite(overrideHa) && overrideHa > 0
      ? overrideHa * 10000
      : computedSqMeters;

  const id = randomUUID();
  const now = new Date().toISOString();
  const email = (input.email || user.email || "").trim().toLowerCase();

  const doc: Submission = {
    id,
    ownerId: user.uid,
    boundary: boundaryLatLng,
    center: { lat: cy!, lng: cx! },
    area: finalSqMeters,
    areaComputed: computedSqMeters,
    areaOverride: overrideHa ?? null,
    perimeter: perimeterMeters,
    postcode: trimmedAddress,
    address: trimmedAddress,
    name: input.clientName.trim() || user.email || "",
    contactMethod: "email",
    contact: email,
    propertyName: input.name.trim() || undefined,
    clientName: input.clientName.trim() || undefined,
    cadastralRef: input.cadastralRef.trim() || undefined,
    files: [],
    created: now,
  };

  const submissions = await getCollection<Submission>("submissions");
  await submissions.insertOne(doc);

  if (email) {
    const waitlist = await getCollection("waitlist");
    await waitlist.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          postcode: trimmedAddress,
          location: null,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  // Don't kick the pipeline yet — that happens after the agent picks a
  // plan (subscription coverage) or pays (one-off Checkout). Move on to
  // the Plan step.
  redirect(`/agent/${id}/plan`);
}
