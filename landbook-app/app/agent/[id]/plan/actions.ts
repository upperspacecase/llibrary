"use server";

import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns } from "@/lib/agent-book";
import { getPlanUsage } from "@/lib/plan-usage";
import { kickRefreshPipeline } from "@/lib/pipeline";
import type { LandbookPayment } from "@/lib/types";

/**
 * Cover this LandBook with the agent's active subscription, then start
 * the pipeline. The page guards against allowance overflow but this also
 * re-checks server-side to keep an honest single source of truth.
 */
export async function coverWithSubscriptionAction(
  landbookId: string
): Promise<void> {
  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    throw new Error("LandBook not found");
  }

  const usage = await getPlanUsage(user.uid);
  if (!usage.plan || !usage.active) {
    throw new Error("No active subscription");
  }
  if (usage.allowance != null && usage.remaining != null && usage.remaining <= 0) {
    throw new Error("Subscription cap reached for this month");
  }

  // Idempotent: one subscription-coverage row per (landbookId, ownerId).
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const existing = await payments.findOne({
    landbookId,
    ownerId: user.uid,
  });
  if (!existing) {
    await payments.insertOne({
      landbookId,
      ownerId: user.uid,
      sessionId: null,
      amount: 0,
      currency: usage.plan.currency.toLowerCase(),
      paidAt: new Date().toISOString(),
      source: "subscription",
      priceId: usage.plan.priceId,
    });
  }

  kickRefreshPipeline(landbookId);
  redirect(`/agent/${landbookId}/submitted`);
}
