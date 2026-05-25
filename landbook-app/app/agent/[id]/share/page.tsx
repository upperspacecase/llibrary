import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Field,
  TextInput,
  Icon,
} from "@/components/agent/primitives";

export const metadata: Metadata = {
  title: "Share · Agents",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const publicUrl = `https://landlibrary.co/${id}`;

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <Link href={`/agent/${id}/edit`}>LandBook #{id}</Link>
            <span>/</span>
            <span className="text-brand-charcoal">Share</span>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Not published yet</Eyebrow>
              <SerifTitle className="mt-3 text-3xl leading-tight">
                Share with the buyer.
              </SerifTitle>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-charcoal/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/55">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-charcoal/40" />
              Draft
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-6">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Public link</Eyebrow>
                <div className="mt-3 flex items-center gap-2 rounded border border-brand-sage/40 bg-brand-cream/50 px-4 py-3">
                  <span className="text-brand-charcoal/40">
                    <Icon.Share />
                  </span>
                  <code className="flex-1 truncate text-[12px] text-brand-charcoal/80">
                    {publicUrl}
                  </code>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal"
                  >
                    <Icon.Copy /> Copy
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Link expires">
                    <TextInput placeholder="Never" />
                  </Field>
                  <Field label="Buyer email gate">
                    <TextInput
                      placeholder="Off"
                      suffix={
                        <span className="text-[10px] uppercase tracking-[0.1em] text-brand-charcoal/45">
                          Off
                        </span>
                      }
                    />
                  </Field>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded bg-brand-cream/60 px-4 py-3 text-[11px] text-brand-charcoal/65">
                  <span className="text-brand-charcoal/55">
                    <Icon.Eye />
                  </span>
                  <span>
                    You&rsquo;ll get notified for every view, scroll-to-end,
                    and download.
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Send directly</Eyebrow>
                <div className="mt-3 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 py-10 text-center text-[12px] text-brand-charcoal/55">
                  You haven&rsquo;t added any recipients yet.
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded border border-dashed border-brand-sage/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55 hover:border-brand-charcoal hover:text-brand-charcoal"
                >
                  + Add recipient
                </button>
                <div className="mt-5 flex justify-between gap-3">
                  <PillButton variant="ghost" icon={<Icon.Download />}>
                    Download PDF
                  </PillButton>
                  <PillButton variant="primary" icon={<Icon.Mail />}>
                    Send invitations
                  </PillButton>
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-brand-sage/30 bg-white p-6">
              <Eyebrow>Activity</Eyebrow>
              <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 py-10 text-center text-[12px] text-brand-charcoal/55">
                No activity yet. Views, downloads and publish events will land
                here.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
