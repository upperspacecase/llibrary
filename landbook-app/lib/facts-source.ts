/**
 * Read-only access to the canonical `facts` collection that the v1 pipeline
 * writes. Each dashboard panel route uses this to pull pre-computed data
 * without hitting external APIs at request time.
 *
 * Returns a plain unwrapped shape (no { value, unit, confidence, sourceRef }
 * envelopes); panels that need confidence metadata can derive it from facts'
 * `confidence` field per leaf or from the per-source freshness on the run.
 */

import { getCollection } from "@/lib/db";

interface FactsDoc extends Record<string, unknown> {
  landbookId: string;
  contentHash?: string;
  updatedAt?: string;
  version?: number;
  schemaVersion?: number;
  runId?: string | null;
}

const unwrap = (field: unknown): unknown => {
  if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
    return (field as Record<string, unknown>).value;
  }
  return field ?? null;
};

const unwrapSection = (
  section: Record<string, unknown> | undefined
): Record<string, unknown> => {
  if (!section) return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(section)) {
    out[key] = unwrap(val);
  }
  return out;
};

export async function getFactsDoc(
  landbookId: string
): Promise<FactsDoc | null> {
  const col = await getCollection("facts");
  const doc = (await col.findOne({ landbookId })) as FactsDoc | null;
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as FactsDoc;
}

export async function getFactsSection(
  landbookId: string,
  section: string
): Promise<Record<string, unknown> | null> {
  const doc = await getFactsDoc(landbookId);
  if (!doc) return null;
  const raw = doc[section];
  if (!raw || typeof raw !== "object") return null;
  return unwrapSection(raw as Record<string, unknown>);
}

/**
 * Freshness signal — surfaced on dashboard responses so the UI can show
 * "data captured X minutes ago" or flag staleness.
 */
export function factsFreshness(doc: FactsDoc | null): {
  updatedAt: string | null;
  contentHash: string | null;
  runId: string | null;
} {
  if (!doc) return { updatedAt: null, contentHash: null, runId: null };
  return {
    updatedAt: doc.updatedAt ?? null,
    contentHash: doc.contentHash ?? null,
    runId: doc.runId ?? null,
  };
}
