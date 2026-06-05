import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { SerifTitle } from "@/components/agent/primitives";
import { Stepper } from "@/components/agent/Stepper";
import { NewLandBookForm } from "@/components/agent/new/NewLandBookForm";
import { directSteps, oneOffSteps } from "@/lib/agent/steps";
import { getCurrentUser } from "@/lib/firebase/admin";
import { getPlanUsage, isFreeBookEligible } from "@/lib/plan-usage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New LandBook · Agents",
};

export default async function NewLandBookPage() {
  // Free first books and subscription-covered books skip Plan/Payment, so the
  // stepper should reflect that up front rather than promising a purchase.
  const user = await getCurrentUser();
  let direct = false;
  if (user) {
    if (await isFreeBookEligible(user.uid)) {
      direct = true;
    } else {
      const usage = await getPlanUsage(user.uid);
      direct =
        usage.active &&
        usage.plan != null &&
        (usage.remaining == null || usage.remaining > 0);
    }
  }
  const steps = direct ? directSteps("property") : oneOffSteps("property");

  return (
    <main className="min-h-screen overflow-x-hidden bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <span className="text-brand-charcoal">New LandBook</span>
          </div>

          <Stepper steps={steps} />

          <SerifTitle className="mt-8 text-3xl leading-tight">
            Tell us about the property.
          </SerifTitle>
          <p className="mt-2 max-w-2xl text-sm text-brand-charcoal/60">
            We&rsquo;ll start the analysts on your LandBook as soon as you
            submit. You can refine details later.
          </p>

          <NewLandBookForm />
        </div>
      </div>
    </main>
  );
}
