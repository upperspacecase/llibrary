import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Icon,
} from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { getPlanUsage, isFreeBookEligible } from "@/lib/plan-usage";
import type { Landbook, Submission } from "@/lib/types";
import { bookDisplayName, deriveStatus } from "@/lib/landbook-status";
import BooksList, { type AgentItem } from "./BooksList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My LandBooks · Agents",
};

async function loadItems(): Promise<AgentItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const [booksCol, subsCol] = await Promise.all([
    getCollection<Landbook>("landbooks"),
    getCollection<Submission>("submissions"),
  ]);

  const [bookDocs, subDocs] = await Promise.all([
    booksCol.find({ ownerId: user.uid }).sort({ updated: -1, created: -1 }).toArray(),
    subsCol.find({ ownerId: user.uid, landbookId: { $exists: false } }).sort({ created: -1 }).toArray(),
  ]);

  const books = bookDocs.map((d): AgentItem => {
    const plain = JSON.parse(JSON.stringify(d)) as Landbook;
    // Pipeline-complete is no longer the same as Ready — an admin has to
    // release each one before the agent sees it as such.
    const released = Boolean(plain.releasedAt);
    return {
      id: plain.id,
      href: released ? `/agent/${plain.id}/edit` : "/agent",
      display: bookDisplayName(plain),
      subline: plain.address || "No address yet",
      status: released ? deriveStatus(plain) : "Processing",
      updated: plain.updated || plain.created,
      isSubmission: !released,
    };
  });

  const submissions = subDocs.map((d): AgentItem => {
    const plain = JSON.parse(JSON.stringify(d)) as Submission;
    const name =
      plain.propertyName || plain.address || plain.postcode || `Submission ${plain.id.slice(0, 8)}`;
    const subline = plain.clientName
      ? `${plain.address || plain.postcode} · ${plain.clientName}`
      : plain.address || plain.postcode || "Pending review";
    // Ready iff: pipeline has populated `data` AND an admin has released it.
    const released = Boolean(plain.data && plain.releasedAt);
    return {
      id: plain.id,
      href: released ? `/agent/${plain.id}/edit` : "/agent",
      display: name,
      subline,
      status: released ? "Ready" : "Processing",
      updated: plain.dataUpdated || plain.updated || plain.created,
      isSubmission: !released,
    };
  });

  return [...submissions, ...books];
}

async function nextBookHint(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (await isFreeBookEligible(user.uid)) return "Your first LandBook is free.";
  const usage = await getPlanUsage(user.uid).catch(() => null);
  if (
    usage?.active &&
    usage.plan &&
    (usage.remaining == null || usage.remaining > 0)
  ) {
    return "Covered by your plan.";
  }
  return "Pay-per-book (€1,500) or subscribe.";
}

export default async function MyLandBooksPage() {
  const [items, hint] = await Promise.all([loadItems(), nextBookHint()]);
  const total = items.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <Eyebrow>
                {total === 0
                  ? "No active LandBooks yet"
                  : `${total} active LandBook${total === 1 ? "" : "s"}`}
              </Eyebrow>
              <SerifTitle className="mt-3 text-4xl leading-tight">
                My LandBooks
              </SerifTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-brand-sage/40 bg-white px-4 py-2 sm:flex-none">
                <span className="text-brand-charcoal/40">
                  <Icon.Search />
                </span>
                <input
                  placeholder="Search by name, client, address…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-brand-charcoal/35 sm:w-72"
                />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Link href="/agent/new">
                  <PillButton variant="primary" icon={<Icon.Plus />}>
                    New LandBook
                  </PillButton>
                </Link>
                {hint && (
                  <span className="text-[10px] text-brand-charcoal/45">{hint}</span>
                )}
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-brand-sage/40 bg-white py-20 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-sage/40 bg-brand-cream text-brand-charcoal/60">
                <Icon.Plus />
              </div>
              <SerifTitle className="mt-5 text-2xl">
                You don&rsquo;t have any LandBooks yet.
              </SerifTitle>
              <p className="mx-auto mt-2 max-w-md text-sm text-brand-charcoal/60">
                Start a new one to assemble climate, soil, water, biodiversity
                and history data for a property.
              </p>
              <div className="mt-6">
                <Link href="/agent/new">
                  <PillButton variant="primary" icon={<Icon.Plus />}>
                    Create your first LandBook
                  </PillButton>
                </Link>
              </div>
            </div>
          ) : (
            <BooksList items={items} />
          )}
        </div>
      </div>
    </main>
  );
}
