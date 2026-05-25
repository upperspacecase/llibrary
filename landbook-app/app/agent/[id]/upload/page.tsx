import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { PillButton, SerifTitle, Icon } from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import type { Landbook, LandbookFile } from "@/lib/types";
import UploadClient from "./UploadClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upload client content · Agents",
};

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id, ownerId: user.uid });
  if (!book) notFound();

  const filesCol = await getCollection<LandbookFile>("landbook_files");
  const docs = await filesCol
    .find({ landbookId: id, ownerId: user.uid })
    .sort({ uploadedAt: -1 })
    .toArray();
  const files = docs.map((d) => JSON.parse(JSON.stringify(d)) as LandbookFile);

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href={`/agent/${id}/edit`}>LandBook #{id.slice(0, 8)}</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Client content</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <SerifTitle className="text-3xl leading-tight">
                Add what the client gave you.
              </SerifTitle>
              <p className="mt-2 max-w-xl text-sm text-brand-charcoal/65">
                Photos, surveys, deeds, soil tests, family notes. Drop them
                here and our analyst will work them into the report.
              </p>
            </div>
            <Link href={`/agent/${id}/edit`}>
              <PillButton variant="ghost" icon={<Icon.Eye />}>
                Preview report
              </PillButton>
            </Link>
          </div>

          <UploadClient
            landbookId={id}
            initialFiles={files}
            initialNotes={book.agentNotes || ""}
          />
        </div>
      </div>
    </main>
  );
}
