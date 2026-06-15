import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCollection } from "@/lib/db";
import { stripe } from "@/lib/stripe/server";
import { kickRefreshPipeline } from "@/lib/pipeline";
import type { AgentStripe, LandbookPayment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const ownerId = session.metadata?.ownerId;
  if (!ownerId) return;

  if (session.mode === "payment") {
    const landbookId = session.metadata?.landbookId;
    if (!landbookId || !session.id) return;
    const payments = await getCollection<LandbookPayment>("landbook_payments");
    const upserted = await payments.updateOne(
      { sessionId: session.id },
      {
        $setOnInsert: {
          landbookId,
          ownerId,
          sessionId: session.id,
          amount: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          paidAt: new Date().toISOString(),
          source: "one_off",
        },
      },
      { upsert: true }
    );
    // Kick the pipeline only on the first webhook for this session
    // (Stripe can retry). upsertedCount > 0 means we just inserted.
    if (upserted.upsertedCount > 0) kickRefreshPipeline(landbookId);
    return;
  }

  if (session.mode === "setup" && session.metadata?.intent === "on_closing") {
    const landbookId = session.metadata?.landbookId;
    if (!landbookId) return;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;

    // Resolve the card the agent saved and make it the customer's default so
    // the pay-on-closing fee can be charged to it later.
    const setupIntentId =
      typeof session.setup_intent === "string"
        ? session.setup_intent
        : session.setup_intent?.id;
    let paymentMethodId: string | undefined;
    if (setupIntentId) {
      const si = await stripe.setupIntents.retrieve(setupIntentId);
      paymentMethodId =
        typeof si.payment_method === "string"
          ? si.payment_method
          : si.payment_method?.id;
    }
    if (customerId && paymentMethodId) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      const col = await getCollection<AgentStripe>("agent_stripe");
      await col.updateOne(
        { ownerId },
        {
          $set: {
            stripeCustomerId: customerId,
            onClosingPaymentMethodId: paymentMethodId,
            updatedAt: new Date().toISOString(),
          },
          $setOnInsert: { ownerId },
        },
        { upsert: true }
      );
    }

    // Flag the commitment as card-on-file and kick the pipeline once (the
    // `cardOnFile` guard makes Stripe retries idempotent).
    const payments = await getCollection<LandbookPayment>("landbook_payments");
    const flagged = await payments.updateOne(
      { landbookId, ownerId, source: "on_closing", cardOnFile: { $ne: true } },
      { $set: { cardOnFile: true, setupSessionId: session.id } }
    );
    if (flagged.modifiedCount > 0) kickRefreshPipeline(landbookId);
    return;
  }

  if (session.mode === "subscription") {
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!customerId) return;

    let planPriceId: string | undefined;
    let status: string | undefined;
    let currentPeriodEnd: number | undefined;
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      planPriceId = sub.items.data[0]?.price.id;
      status = sub.status;
      currentPeriodEnd = sub.items.data[0]?.current_period_end;
    }

    const col = await getCollection<AgentStripe>("agent_stripe");
    await col.updateOne(
      { ownerId },
      {
        $set: {
          stripeCustomerId: customerId,
          subscriptionId,
          planPriceId,
          status,
          currentPeriodEnd,
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: { ownerId },
      },
      { upsert: true }
    );
  }
}

async function handleSubscriptionChange(
  sub: Stripe.Subscription
): Promise<void> {
  const ownerId =
    sub.metadata?.ownerId ??
    (await (async () => {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      return customer.deleted ? null : customer.metadata?.ownerId ?? null;
    })());
  if (!ownerId) return;

  const col = await getCollection<AgentStripe>("agent_stripe");
  await col.updateOne(
    { ownerId },
    {
      $set: {
        subscriptionId: sub.id,
        planPriceId: sub.items.data[0]?.price.id,
        status: sub.status,
        currentPeriodEnd: sub.items.data[0]?.current_period_end,
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { ownerId },
    },
    { upsert: true }
  );
}

async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  status: "paid" | "failed"
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  const ownerId = customer.metadata?.ownerId;
  if (!ownerId) return;

  const col = await getCollection<AgentStripe>("agent_stripe");
  await col.updateOne(
    { ownerId },
    {
      $set: {
        lastPaymentStatus: status,
        lastPaymentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { ownerId, stripeCustomerId: customerId },
    },
    { upsert: true }
  );
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 500 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionChange(event.data.object);
      break;
    case "invoice.paid":
      await handleInvoiceEvent(event.data.object, "paid");
      break;
    case "invoice.payment_failed":
      await handleInvoiceEvent(event.data.object, "failed");
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
