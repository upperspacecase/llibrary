import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { Eyebrow, SerifTitle } from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { findAgentBook } from "@/lib/agent-book";
import type { LandbookShare } from "@/lib/types";
import { randomUUID } from "crypto";
import ShareClient from "./ShareClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Share · Agents",
};

const PUBLIC_BASE = "https://landbook.landlibrary.co";

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const book = await findAgentBook(id, user.uid);
  if (!book) notFound();

  const shares = await getCollection<LandbookShare>("landbook_shares");
  let share = await shares.findOne({ landbookId: id, ownerId: user.uid });
  if (!share) {
    const now = new Date().toISOString();
    const fresh: LandbookShare = {
      landbookId: id,
      ownerId: user.uid,
      token: randomUUID(),
      createdAt: now,
      expiresAt: null,
      emailGate: false,
      recipients: [],
      activity: [{ kind: "created", at: now }],
    };
    await shares.insertOne(fresh);
    share = await shares.findOne({ landbookId: id, ownerId: user.uid });
  }

  const plainShare = JSON.parse(JSON.stringify(share)) as LandbookShare;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href={`/agent/${id}/edit`}>LandBook #{id.slice(0, 8)}</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Share</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>
                {plainShare.recipients.length === 0
                  ? "Link ready · no recipients"
                  : `${plainShare.recipients.length} recipient${plainShare.recipients.length === 1 ? "" : "s"}`}
              </Eyebrow>
              <SerifTitle className="mt-3 text-3xl leading-tight">
                Share with the buyer.
              </SerifTitle>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-charcoal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/55">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-charcoal/40" />
              Draft
            </span>
          </div>

          <ShareClient
            landbookId={id}
            share={plainShare}
            publicBaseUrl={PUBLIC_BASE}
          />
        </div>
      </div>
    </main>
  );
}
