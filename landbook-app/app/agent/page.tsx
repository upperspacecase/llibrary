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
    return {
      id: plain.id,
      href: `/agent/${plain.id}/edit`,
      display: bookDisplayName(plain),
      subline: plain.address || "No address yet",
      status: deriveStatus(plain),
      updated: plain.updated || plain.created,
      isSubmission: false,
    };
  });

  const submissions = subDocs.map((d): AgentItem => {
    const plain = JSON.parse(JSON.stringify(d)) as Submission;
    const name =
      plain.propertyName || plain.address || plain.postcode || `Submission ${plain.id.slice(0, 8)}`;
    const subline = plain.clientName
      ? `${plain.address || plain.postcode} · ${plain.clientName}`
      : plain.address || plain.postcode || "Pending review";
    // The v1 refresh pipeline writes `data` back to the submissions
    // collection when no landbook exists for the id. Once data is present,
    // it's effectively ready — same status semantics as a landbook.
    const ready = Boolean(plain.data);
    return {
      id: plain.id,
      href: ready ? `/agent/${plain.id}/edit` : "/agent",
      display: name,
      subline,
      status: ready ? "Ready" : "Processing",
      updated: plain.dataUpdated || plain.updated || plain.created,
      isSubmission: !ready,
    };
  });

  return [...submissions, ...books];
}

export default async function MyLandBooksPage() {
  const items = await loadItems();
  const total = items.length;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-brand-sage/40 bg-white px-4 py-2">
                <span className="text-brand-charcoal/40">
                  <Icon.Search />
                </span>
                <input
                  placeholder="Search by name, client, address…"
                  className="w-72 bg-transparent text-sm outline-none placeholder:text-brand-charcoal/35"
                />
              </div>
              <Link href="/agent/new">
                <PillButton variant="primary" icon={<Icon.Plus />}>
                  New LandBook
                </PillButton>
              </Link>
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
