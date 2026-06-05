import "server-only";
import { getCollection } from "@/lib/db";
import { PLANS, planForPriceId, stripe, type PlanConfig } from "@/lib/stripe/server";
import type { AgentStripe, LandbookPayment } from "@/lib/types";

export interface PlanUsage {
  /** Active subscription plan, if any. */
  plan: PlanConfig | null;
  /** True if the subscription is in a usable state (active/trialing). */
  active: boolean;
  /** LandBooks this user covered with the subscription this calendar month. */
  usedThisMonth: number;
  /** Allowance for this calendar month. `null` = unlimited. */
  allowance: number | null;
  /** Remaining headroom. `null` = unlimited; 0 means cap hit. */
  remaining: number | null;
}

function monthStart(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Loads an agent's active subscription state from Stripe + counts how
 * many LandBooks they've covered with it this calendar month. The "covered"
 * count comes from `landbook_payments` rows with source="subscription".
 *
 * Returns a `plan: null` shape when the agent has no active subscription
 * — callers should fall back to the plan-selection grid.
 */
export async function getPlanUsage(ownerId: string): Promise<PlanUsage> {
  const empty: PlanUsage = {
    plan: null,
    active: false,
    usedThisMonth: 0,
    allowance: null,
    remaining: null,
  };

  const stripeCol = await getCollection<AgentStripe>("agent_stripe");
  const doc = await stripeCol.findOne({ ownerId });
  if (!doc?.stripeCustomerId) return empty;

  let priceId: string | undefined;
  let active = false;
  try {
    const subs = await stripe.subscriptions.list({
      customer: doc.stripeCustomerId,
      status: "all",
      limit: 1,
      expand: ["data.items.data.price"],
    });
    const sub = subs.data[0];
    if (sub) {
      active = ["active", "trialing"].includes(sub.status);
      priceId = sub.items.data[0]?.price.id;
    }
  } catch {
    // Stale customer id (test/live mismatch, deleted in Stripe, etc.) —
    // treat as no active subscription. The billing page handles cleanup.
    return empty;
  }

  const plan = planForPriceId(priceId);
  if (!plan || plan.mode !== "subscription") return empty;

  // Count this-month subscription-covered LandBooks.
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const cutoff = monthStart().toISOString();
  const used = await payments.countDocuments({
    ownerId,
    source: "subscription",
    paidAt: { $gte: cutoff },
  });

  const allowance = plan.monthlyAllowance;
  const remaining =
    allowance == null ? null : Math.max(0, allowance - used);

  return {
    plan,
    active,
    usedThisMonth: used,
    allowance,
    remaining,
  };
}

/** Count of complimentary (free) LandBooks issued this calendar month. */
export async function freeLandbooksThisMonth(): Promise<number> {
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  return payments.countDocuments({
    source: "free",
    paidAt: { $gte: monthStart().toISOString() },
  });
}

/** True when the agent has never consumed their complimentary first book. */
export async function isFreeBookEligible(ownerId: string): Promise<boolean> {
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const used = await payments.countDocuments({ ownerId, source: "free" });
  return used === 0;
}

/**
 * Claim the agent's one complimentary first book. Upsert keyed on
 * (ownerId, source:"free") so two near-simultaneous first books can't both
 * burn the credit. Returns true only when THIS call actually claimed it —
 * the loser of a race gets false and should fall through to paid coverage.
 */
export async function consumeFreeBook(
  ownerId: string,
  landbookId: string
): Promise<boolean> {
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  // ownerId + source are the filter's equality fields — Mongo writes them on
  // insert automatically, so they must NOT be repeated in $setOnInsert.
  const res = await payments.updateOne(
    { ownerId, source: "free" },
    {
      $setOnInsert: {
        landbookId,
        sessionId: null,
        amount: 0,
        currency: "eur",
        paidAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  return (res.upsertedCount ?? 0) > 0;
}

/**
 * Cover a LandBook with the agent's active subscription by writing one
 * idempotent `landbook_payments` row (source="subscription", amount 0).
 * Re-checks allowance server-side. Callers own the pipeline kick + redirect.
 */
export async function coverWithSubscription(
  ownerId: string,
  landbookId: string,
  usage: PlanUsage
): Promise<void> {
  if (!usage.plan || !usage.active) {
    throw new Error("No active subscription");
  }
  if (usage.allowance != null && usage.remaining != null && usage.remaining <= 0) {
    throw new Error("Subscription cap reached for this month");
  }

  // Idempotent: one coverage row per (landbookId, ownerId).
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const existing = await payments.findOne({ landbookId, ownerId });
  if (!existing) {
    await payments.insertOne({
      landbookId,
      ownerId,
      sessionId: null,
      amount: 0,
      currency: usage.plan.currency.toLowerCase(),
      paidAt: new Date().toISOString(),
      source: "subscription",
      priceId: usage.plan.priceId,
    });
  }
}

export { PLANS };
