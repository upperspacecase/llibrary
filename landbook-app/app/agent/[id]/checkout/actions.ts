"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns } from "@/lib/agent-book";
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

export async function startReportCheckout(landbookId: string): Promise<void> {
  const user = await requireCurrentUser();
  const plan = PLANS.report;
  if (!plan.priceId) {
    throw new Error(`${plan.priceEnv} environment variable is not set`);
  }

  // Confirm the landbook belongs to this user (in either landbooks or submissions).
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    throw new Error("LandBook not found");
  }

  // Persist (or look up) a Stripe customer for this user so subscription + one-off
  // payment history land on the same customer record.
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
        $set: { stripeCustomerId: customerId, updatedAt: new Date().toISOString() },
        $setOnInsert: { ownerId: user.uid },
      },
      { upsert: true }
    );
  }

  const origin = await getOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/agent/${landbookId}/submitted?paid=1`,
    cancel_url: `${origin}/agent/${landbookId}/checkout?canceled=1`,
    metadata: { ownerId: user.uid, landbookId, planId: plan.id },
    payment_intent_data: {
      metadata: { ownerId: user.uid, landbookId, planId: plan.id },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}

export async function isLandbookPaid(landbookId: string): Promise<boolean> {
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const found = await payments.findOne({ landbookId });
  return Boolean(found);
}
