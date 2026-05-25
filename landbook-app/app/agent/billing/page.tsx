import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
} from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { PLANS, planForPriceId, stripe, type PlanId } from "@/lib/stripe/server";
import type { AgentStripe } from "@/lib/types";
import {
  openCustomerPortal,
  startSubscriptionCheckout,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing · Agents",
};

interface BillingData {
  subscription: Stripe.Subscription | null;
  paymentMethod: Stripe.PaymentMethod | null;
  invoices: Stripe.Invoice[];
}

async function loadBilling(customerId: string): Promise<BillingData> {
  const customer = await stripe.customers.retrieve(customerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted) {
    return { subscription: null, paymentMethod: null, invoices: [] };
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
    expand: ["data.items.data.price"],
  });
  const subscription =
    subs.data.find((s) =>
      ["active", "trialing", "past_due", "paused", "unpaid"].includes(s.status)
    ) ?? subs.data[0] ?? null;

  const defaultPm = customer.invoice_settings.default_payment_method;
  const paymentMethod =
    defaultPm && typeof defaultPm !== "string" ? defaultPm : null;

  const invoiceList = await stripe.invoices.list({
    customer: customerId,
    limit: 10,
  });

  return {
    subscription,
    paymentMethod,
    invoices: invoiceList.data,
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): number | null {
  const item = sub.items.data[0];
  return item?.current_period_end ?? null;
}

