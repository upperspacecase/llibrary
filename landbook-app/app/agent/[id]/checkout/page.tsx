import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Field,
  TextInput,
  Icon,
} from "@/components/agent/primitives";
import { Stepper } from "@/components/agent/Stepper";

export const metadata: Metadata = {
  title: "Checkout · Agents",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href="/agent/new">New LandBook</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Payment</span>
          </div>

          <Stepper
            steps={[
              { n: "1", label: "Property", state: "done" },
              { n: "2", label: "Plan", state: "done" },
              { n: "3", label: "Payment", state: "active" },
              { n: "4", label: "Confirm", state: "todo" },
            ]}
          />

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <form className="space-y-8">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
                <SerifTitle className="text-xl">Payment method</SerifTitle>
                <div className="mt-6 space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded border border-brand-charcoal bg-brand-cream/50 p-4">
                    <input
                      type="radio"
                      name="method"
                      defaultChecked
                      className="sr-only"
                    />
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-charcoal">
                      <span className="h-2 w-2 rounded-full bg-brand-charcoal" />
                    </span>
                    <span className="text-sm font-medium">
                      Credit or debit card
                    </span>
                    <span className="ml-auto flex gap-1.5 text-[10px] font-semibold text-brand-charcoal/40">
                      VISA · MC · AMEX
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded border border-brand-sage/40 bg-white p-4">
                    <input type="radio" name="method" className="sr-only" />
                    <span className="h-4 w-4 rounded-full border-2 border-brand-sage/50" />
                    <span className="text-sm">SEPA Direct Debit</span>
                    <span className="ml-auto text-[11px] text-brand-charcoal/40">
                      EUR only
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded border border-brand-sage/40 bg-white p-4">
                    <input type="radio" name="method" className="sr-only" />
                    <span className="h-4 w-4 rounded-full border-2 border-brand-sage/50" />
                    <span className="text-sm">
                      Invoice (Steward &amp; Engine plans)
                    </span>
                    <span className="ml-auto text-[11px] text-brand-charcoal/40">
                      30-day terms
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
                <SerifTitle className="text-xl">Card details</SerifTitle>
                <div className="mt-6 space-y-5">
                  <Field label="Card number">
                    <TextInput placeholder="0000 0000 0000 0000" />
                  </Field>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Expiry">
                      <TextInput placeholder="MM / YY" />
                    </Field>
                    <Field label="CVC">
                      <TextInput placeholder="•••" />
                    </Field>
                    <Field label="ZIP / Postal">
                      <TextInput placeholder="—" />
                    </Field>
                  </div>
                  <Field label="Cardholder name">
                    <TextInput placeholder="Name on card" />
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
                <SerifTitle className="text-xl">Billing</SerifTitle>
                <div className="mt-6 grid grid-cols-2 gap-5">
                  <Field label="Company / Agency">
                    <TextInput placeholder="Agency name" />
                  </Field>
                  <Field label="VAT / Tax ID">
                    <TextInput placeholder="optional" />
                  </Field>
                  <Field label="Billing email">
                    <TextInput placeholder="billing@…" />
                  </Field>
                  <Field label="Country">
                    <TextInput placeholder="—" />
                  </Field>
                </div>
              </div>
            </form>

            <aside className="self-start rounded-lg border border-brand-sage/30 bg-white p-8">
              <Eyebrow>Order summary</Eyebrow>
              <div className="mt-4 flex items-start gap-3 border-b border-brand-sage/20 pb-5">
                <div className="h-12 w-12 rounded bg-brand-forest/10" />
                <div className="min-w-0">
                  <p
                    className="truncate font-serif text-base font-bold leading-tight"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    LandBook #{id}
                  </p>
                  <p className="text-[11px] text-brand-charcoal/55">
                    Property &amp; area not yet set
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-charcoal/70">
                    Natural Capital Report
                  </span>
                  <span className="tabular-nums">—</span>
                </div>
                <div className="flex justify-between text-brand-charcoal/60">
                  <span>VAT</span>
                  <span className="tabular-nums">—</span>
                </div>
              </div>

              <div className="mt-5 flex justify-between border-t border-brand-sage/20 pt-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-charcoal/60">
                  Total due today
                </span>
                <span
                  className="font-serif text-2xl font-bold tabular-nums"
                  style={{ fontFamily: "var(--font-libre), serif" }}
                >
                  —
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <PillButton variant="primary" full icon={<Icon.Lock />}>
                  Pay &amp; submit
                </PillButton>
                <p className="text-center text-[10px] text-brand-charcoal/45">
                  Charged when our team accepts the order. Free if guarantee
                  unmet.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 rounded bg-brand-cream/70 p-3 text-[11px] text-brand-charcoal/70">
                <span className="text-brand-forest">
                  <Icon.Check />
                </span>
                48-hour delivery from order accepted
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
