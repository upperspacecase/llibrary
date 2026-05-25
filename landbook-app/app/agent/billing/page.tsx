import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
} from "@/components/agent/primitives";

export const metadata: Metadata = {
  title: "Billing · Agents",
};

export default function BillingPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="billing" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Account · Billing</Eyebrow>
          <SerifTitle className="mt-3 text-3xl leading-tight">
            Plan &amp; payments
          </SerifTitle>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <Eyebrow>Current plan</Eyebrow>
                  <p
                    className="mt-3 font-serif text-3xl font-bold text-brand-charcoal"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    No active plan
                  </p>
                  <p className="mt-1 text-[12px] text-brand-charcoal/55">
                    Pick a plan to start creating LandBooks.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-charcoal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-charcoal/40" />
                  Inactive
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                      LandBooks this month
                    </p>
                    <p className="text-sm tabular-nums">0 of —</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-sage/20" />
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                      Priority hours used
                    </p>
                    <p className="text-sm tabular-nums">0</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-sage/20" />
                </div>
              </div>

              <div className="mt-8 flex gap-3 border-t border-brand-sage/20 pt-6">
                <PillButton variant="ghost">Choose a plan</PillButton>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Payment method</Eyebrow>
                <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 p-5 text-center text-[12px] text-brand-charcoal/55">
                  No card on file.
                </div>
                <button
                  type="button"
                  className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                >
                  + Add payment method
                </button>
              </div>
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Billing details</Eyebrow>
                <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 p-5 text-center text-[12px] text-brand-charcoal/55">
                  No billing details on file.
                </div>
                <button
                  type="button"
                  className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                >
                  + Add billing details
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <Eyebrow>Invoice history</Eyebrow>
            <div className="mt-3 rounded-lg border border-brand-sage/30 bg-white py-16 text-center">
              <p className="text-sm text-brand-charcoal/55">
                You don&rsquo;t have any invoices yet.
              </p>
              <p className="mt-1 text-[11px] text-brand-charcoal/45">
                Invoices appear here once you order your first LandBook.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
