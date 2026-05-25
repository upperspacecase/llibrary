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
  title: "Upload client content · Agents",
};

export default async function UploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href={`/agent/${id}/edit`}>LandBook #{id}</Link>
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

          <div className="mt-8 rounded-lg border-2 border-dashed border-brand-sage/45 bg-white p-12 text-center">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream text-brand-charcoal/70">
              <Icon.Upload />
            </div>
            <p
              className="mt-4 font-serif text-xl font-bold text-brand-charcoal"
              style={{ fontFamily: "var(--font-libre), serif" }}
            >
              Drop files here
            </p>
            <p className="mt-1 text-sm text-brand-charcoal/55">
              or <span className="underline">browse</span> — PDF, JPG, PNG,
              KML, DOC up to 50 MB
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-dashed border-brand-sage/40 bg-white py-12 text-center text-[12px] text-brand-charcoal/55">
            No files uploaded yet.
          </div>

          <div className="mt-8 rounded-lg border border-brand-sage/30 bg-white p-6">
            <Eyebrow>Agent notes</Eyebrow>
            <p className="mt-1 text-[11px] text-brand-charcoal/55">
              Internal context for the analyst — not visible to the buyer.
            </p>
            <textarea
              rows={4}
              placeholder="Anything the analyst should know about this property…"
              className="mt-3 w-full rounded border border-brand-sage/30 bg-brand-cream/40 px-4 py-3 text-sm text-brand-charcoal/85 focus:outline-none focus:ring-1 focus:ring-brand-charcoal"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
