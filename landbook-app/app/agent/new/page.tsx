import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { SerifTitle } from "@/components/agent/primitives";
import { NewLandBookForm } from "@/components/agent/new/NewLandBookForm";

export const metadata: Metadata = {
  title: "New LandBook · Agents",
};

export default function NewLandBookPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <span className="text-brand-charcoal">New LandBook</span>
          </div>

          <SerifTitle className="mt-6 text-3xl leading-tight">
            Tell us about the property.
          </SerifTitle>
          <p className="mt-2 max-w-2xl text-sm text-brand-charcoal/60">
            We&rsquo;ll start the analysts on your LandBook as soon as you
            submit. You can refine details later.
          </p>

          <NewLandBookForm />
        </div>
      </div>
    </main>
  );
}
