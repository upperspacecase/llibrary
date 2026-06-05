"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import area from "@turf/area";
import centroid from "@turf/centroid";
import length from "@turf/length";
import type { Feature, LineString, Polygon } from "geojson";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import {
  consumeFreeBook,
  coverWithSubscription,
  getPlanUsage,
  isFreeBookEligible,
} from "@/lib/plan-usage";
import { kickRefreshPipeline } from "@/lib/pipeline";
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
    // Mirror the title under the key the v1 admin/create flow reads, so agent
    // submissions are first-class in admin.html and match the v1 shape.
    propertyTitle: input.name.trim() || undefined,
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

  // Decide what this book costs the agent:
  //  1. Their first book ever is free — submit straight to the pipeline.
  //  2. An active subscription with headroom covers it — no payment.
  //  3. Otherwise it's a paid one-off — send them to the Plan/Payment flow.
  if ((await isFreeBookEligible(user.uid)) && (await consumeFreeBook(user.uid, id))) {
    kickRefreshPipeline(id);
    redirect(`/agent/${id}/submitted`);
  }

  const usage = await getPlanUsage(user.uid);
  const subCovers =
    usage.active &&
    usage.plan != null &&
    (usage.remaining == null || usage.remaining > 0);
  if (subCovers) {
    await coverWithSubscription(user.uid, id, usage);
    kickRefreshPipeline(id);
    redirect(`/agent/${id}/submitted`);
  }

  redirect(`/agent/${id}/plan`);
}
