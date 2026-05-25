import "server-only";
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) throw new Error("STRIPE_SECRET_KEY environment variable is not set");

export const stripe = new Stripe(secret);

export type PlanId = "report" | "steward" | "engine";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  priceEnv: string;
  priceId: string | undefined;
  mode: "payment" | "subscription";
  amount: number;
  currency: string;
  billingCycle?: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  report: {
    id: "report",
    name: "Natural Capital Report",
    description: "One property. Full intelligence. 48-hour turnaround.",
    priceEnv: "STRIPE_PRICE_REPORT",
    priceId: process.env.STRIPE_PRICE_REPORT,
    mode: "payment",
    amount: 1500,
    currency: "EUR",
  },
  steward: {
    id: "steward",
    name: "Land Steward Partner",
    description: "For agents who steward every property fully.",
    priceEnv: "STRIPE_PRICE_STEWARD",
    priceId: process.env.STRIPE_PRICE_STEWARD,
    mode: "subscription",
    amount: 2997,
    currency: "EUR",
    billingCycle: "/month",
  },
  engine: {
    id: "engine",
    name: "Agency Natural Capital Engine",
    description: "Transform your agency's rural intelligence.",
    priceEnv: "STRIPE_PRICE_ENGINE",
    priceId: process.env.STRIPE_PRICE_ENGINE,
    mode: "subscription",
    amount: 7997,
    currency: "EUR",
    billingCycle: "/month",
  },
};

export function planForPriceId(priceId: string | undefined): PlanConfig | null {
  if (!priceId) return null;
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) return plan;
  }
  return null;
}
