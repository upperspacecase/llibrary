import type { Metadata } from "next";
import Image from "next/image";
import { PricingSection } from "@/components/agents/PricingSection";

export const metadata: Metadata = {
  title: "For Rural Agents | LandBook",
  description:
    "Show up to every listing pitch with a professional LandBook that builds trust with sellers and cuts buyer due diligence from weeks to days.",
};

function HeroCopy() {
  return (
    <div>
      <Image
        src="/landbook-logo.png"
        alt="LandBook"
        width={2000}
        height={600}
        priority
        className="mb-8 h-8 w-auto sm:mb-12 sm:h-10"
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
        For Rural Agents
      </p>

      <h1 className="serif-title mt-6 text-4xl leading-[1.05] text-brand-charcoal sm:text-5xl lg:text-6xl">
        Win more listings.
        <br />
        Close deals faster.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-charcoal/80 sm:mt-8">
        Show up to every listing pitch with a professional LandBook that
        instantly builds trust with sellers. Then hand buyers the same report
        to cut due diligence from weeks to days. One book. Two wins.
      </p>

      <p className="mt-6 max-w-xl text-base italic leading-relaxed text-brand-charcoal/70">
        For a limited time, we&apos;re offering complimentary Landbooks to
        select agents who meet our criteria.
      </p>

      <div className="mt-8 sm:mt-10">
        <a
          href="/agent/signin"
          className="inline-flex w-full items-center justify-center rounded-full border border-brand-charcoal bg-brand-charcoal px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal sm:w-auto"
        >
          Get your first LandBook
        </a>
      </div>

      <p className="mt-4 text-xs text-brand-charcoal/50">
        Only 50 complimentary reports left this quarter.
      </p>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-brand-cream">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 sm:py-16 lg:px-12 lg:py-24">
        <div className="grid gap-10 sm:gap-12 min-[1400px]:grid-cols-[380px_minmax(900px,1fr)] min-[1400px]:gap-16">
          <div className="min-[1400px]:sticky min-[1400px]:top-24 min-[1400px]:self-start">
            <HeroCopy />
          </div>

          <div className="rounded-lg border border-brand-sage/30 bg-brand-cream shadow-xl max-h-[70vh] overflow-x-hidden overflow-y-auto min-[1400px]:max-h-[calc(100vh-8rem)]">
            <div className="p-4 sm:p-8 lg:p-12">
              <div
                className="mx-auto flex aspect-[3/4] max-w-[800px] flex-col items-center justify-center gap-4 rounded bg-white text-center shadow-2xl"
                role="img"
                aria-label="Sample LandBook preview placeholder"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sage">
                  Sample LandBook
                </p>
                <p className="serif-title text-xl text-brand-forest sm:text-2xl">
                  Preview coming soon
                </p>
                <p className="max-w-xs text-xs text-brand-charcoal/55">
                  An interactive sample report will live here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PricingSection />
    </main>
  );
}
