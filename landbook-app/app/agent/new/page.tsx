import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { Stepper } from "@/components/agent/Stepper";
import { NewLandBookForm } from "@/components/agent/new/NewLandBookForm";
import { directSteps, oneOffSteps } from "@/lib/agent/steps";
import { getCurrentUser } from "@/lib/firebase/admin";
import { hasAcceptedAgreement } from "@/lib/agent/agreement-store";
import { getPlanUsage, isFreeBookEligible } from "@/lib/plan-usage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New LandBook · Agents",
};

export default async function NewLandBookPage() {
  // Free first books and subscription-covered books skip Plan/Payment, so the
  // stepper should reflect that up front rather than promising a purchase.
  const user = await getCurrentUser();
  if (user && !(await hasAcceptedAgreement(user.uid))) redirect("/agent/welcome");
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
    <main className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-brand-cream lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">
      <AgentHeader active="books" />
      <div className="flex items-center gap-4 border-b border-brand-sage/20 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
          <Link href="/agent">My LandBooks</Link>
          <span>/</span>
          <span className="text-brand-charcoal">New LandBook</span>
        </div>
        <div className="ml-auto hidden md:block">
          <Stepper steps={steps} />
        </div>
      </div>

      <NewLandBookForm />
    </main>
  );
}
