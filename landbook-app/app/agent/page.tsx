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
import type { Landbook } from "@/lib/types";
import { bookDisplayName, deriveStatus } from "@/lib/landbook-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My LandBooks · Agents",
};

const FILTERS = ["All", "Drafts", "Processing", "Ready", "Shared", "Archived"];

async function loadBooks(): Promise<Landbook[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const col = await getCollection<Landbook>("landbooks");
  const docs = await col
    .find({ ownerId: user.uid })
    .sort({ updated: -1, created: -1 })
    .toArray();

  return docs.map((d) => JSON.parse(JSON.stringify(d)) as Landbook);
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
  const books = await loadBooks();
  const total = books.length;

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

          <div className="mt-8 flex items-center gap-2 text-[11px] font-medium tracking-wide text-brand-charcoal/60">
            {FILTERS.map((f, i) => (
              <button
                key={f}
                type="button"
                className={
                  i === 0
                    ? "rounded-full border border-brand-charcoal bg-brand-charcoal px-3 py-1.5 text-brand-cream"
                    : "rounded-full border border-brand-sage/40 bg-white px-3 py-1.5 hover:border-brand-charcoal/60"
                }
              >
                {f}
              </button>
            ))}
            <div className="ml-auto text-brand-charcoal/40">
              Sort: Last updated ↓
            </div>
          </div>

          {books.length === 0 ? (
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
              {books.map((book) => {
                const status = deriveStatus(book);
                const display = bookDisplayName(book);
                return (
                  <li
                    key={book.id}
                    className="flex items-center gap-6 px-6 py-5 transition hover:bg-brand-cream/40"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/agent/${book.id}/edit`}
                          className="font-serif text-lg font-bold text-brand-charcoal hover:underline"
                          style={{ fontFamily: "var(--font-libre), serif" }}
                        >
                          {display}
                        </Link>
                        <StatusPill status={status} />
                      </div>
                      <p className="mt-1 truncate text-[12px] text-brand-charcoal/55">
                        {book.address || "No address yet"}
                        {book.clientName ? ` · ${book.clientName}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right text-[11px] text-brand-charcoal/55 md:block">
                      <p className="font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
                        Updated
                      </p>
                      <p className="mt-1">
                        {formatDate(book.updated || book.created)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/agent/${book.id}/upload`}>
                        <PillButton variant="light" icon={<Icon.Upload />}>
                          Upload
                        </PillButton>
                      </Link>
                      <Link href={`/agent/${book.id}/share`}>
                        <PillButton variant="ghost" icon={<Icon.Share />}>
                          Share
                        </PillButton>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
