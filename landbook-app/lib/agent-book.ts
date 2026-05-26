import { getCollection } from "@/lib/db";
import type { Landbook, Submission } from "@/lib/types";

/**
 * Lightweight ownership check — returns true if either a landbook or a
 * submission with this id is owned by `ownerId`. Cheaper than
 * `findAgentBook` because we don't deserialize the full doc; ideal for
 * server actions whose only need is "is the caller allowed to mutate?".
 */
export async function assertAgentOwns(
  id: string,
  ownerId: string
): Promise<boolean> {
  const [books, subs] = await Promise.all([
    getCollection<Landbook>("landbooks"),
    getCollection<Submission>("submissions"),
  ]);
  const inBooks = await books.findOne({ id, ownerId }, { projection: { _id: 1 } });
  if (inBooks) return true;
  const inSubs = await subs.findOne({ id, ownerId }, { projection: { _id: 1 } });
  return Boolean(inSubs);
}

/**
 * Mongo update against whichever collection (`landbooks` or `submissions`)
 * currently holds the document. Returns whether something matched. Used by
 * agent server actions when v1's refresh pipeline may have written `data`
 * back to either side.
 */
export async function updateAgentBook(
  id: string,
  ownerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: Record<string, any>
): Promise<boolean> {
  const books = await getCollection<Landbook>("landbooks");
  const r1 = await books.updateOne({ id, ownerId }, update);
  if (r1.matchedCount > 0) return true;
  const subs = await getCollection<Submission>("submissions");
  const r2 = await subs.updateOne({ id, ownerId }, update);
  return r2.matchedCount > 0;
}

/**
 * Find an agent's LandBook by id, owned by `ownerId`.
 *
 * Falls back to the `submissions` collection because v1's refresh pipeline
 * writes `data` back to whichever collection it found the document in.
 * Until a submission is explicitly promoted, the canonical record may live
 * in either place. The shape is compatible enough — both have id, address,
 * boundary, area, ownerId, and (after refresh) data.
 */
export async function findAgentBook(
  id: string,
  ownerId: string
): Promise<Landbook | null> {
  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id, ownerId });
  if (book) return JSON.parse(JSON.stringify(book)) as Landbook;

  const subs = await getCollection<Submission>("submissions");
  const sub = await subs.findOne({ id, ownerId });
  if (!sub) return null;

  const plain = JSON.parse(JSON.stringify(sub)) as Submission & Partial<Landbook>;
  // Normalize submission → Landbook shape for downstream consumers.
  const asBook: Landbook = {
    id: plain.id,
    ownerId: plain.ownerId,
    boundary: plain.boundary,
    center: plain.center ?? { lat: 0, lng: 0 },
    area: plain.area ?? 0,
    perimeter: plain.perimeter ?? 0,
    address: plain.address || plain.postcode || "",
    email: plain.contact || undefined,
    data: plain.data ?? null,
    created: plain.created,
    updated: plain.updated,
    name: plain.propertyName,
    clientName: plain.clientName,
    cadastralRef: plain.cadastralRef,
    agentNotes: plain.agentNotes,
  };
  return asBook;
}
