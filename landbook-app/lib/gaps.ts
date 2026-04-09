/**
 * Gap-aware field resolution for the fact ontology.
 *
 * Components can use resolveField() to get value + confidence metadata,
 * enabling "Data needed" CTAs for missing fields instead of em-dashes.
 */

import type { FactField } from "./types";

export interface ResolvedField<T = unknown> {
  value: T | null;
  isMissing: boolean;
  confidence: "high" | "medium" | "low" | "missing";
  source: string | null;
  reason?: string;
}

/**
 * Resolve a fact field into a value + metadata tuple.
 * Works with both FactField objects and plain values (for backward compat).
 */
export function resolveField<T>(
  field: FactField<T> | T | undefined | null
): ResolvedField<T> {
  // If it's a FactField (has .value and .confidence)
  if (
    field != null &&
    typeof field === "object" &&
    "value" in (field as Record<string, unknown>) &&
    "confidence" in (field as Record<string, unknown>)
  ) {
    const f = field as FactField<T>;
    return {
      value: f.value,
      isMissing: f.confidence === "missing" || f.value == null,
      confidence: f.confidence,
      source: f.sourceRef,
      reason: f.reason,
    };
  }

  // Plain value (backward compat with ReportData)
  const val = field as T | undefined | null;
  return {
    value: val ?? null,
    isMissing: val == null || val === "",
    confidence: val != null && val !== "" ? "high" : "missing",
    source: null,
  };
}

/**
 * Format a field value for display, returning "—" for missing values.
 * Use this as a drop-in replacement for the `v == null ? "—" : v` pattern.
 */
export function displayValue(
  field: FactField | unknown,
  formatter?: (v: unknown) => string
): string {
  const resolved = resolveField(field);
  if (resolved.isMissing) return "—";
  if (formatter) return formatter(resolved.value);
  return String(resolved.value);
}

/**
 * Check if a fact field has data (not missing).
 */
export function hasData(field: FactField | unknown): boolean {
  return !resolveField(field).isMissing;
}

/**
 * Get a confidence badge label for display.
 */
export function confidenceLabel(
  field: FactField | unknown
): string {
  const resolved = resolveField(field);
  switch (resolved.confidence) {
    case "high":
      return "Verified";
    case "medium":
      return "Estimated";
    case "low":
      return "Approximate";
    case "missing":
      return "Data needed";
    default:
      return "";
  }
}
