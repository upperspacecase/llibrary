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

export { PLANS };
