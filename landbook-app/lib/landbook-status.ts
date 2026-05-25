import type { Landbook } from "./types";

export type LandbookStatus = "Draft" | "Processing" | "Ready" | "Shared" | "Archived";

/**
 * Compute a status for a landbook based on what's present in the document.
 * Until we add a real status field, this is the best signal we have:
 * - no `data` at all → Draft
 * - `data` present → Ready
 */
export function deriveStatus(book: Landbook): LandbookStatus {
  if (book.data) return "Ready";
  return "Draft";
}

export function bookDisplayName(book: Landbook): string {
  return (
    book.name ||
    book.data?.property?.name ||
    book.address ||
    `LandBook ${book.id.slice(0, 8)}`
  );
}
