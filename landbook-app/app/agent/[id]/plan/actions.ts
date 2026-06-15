"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns } from "@/lib/agent-book";
import { coverWithSubscription, getPlanUsage } from "@/lib/plan-usage";
import { kickRefreshPipeline } from "@/lib/pipeline";
import { PLANS, stripe } from "@/lib/stripe/server";
import type { AgentStripe, LandbookPayment } from "@/lib/types";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Cannot determine request origin");
  return `${proto}://${host}`;
}

/**
 * Cover this LandBook with the agent's active subscription, then start
 * the pipeline. The page guards against allowance overflow but the shared
 * helper also re-checks server-side to keep an honest single source of truth.
 */
export async function coverWithSubscriptionAction(
  landbookId: string
): Promise<void> {
  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    throw new Error("LandBook not found");
  }

  const usage = await getPlanUsage(user.uid);
  await coverWithSubscription(user.uid, landbookId, usage);

  kickRefreshPipeline(landbookId);
  redirect(`/agent/${landbookId}/submitted`);
}

/**
 * Pay-on-closing: the agent accepts the terms and adds a card now; the
 * LandBook is produced now and the fee is charged when the deal closes.
 *
 * Records the accepted commitment up front (so consent is captured even if the
 * card step is abandoned), then sends them to a Stripe setup-mode Checkout to
 * save a card. The pipeline kicks from the setup webhook once the card lands.
 */
export async function startOnClosing(landbookId: string): Promise<void> {
  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    throw new Error("LandBook not found");
  }

  const plan = PLANS.report; // the owed amount mirrors the one-off report price
  const now = new Date().toISOString();

  // Ensure a Stripe customer so the saved card and any later charge attach to it.
  const agentCol = await getCollection<AgentStripe>("agent_stripe");
  const existing = await agentCol.findOne({ ownerId: user.uid });
  let customerId = existing?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { ownerId: user.uid },
    });
    customerId = customer.id;
    await agentCol.updateOne(
      { ownerId: user.uid },
      {
        $set: { stripeCustomerId: customerId, updatedAt: now },
        $setOnInsert: { ownerId: user.uid },
      },
      { upsert: true }
    );
  }

  // Record the accepted commitment (idempotent per landbook). The pipeline is
  // NOT kicked here — that happens once a card is on file (setup webhook).
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  await payments.updateOne(
    { landbookId, ownerId: user.uid },
    {
      $setOnInsert: {
        landbookId,
        ownerId: user.uid,
        sessionId: null,
        amount: plan.amount,
        currency: plan.currency.toLowerCase(),
        paidAt: now,
        source: "on_closing",
        status: "owed",
        cardOnFile: false,
      },
    },
    { upsert: true }
  );

  const origin = await getOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    payment_method_types: ["card"],
    success_url: `${origin}/agent/${landbookId}/submitted?onclosing=1`,
    cancel_url: `${origin}/agent/${landbookId}/plan?canceled=1`,
    metadata: { ownerId: user.uid, landbookId, intent: "on_closing" },
    setup_intent_data: {
      metadata: { ownerId: user.uid, landbookId, intent: "on_closing" },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a setup URL");
  redirect(session.url);
}
