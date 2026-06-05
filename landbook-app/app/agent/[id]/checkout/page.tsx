import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Icon,
} from "@/components/agent/primitives";
import { Stepper } from "@/components/agent/Stepper";
import { oneOffSteps } from "@/lib/agent/steps";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { PLANS } from "@/lib/stripe/server";
import type { Landbook, LandbookPayment, Submission } from "@/lib/types";
import { startReportCheckout } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout · Agents",
};

interface LandbookSummary {
  id: string;
  name: string;
  detail: string;
}

async function loadLandbook(
  id: string,
  ownerId: string
): Promise<LandbookSummary | null> {
  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id, ownerId });
  if (book) {
    const area = book.area
      ? `${(book.area / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`
      : null;
    return {
      id,
      name:
        book.name ||
        book.data?.property?.name ||
        book.address ||
        `LandBook #${id.slice(0, 8)}`,
      detail: [book.address, area].filter(Boolean).join(" · ") || "Property details pending",
    };
  }

  const submissions = await getCollection<Submission>("submissions");
  const sub = await submissions.findOne({ id, ownerId });
  if (!sub) return null;
  const area = sub.area
    ? `${(sub.area / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`
    : null;
  return {
    id,
    name:
      sub.propertyName ||
      sub.clientName ||
      sub.address ||
      `LandBook #${id.slice(0, 8)}`,
    detail: [sub.address, area].filter(Boolean).join(" · ") || "Property details pending",
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { id } = await params;
  const { canceled } = await searchParams;
  const user = await getCurrentUser();
  if (!user) notFound();

  const summary = await loadLandbook(id, user.uid);
  if (!summary) notFound();

  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const existingPayment = await payments.findOne({
    landbookId: id,
    ownerId: user.uid,
  });

  const plan = PLANS.report;
  const priceConfigured = Boolean(plan.priceId);

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

          <Stepper steps={oneOffSteps("payment")} />

          {canceled && (
            <div className="mt-6 rounded border border-brand-sage/40 bg-white px-4 py-3 text-[12px] text-brand-charcoal/70">
              Checkout canceled. No charge was made.
            </div>
          )}

          {existingPayment && (
            <div className="mt-6 rounded border border-brand-forest/30 bg-brand-forest/10 px-4 py-3 text-[12px] text-brand-forest">
              This LandBook has already been paid for.{" "}
              <Link
                href={`/agent/${id}/share`}
                className="font-semibold underline"
              >
                Continue to share
              </Link>
              .
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
                <SerifTitle className="text-xl">Payment</SerifTitle>
                <p className="mt-2 text-[13px] leading-relaxed text-brand-charcoal/65">
                  We use Stripe to take payment securely. Click{" "}
                  <span className="font-semibold">Pay &amp; submit</span> below
                  and we&rsquo;ll redirect you to a Stripe-hosted checkout to
                  enter card or SEPA details. You&rsquo;ll return here when
                  it&rsquo;s done.
                </p>
                <ul className="mt-6 space-y-3 text-[13px] text-brand-charcoal/75">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-forest">
                      <Icon.Check />
                    </span>
                    Cards (Visa, Mastercard, AMEX), SEPA Direct Debit, Link.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-forest">
                      <Icon.Check />
                    </span>
                    Receipt and VAT-compliant invoice emailed automatically.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-brand-forest">
                      <Icon.Check />
                    </span>
                    Refunded under the LandBook Guarantee if we don&rsquo;t
                    uncover at least €10,000 in natural capital value.
                  </li>
                </ul>
              </div>
            </div>

            <aside className="self-start rounded-lg border border-brand-sage/30 bg-white p-8">
              <Eyebrow>Order summary</Eyebrow>
              <div className="mt-4 flex items-start gap-3 border-b border-brand-sage/20 pb-5">
                <div className="h-12 w-12 rounded bg-brand-forest/10" />
                <div className="min-w-0">
                  <p
                    className="truncate font-serif text-base font-bold leading-tight"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {summary.name}
                  </p>
                  <p className="text-[11px] text-brand-charcoal/55">
                    {summary.detail}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-charcoal/70">
                    {plan.name}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(plan.amount, plan.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-brand-charcoal/60">
                  <span>VAT</span>
                  <span className="tabular-nums">Calculated at checkout</span>
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
                  {formatCurrency(plan.amount, plan.currency)}
                </span>
              </div>

              <form action={startReportCheckout.bind(null, id)} className="mt-6 space-y-3">
                <PillButton
                  type="submit"
                  variant="primary"
                  full
                  icon={<Icon.Lock />}
                  disabled={!priceConfigured || Boolean(existingPayment)}
                >
                  {existingPayment ? "Already paid" : "Pay & submit"}
                </PillButton>
                {!priceConfigured && (
                  <p className="text-center text-[10px] text-brand-terracotta">
                    {plan.priceEnv} not set. Set this env var to enable
                    checkout.
                  </p>
                )}
                <p className="text-center text-[10px] text-brand-charcoal/45">
                  Charged when our team accepts the order. Free if guarantee
                  unmet.
                </p>
              </form>

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
