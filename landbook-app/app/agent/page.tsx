import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Icon,
} from "@/components/agent/primitives";

export const metadata: Metadata = {
  title: "My LandBooks · Agents",
};

const FILTERS = ["All", "Drafts", "Processing", "Ready", "Shared", "Archived"];

export default function MyLandBooksPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <Eyebrow>No active LandBooks yet</Eyebrow>
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

          {/* Empty state */}
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
        </div>
      </div>
    </main>
  );
}
