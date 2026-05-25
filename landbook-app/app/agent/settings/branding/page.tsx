import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { Eyebrow, SerifTitle } from "@/components/agent/primitives";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
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

          <BrandingClient ownerId={user.uid} initial={initial} />
        </div>
      </div>
    </main>
  );
}
