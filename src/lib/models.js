/**
 * Central Claude model IDs.
 *
 * Keep model IDs here, not inlined at call sites — a retired ID
 * (claude-sonnet-4-20250514 retired 2026-06-15) lingering in some call sites
 * but not others is what previously broke narrative generation.
 */

export const NARRATIVE_MODEL = 'claude-sonnet-4-6';
