import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { Eyebrow, SerifTitle } from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { getPlanUsage } from "@/lib/plan-usage";
import type { AgentSettings } from "@/lib/types";
import BrandingClient from "./BrandingClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Co-branding · Agents",
};

export default async function CoBrandingPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const col = await getCollection<AgentSettings>("agent_settings");
  const doc = await col.findOne({ ownerId: user.uid });
  const initial: AgentSettings = doc
    ? (JSON.parse(JSON.stringify(doc)) as AgentSettings)
    : { ownerId: user.uid };

  // Co-branding is an Agency-plan (engine) feature only.
  const usage = await getPlanUsage(user.uid).catch(() => null);
  const hasCoBranding = Boolean(usage?.active && usage.plan?.id === "engine");

  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="settings" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Settings · Co-branding</Eyebrow>
          <SerifTitle className="mt-3 text-3xl leading-tight">
            Co-branding
          </SerifTitle>
          <p className="mt-2 max-w-2xl text-sm text-brand-charcoal/60">
            Applied to the cover and footer of every report you generate.
            Buyers see your brand alongside LandBook&rsquo;s methodology badge.
          </p>

          {hasCoBranding ? (
            <BrandingClient ownerId={user.uid} initial={initial} />
          ) : (
            <div className="mt-8 rounded-lg border border-brand-sage/30 bg-white p-10 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-charcoal/5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-brand-charcoal"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <p className="mt-4 font-serif text-xl text-brand-forest">
                Co-branding is part of the Agency plan
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-brand-charcoal/60">
                Add your agency logo, name, and accent colour to the cover and
                footer of every report on the Agency Natural Capital Engine plan.
              </p>
              <Link
                href="/agent/billing"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-brand-charcoal bg-brand-charcoal px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal"
              >
                View plans
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
