import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  StatusPill,
  Icon,
} from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import type { Landbook, Submission } from "@/lib/types";
import { bookDisplayName, deriveStatus, type LandbookStatus } from "@/lib/landbook-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My LandBooks · Agents",
};

type AgentItem = {
  id: string;
  href: string;
  display: string;
  subline: string;
  status: LandbookStatus;
  updated?: string;
  isSubmission: boolean;
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
    return {
      id: plain.id,
      href: "/agent",
      display: name,
      subline,
      status: "Processing",
      updated: plain.created,
      isSubmission: true,
    };
  });

  return [...submissions, ...books].sort((a, b) => {
    const av = a.updated || "";
    const bv = b.updated || "";
    return bv.localeCompare(av);
  });
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
            <ul className="mt-6 divide-y divide-brand-sage/25 overflow-hidden rounded-lg border border-brand-sage/30 bg-white">
              {items.map((item) => (
                <li
                  key={`${item.isSubmission ? "s" : "b"}:${item.id}`}
                  className="flex items-center gap-6 px-6 py-5 transition hover:bg-brand-cream/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {item.isSubmission ? (
                        <span
                          className="font-serif text-lg font-bold text-brand-charcoal/80"
                          style={{ fontFamily: "var(--font-libre), serif" }}
                        >
                          {item.display}
                        </span>
                      ) : (
                        <Link
                          href={item.href}
                          className="font-serif text-lg font-bold text-brand-charcoal hover:underline"
                          style={{ fontFamily: "var(--font-libre), serif" }}
                        >
                          {item.display}
                        </Link>
                      )}
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 truncate text-[12px] text-brand-charcoal/55">
                      {item.subline}
                    </p>
                  </div>
                  <div className="hidden text-right text-[11px] text-brand-charcoal/55 md:block">
                    <p className="font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
                      {item.isSubmission ? "Submitted" : "Updated"}
                    </p>
                    <p className="mt-1">{formatDate(item.updated)}</p>
                  </div>
                  {!item.isSubmission && (
                    <div className="flex items-center gap-2">
                      <Link href={`/agent/${item.id}/upload`}>
                        <PillButton variant="light" icon={<Icon.Upload />}>
                          Upload
                        </PillButton>
                      </Link>
                      <Link href={`/agent/${item.id}/share`}>
                        <PillButton variant="ghost" icon={<Icon.Share />}>
                          Share
                        </PillButton>
                      </Link>
                    </div>
                  )}
                  {item.isSubmission && (
                    <span className="text-[11px] uppercase tracking-[0.15em] text-brand-charcoal/45">
                      Awaiting analyst
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