function statusLabel(status: Stripe.Subscription.Status): {
  label: string;
  dot: string;
} {
  switch (status) {
    case "active":
      return { label: "Active", dot: "bg-brand-forest" };
    case "trialing":
      return { label: "Trialing", dot: "bg-brand-forest" };
    case "past_due":
      return { label: "Past due", dot: "bg-brand-terracotta" };
    case "paused":
      return { label: "Paused", dot: "bg-brand-charcoal/40" };
    case "canceled":
      return { label: "Canceled", dot: "bg-brand-charcoal/40" };
    case "incomplete":
      return { label: "Incomplete", dot: "bg-brand-terracotta" };
    case "incomplete_expired":
      return { label: "Expired", dot: "bg-brand-charcoal/40" };
    case "unpaid":
      return { label: "Unpaid", dot: "bg-brand-terracotta" };
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  let billing: BillingData = {
    subscription: null,
    paymentMethod: null,
    invoices: [],
  };
  if (user) {
    const col = await getCollection<AgentStripe>("agent_stripe");
    const doc = await col.findOne({ ownerId: user.uid });
    if (doc?.stripeCustomerId) {
      billing = await loadBilling(doc.stripeCustomerId);
    }
  }

  const { subscription, paymentMethod, invoices } = billing;
  const activeSub =
    subscription &&
    ["active", "trialing", "past_due", "paused"].includes(subscription.status)
      ? subscription
      : null;
  const planPriceId =
    activeSub?.items.data[0]?.price.id ?? undefined;
  const plan = planForPriceId(planPriceId);
  const status = subscription ? statusLabel(subscription.status) : null;
  const periodEnd = activeSub ? subscriptionPeriodEnd(activeSub) : null;
  const card =
    paymentMethod && paymentMethod.type === "card" ? paymentMethod.card : null;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="billing" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>Account · Billing</Eyebrow>
          <SerifTitle className="mt-3 text-3xl leading-tight">
            Plan &amp; payments
          </SerifTitle>

          {params.subscribed && (
            <div className="mt-4 rounded border border-brand-forest/30 bg-brand-forest/10 px-4 py-3 text-[12px] text-brand-forest">
              Subscription started. Welcome aboard.
            </div>
          )}
          {params.canceled && (
            <div className="mt-4 rounded border border-brand-sage/40 bg-white px-4 py-3 text-[12px] text-brand-charcoal/70">
              Checkout canceled. No charge was made.
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
              <div className="flex items-start justify-between">
                <div>
                  <Eyebrow>Current plan</Eyebrow>
                  <p
                    className="mt-3 font-serif text-3xl font-bold text-brand-charcoal"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {plan?.name ?? "No active plan"}
                  </p>
                  <p className="mt-1 text-[12px] text-brand-charcoal/55">
                    {plan
                      ? plan.description
                      : "Pick a plan to start creating LandBooks."}
                  </p>
                </div>
                <span
                  className={
                    activeSub
                      ? "inline-flex items-center gap-1.5 rounded-full bg-brand-forest/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-forest"
                      : "inline-flex items-center gap-1.5 rounded-full bg-brand-charcoal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/55"
                  }
                >
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (status ? status.dot : "bg-brand-charcoal/40")
                    }
                  />
                  {status?.label ?? "Inactive"}
                </span>
              </div>

              {activeSub && plan ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-baseline justify-between border-b border-brand-sage/20 pb-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                      Price
                    </p>
                    <p className="text-sm tabular-nums">
                      {formatCurrency(plan.amount * 100, plan.currency)}
                      {plan.billingCycle ?? ""}
                    </p>
                  </div>
                  {periodEnd && (
                    <div className="flex items-baseline justify-between border-b border-brand-sage/20 pb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                        {activeSub.cancel_at_period_end
                          ? "Cancels on"
                          : "Renews on"}
                      </p>
                      <p className="text-sm tabular-nums">
                        {formatDate(periodEnd)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {(["report", "steward", "engine"] as PlanId[]).map((id) => {
                    const p = PLANS[id];
                    return (
                      <div
                        key={id}
                        className="rounded border border-brand-sage/30 bg-brand-cream/40 p-4"
                      >
                        <p
                          className="font-serif text-base font-bold leading-tight text-brand-charcoal"
                          style={{ fontFamily: "var(--font-libre), serif" }}
                        >
                          {p.name}
                        </p>
                        <p className="mt-1 text-[11px] text-brand-charcoal/55">
                          {formatCurrency(p.amount * 100, p.currency)}
                          {p.billingCycle ?? " · one-off"}
                        </p>
                        {p.mode === "subscription" ? (
                          <form action={startSubscriptionCheckout.bind(null, id)}>
                            <button
                              type="submit"
                              disabled={!p.priceId}
                              className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline disabled:cursor-not-allowed disabled:text-brand-charcoal/40"
                            >
                              {p.priceId ? "Choose plan" : "Price not configured"}
                            </button>
                          </form>
                        ) : (
                          <Link
                            href="/agent/new"
                            className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                          >
                            Order single report
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 flex gap-3 border-t border-brand-sage/20 pt-6">
                {activeSub ? (
                  <form action={openCustomerPortal}>
                    <PillButton type="submit" variant="ghost">
                      Manage subscription
                    </PillButton>
                  </form>
                ) : null}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Payment method</Eyebrow>
                {card ? (
                  <div className="mt-4 rounded border border-brand-sage/30 bg-brand-cream/40 p-5">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal">
                      {card.brand} ···· {card.last4}
                    </p>
                    <p className="mt-1 text-[11px] text-brand-charcoal/55">
                      Expires {String(card.exp_month).padStart(2, "0")}/
                      {String(card.exp_year).slice(-2)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 p-5 text-center text-[12px] text-brand-charcoal/55">
                    No card on file.
                  </div>
                )}
                {activeSub && (
                  <form action={openCustomerPortal} className="mt-3">
                    <button
                      type="submit"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                    >
                      {card ? "Update payment method" : "+ Add payment method"}
                    </button>
                  </form>
                )}
              </div>
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Billing details</Eyebrow>
                <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 p-5 text-center text-[12px] text-brand-charcoal/55">
                  {activeSub
                    ? "Managed in Stripe."
                    : "No billing details on file."}
                </div>
                {activeSub && (
                  <form action={openCustomerPortal} className="mt-3">
                    <button
                      type="submit"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                    >
                      Edit billing details
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <Eyebrow>Invoice history</Eyebrow>
            {invoices.length === 0 ? (
              <div className="mt-3 rounded-lg border border-brand-sage/30 bg-white py-16 text-center">
                <p className="text-sm text-brand-charcoal/55">
                  You don&rsquo;t have any invoices yet.
                </p>
                <p className="mt-1 text-[11px] text-brand-charcoal/45">
                  Invoices appear here once you order your first LandBook.
                </p>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-brand-sage/30 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-sage/20 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55">
                      <th className="px-5 py-3">Number</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className="border-b border-brand-sage/10 last:border-b-0"
                      >
                        <td className="px-5 py-3 font-mono text-[11px] text-brand-charcoal/70">
                          {inv.number ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-brand-charcoal/70">
                          {formatDate(inv.created)}
                        </td>
                        <td className="px-5 py-3 text-[11px] uppercase tracking-[0.1em] text-brand-charcoal/70">
                          {inv.status ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:underline"
                            >
                              View
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
