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
import { directSteps, oneOffSteps } from "@/lib/agent/steps";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { findAgentBook } from "@/lib/agent-book";
import type { LandbookPayment } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submitted · Agents",
};

export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const book = await findAgentBook(id, user.uid);
  if (!book) notFound();

  const ready = Boolean(book.data);

  // Free + subscription books skip Plan/Payment, so show the short
  // Property -> Submitted confirmation. Anything else (a paid one-off, or a
  // row not yet written by the Stripe webhook) shows the full four-step bar.
  const payments = await getCollection<LandbookPayment>("landbook_payments");
  const payment = await payments.findOne({ landbookId: id, ownerId: user.uid });
  const steps =
    payment?.source === "free" || payment?.source === "subscription"
      ? directSteps("submitted")
      : oneOffSteps("submitted");

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Submitted</span>
          </div>

          <Stepper steps={steps} />

          <div className="mt-8 rounded-lg border border-brand-sage/30 bg-white p-10 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-forest/40 bg-brand-forest/10 text-brand-forest">
              <Icon.Check />
            </div>
            <Eyebrow className="mt-5">
              {ready ? "LandBook ready" : "Order accepted"}
            </Eyebrow>
            <SerifTitle className="mt-3 text-3xl leading-tight">
              {ready
                ? "Your LandBook is ready to review."
                : "We're preparing your LandBook."}
            </SerifTitle>
            <p className="mx-auto mt-3 max-w-md text-sm text-brand-charcoal/65">
              {ready
                ? "Open it to refine the Overview, share with the buyer, or download the PDF."
                : "Our analysts are assembling 22 data sources for this property. You'll see it appear on My LandBooks within ~48 hours."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {ready && (
                <Link href={`/agent/${id}/edit`}>
                  <PillButton variant="primary" icon={<Icon.ArrowRight />}>
                    Open Overview editor
                  </PillButton>
                </Link>
              )}
              <Link href="/agent">
                <PillButton variant={ready ? "ghost" : "primary"}>
                  Back to My LandBooks
                </PillButton>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
