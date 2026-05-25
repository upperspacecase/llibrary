import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow, SerifTitle } from "@/components/agent/primitives";
import SignInForm from "@/components/agent/SignInForm";

export const metadata: Metadata = {
  title: "Sign in · LandBook Agents",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: form */}
        <div className="flex flex-col justify-between px-10 py-12 lg:px-16 lg:py-14">
          <Link href="/agent" className="flex items-baseline gap-2">
            <span
              className="font-serif text-2xl font-bold tracking-tight text-brand-charcoal"
              style={{ fontFamily: "var(--font-libre), serif" }}
            >
              LandBook
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-sage">
              Agents
            </span>
          </Link>

          <div className="max-w-sm py-12">
            <Eyebrow>Welcome back</Eyebrow>
            <SerifTitle className="mt-5 text-4xl leading-tight">
              Sign in to your
              <br />
              LandBook account.
            </SerifTitle>

            <SignInForm />
          </div>

          <div className="text-[11px] text-brand-charcoal/50">
            New here?{" "}
            <Link
              href="/agents"
              className="text-brand-charcoal underline underline-offset-2"
            >
              Create an agent account
            </Link>
          </div>
        </div>

        {/* Right: image panel */}
        <div className="relative hidden overflow-hidden bg-brand-forest lg:block">
          <div className="absolute inset-0 bg-brand-forest" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(212,165,116,0.35), transparent 55%), radial-gradient(circle at 70% 80%, rgba(139,154,126,0.4), transparent 60%)",
            }}
          />
          <div className="relative flex h-full flex-col justify-end p-14 text-brand-cream">
            <Eyebrow className="text-brand-cream/70">For rural agents</Eyebrow>
            <p
              className="mt-4 max-w-md font-serif text-2xl italic leading-snug"
              style={{ fontFamily: "var(--font-libre), serif" }}
            >
              Every listing pitch, with a professional LandBook that builds
              trust with sellers and cuts buyer due diligence from weeks to
              days.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
