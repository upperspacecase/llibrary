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
import { getCurrentUser } from "@/lib/firebase/admin";
import { findAgentBook } from "@/lib/agent-book";
import { getPlanUsage, PLANS } from "@/lib/plan-usage";
import { PayOnClosing } from "@/components/agent/plan/PayOnClosing";
import { coverWithSubscriptionAction, startOnClosing } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose plan · Agents",
};

function formatEur(amount: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PlanPage({
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

  const book = await findAgentBook(id, user.uid);
  if (!book) notFound();

  const usage = await getPlanUsage(user.uid);
  const subscriptionCoversThis =
    usage.active &&
    usage.plan != null &&
    (usage.remaining == null || usage.remaining > 0);

  const coverAction = coverWithSubscriptionAction.bind(null, id);
  const onClosingAction = startOnClosing.bind(null, id);

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href="/agent/new">New LandBook</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Choose plan</span>
          </div>

          <Stepper steps={oneOffSteps("plan")} />

          <SerifTitle className="mt-8 text-3xl leading-tight">
            Choose how this LandBook is covered.
          </SerifTitle>
          <p className="mt-2 max-w-xl text-sm text-brand-charcoal/65">
            Pay upfront, use your monthly partner plan, or pay when the deal
            closes.
          </p>

          {canceled && (
            <div className="mt-6 rounded border border-brand-sage/40 bg-white px-4 py-3 text-[12px] text-brand-charcoal/70">
              Card setup canceled. No charge was made — pick an option below to
              continue.
            </div>
          )}

          {/* Subscription coverage card — only when the user has an active plan */}
          {subscriptionCoversThis && usage.plan && (
            <div className="mt-8 rounded-lg border border-brand-forest/30 bg-brand-forest/5 p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <Eyebrow>Your plan covers this</Eyebrow>
                  <p
                    className="mt-2 font-serif text-2xl font-bold text-brand-charcoal"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {usage.plan.name}
                  </p>
                  <p className="mt-1 text-[12px] text-brand-charcoal/60">
                    {usage.allowance == null
                      ? `Unlimited LandBooks · ${usage.usedThisMonth} used this month`
                      : `${usage.usedThisMonth} of ${usage.allowance} used this month · ${usage.remaining} left`}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-forest/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-forest">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-forest" />
                  Active
                </span>
              </div>
              <form action={coverAction} className="mt-5">
                <PillButton
                  variant="primary"
                  icon={<Icon.ArrowRight />}
                  type="submit"
                >
                  Use my plan & submit
                </PillButton>
                <p className="mt-2 text-[11px] text-brand-charcoal/50">
                  Payment step skipped — included in your subscription.
                </p>
              </form>
            </div>
          )}

          {/* Out-of-allowance notice — has sub but the cap is hit this month */}
          {usage.active &&
            usage.plan &&
            usage.allowance != null &&
            usage.remaining === 0 && (
              <div className="mt-8 rounded-lg border border-brand-amber/40 bg-brand-amber/10 p-6 text-[12px] text-brand-charcoal/80">
                You&rsquo;ve used all {usage.allowance} LandBooks on your{" "}
                {usage.plan.name} plan this month. Pay one-off for this
                LandBook below, or upgrade your plan on the Billing page.
              </div>
            )}

          {/* Plan grid — always show so the agent can pick a one-off or upgrade */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(["report", "steward", "engine"] as const).map((key) => {
              const p = PLANS[key];
              const isSubPlan = p.mode === "subscription";
              const isCurrentSub = usage.plan?.id === p.id && usage.active;
              const targetHref =
                p.mode === "payment"
                  ? `/agent/${id}/checkout`
                  : `/agent/billing`;
              return (
                <div
                  key={p.id}
                  className="flex flex-col rounded-lg border border-brand-sage/30 bg-white p-6"
                >
                  <Eyebrow>
                    {p.mode === "payment" ? "Per LandBook" : "Subscription"}
                  </Eyebrow>
                  <p
                    className="mt-2 font-serif text-2xl font-bold text-brand-charcoal"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {p.name}
                  </p>
                  <p className="mt-1 min-h-[36px] text-[12px] text-brand-charcoal/60">
                    {p.description}
                  </p>
                  <p
                    className="mt-4 font-serif text-3xl font-bold tabular-nums text-brand-forest"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {formatEur(p.amount)}
                    {p.billingCycle && (
                      <span className="ml-1 text-sm text-brand-charcoal/60">
                        {p.billingCycle}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-brand-charcoal/55">
                    {p.monthlyAllowance == null
                      ? "Unlimited LandBooks"
                      : `${p.monthlyAllowance} LandBook${p.monthlyAllowance === 1 ? "" : "s"}${isSubPlan ? " / month" : ""}`}
                  </p>
                  <div className="mt-auto pt-6">
                    {isCurrentSub ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-forest">
                        Your current plan
                      </span>
                    ) : (
                      <Link href={targetHref}>
                        <PillButton
                          variant={p.mode === "payment" ? "primary" : "ghost"}
                          full
                          icon={<Icon.ArrowRight />}
                        >
                          {p.mode === "payment"
                            ? "Pay & submit"
                            : "Manage in billing"}
                        </PillButton>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <PayOnClosing
            action={onClosingAction}
            amountLabel={formatEur(PLANS.report.amount)}
          />

          <div className="mt-8 flex items-center gap-3 text-[11px] text-brand-charcoal/50">
            <Link href="/agent" className="underline underline-offset-2">
              Save draft &amp; pick a plan later
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
