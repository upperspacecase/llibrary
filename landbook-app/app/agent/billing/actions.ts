"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { PLANS, type PlanId, stripe } from "@/lib/stripe/server";
import type { AgentStripe } from "@/lib/types";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Cannot determine request origin");
  return `${proto}://${host}`;
}

async function getOrCreateCustomer(
  uid: string,
  email: string | null
): Promise<string> {
  const col = await getCollection<AgentStripe>("agent_stripe");
  const existing = await col.findOne({ ownerId: uid });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { ownerId: uid },
  });

  await col.updateOne(
    { ownerId: uid },
    {
      $set: { stripeCustomerId: customer.id, updatedAt: new Date().toISOString() },
      $setOnInsert: { ownerId: uid },
    },
    { upsert: true }
  );
  return customer.id;
}

export async function startSubscriptionCheckout(planId: PlanId): Promise<void> {
  const user = await requireCurrentUser();
  const plan = PLANS[planId];
  if (plan.mode !== "subscription") {
    throw new Error(`Plan ${planId} is not a subscription plan`);
  }
  if (!plan.priceId) {
    throw new Error(`${plan.priceEnv} environment variable is not set`);
  }

  const customerId = await getOrCreateCustomer(user.uid, user.email);
  const origin = await getOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${origin}/agent/billing?subscribed=1`,
    cancel_url: `${origin}/agent/billing?canceled=1`,
    metadata: { ownerId: user.uid, planId },
    subscription_data: {
      metadata: { ownerId: user.uid, planId },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  redirect(session.url);
}

export async function openCustomerPortal(): Promise<void> {
  const user = await requireCurrentUser();
  const col = await getCollection<AgentStripe>("agent_stripe");
  const doc = await col.findOne({ ownerId: user.uid });
  if (!doc?.stripeCustomerId) {
    throw new Error("No Stripe customer for this account");
  }

  const origin = await getOrigin();
  const portal = await stripe.billingPortal.sessions.create({
    customer: doc.stripeCustomerId,
    return_url: `${origin}/agent/billing`,
  });
  redirect(portal.url);
}
