"use client";

import { useState } from "react";
import { Eyebrow, PillButton, Icon } from "@/components/agent/primitives";
import {
  ON_CLOSING_TERMS_TITLE,
  ON_CLOSING_TERMS_PLACEHOLDER,
} from "@/lib/agent/on-closing-terms";

export function PayOnClosing({
  action,
  amountLabel,
}: {
  /** Bound `startOnClosing` server action — records consent, then redirects to Stripe. */
  action: (formData: FormData) => void | Promise<void>;
  amountLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-brand-forest/30 bg-brand-forest/5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Eyebrow>Pay when it closes</Eyebrow>
          <p
            className="mt-2 font-serif text-2xl font-bold text-brand-charcoal"
            style={{ fontFamily: "var(--font-libre), serif" }}
          >
            {amountLabel}{" "}
            <span className="text-sm font-normal text-brand-charcoal/60">
              on closing
            </span>
          </p>
          <p className="mt-1 max-w-xl text-[12px] text-brand-charcoal/65">
            Get the LandBook now to help win and close the listing. Add a card
            today; we charge the fee when the sale completes.
          </p>
        </div>
        <PillButton
          variant="primary"
          icon={<Icon.ArrowRight />}
          onClick={() => setOpen(true)}
        >
          Pay when it closes
        </PillButton>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl text-brand-forest">
                {ON_CLOSING_TERMS_TITLE}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-brand-charcoal/50 hover:text-brand-forest"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="max-h-[40vh] space-y-3 overflow-y-auto rounded border border-brand-sage/30 bg-brand-cream/40 p-4 text-[12px] leading-relaxed text-brand-charcoal/75">
              {ON_CLOSING_TERMS_PLACEHOLDER.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <label className="mt-4 flex items-start gap-3 text-[13px] text-brand-charcoal/80">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-forest"
              />
              <span>
                I have read and agree to the {ON_CLOSING_TERMS_TITLE}, and
                authorise the fee to be charged on closing.
              </span>
            </label>

            <form
              action={action}
              className="mt-5 flex items-center justify-end gap-3"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-brand-charcoal/60 hover:text-brand-forest"
              >
                Cancel
              </button>
              <PillButton
                type="submit"
                variant="primary"
                icon={<Icon.Lock />}
                disabled={!agreed}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agree &amp; add card
              </PillButton>
            </form>
            <p className="mt-3 text-right text-[11px] text-brand-charcoal/45">
              You&rsquo;ll add your card securely on Stripe. Accepting here is
              your agreement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
