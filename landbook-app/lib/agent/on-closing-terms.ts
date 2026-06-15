// PLACEHOLDER — none of this is final legal copy. Replace the text below with
// the reviewed pay-on-closing agreement before enabling it for live agents.

/** Bump when the terms text changes so we can tell which version an agent
 *  accepted (stored on the landbook_payments row as `termsVersion`). */
export const ON_CLOSING_TERMS_VERSION = "on-closing-v0-placeholder";

export const ON_CLOSING_TERMS_TITLE = "Pay-on-Closing Terms";

/** Placeholder paragraphs rendered in the acceptance modal. Not legal text. */
export const ON_CLOSING_TERMS_PLACEHOLDER: string[] = [
  "PLACEHOLDER TERMS — not final. Replace this copy with the reviewed pay-on-closing agreement before enabling it for live agents.",
  "By accepting, you agree that the LandBook fee shown above becomes payable when the property transaction completes (closes).",
  "You authorise LandLibrary to charge the card you add in the next step for that fee on closing.",
  "Full terms, refund conditions, and the closing definition will be set out in the final agreement.",
];
