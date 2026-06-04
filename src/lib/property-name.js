/**
 * Resolve the human-facing property name for a landbook/submission doc.
 *
 * The authored title wins — `propertyTitle` from the public submission form,
 * `propertyName` from the agent form. Falls back to the first line of the
 * address (which itself falls back to the postcode upstream), then 'Untitled'.
 */
export function resolvePropertyName(landbook) {
  return (
    landbook.propertyTitle?.trim() ||
    landbook.propertyName?.trim() ||
    landbook.address?.split(',')[0]?.trim() ||
    'Untitled'
  );
}
