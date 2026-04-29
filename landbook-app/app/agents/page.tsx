import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Rural Agents | LandBook",
  description:
    "Show up to every listing pitch with a professional LandBook that builds trust with sellers and cuts buyer due diligence from weeks to days.",
};

const CREATE_URL = "https://www.landlibrary.co/create";

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
              For Rural Agents
            </p>

            <h1 className="serif-title mt-6 text-5xl leading-[1.05] text-brand-charcoal lg:text-6xl">
              Win more listings.
              <br />
              Close deals faster.
            </h1>

            <p className="mt-8 max-w-xl text-base leading-relaxed text-brand-charcoal/80">
              Show up to every listing pitch with a professional LandBook that
              instantly builds trust with sellers. Then hand buyers the same
              report to cut due diligence from weeks to days. One book. Two
              wins.
            </p>

            <p className="mt-6 max-w-xl text-base italic leading-relaxed text-brand-charcoal/70">
              For a limited time, we&apos;re offering complimentary Landbooks to
              select agents who meet our criteria.
            </p>

            <div className="mt-10">
              <a
                href={CREATE_URL}
                className="inline-flex items-center justify-center rounded-full border border-brand-charcoal px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-brand-charcoal transition hover:bg-brand-charcoal hover:text-brand-cream"
              >
                Get your first LandBook
              </a>
            </div>

            <p className="mt-4 text-xs text-brand-charcoal/50">
              Only 50 complimentary reports left this quarter.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div
              className="aspect-[210/297] w-full max-w-md rounded-sm border border-dashed border-brand-sage/60 bg-white/40"
              aria-label="LandBook sample placeholder"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
