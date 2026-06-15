"use client";

import { Eyebrow, PillButton, Icon } from "@/components/agent/primitives";

export function PayOnClosing({
  action,
  amountLabel,
}: {
  /** Bound `startOnClosing` server action — records the commitment, then redirects to Stripe. */
  action: (formData: FormData) => void | Promise<void>;
  amountLabel: string;
}) {
  // Terms are accepted once at onboarding (the LandBook Agent Agreement), so
  // this goes straight to Stripe card setup — no per-book acceptance.
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
        <form action={action}>
          <PillButton type="submit" variant="primary" icon={<Icon.Lock />}>
            Pay when it closes
          </PillButton>
        </form>
      </div>
    </div>
  );
}
