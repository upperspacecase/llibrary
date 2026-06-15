"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PillButton, Icon } from "@/components/agent/primitives";
import { AGENT_AGREEMENT_VERSION } from "@/lib/agent/agreement";
import { acceptAgreement } from "@/app/agent/welcome/actions";

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55">
        {heading}
      </h3>
      <div className="mt-1.5 space-y-2 text-[13px] leading-relaxed text-brand-charcoal/80">
        {children}
      </div>
    </div>
  );
}

export function AgreementGate() {
  const [license, setLicense] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onAccept() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptAgreement(license, agreed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-brand-forest/10 px-4 py-10">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-brand-sage/30 bg-white shadow-2xl">
        <div className="border-b border-brand-sage/20 px-8 pt-8 pb-5">
          <h1 className="serif-title text-2xl text-brand-charcoal">
            LandBook Agent Agreement
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-brand-charcoal/60">
            Welcome to LandBook. Before accessing your first property report,
            please review and accept our terms.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-8 py-6">
          <Section heading="What you're agreeing to">
            <p>
              LandBook provides property intelligence reports to help you list,
              market, and sell land. You pay only when the property sells.
            </p>
          </Section>

          <Section heading="Payment">
            <p>
              You pay only when the property sells. The Report Fee is due within
              30 days of the property&rsquo;s sale completion. No sale = no fee.
            </p>
            <p>You must notify us of the sale within 7 days of completion.</p>
          </Section>

          <Section heading="VAT">
            <p>
              If you provide a valid EU VAT ID, we invoice at 0% VAT (reverse
              charge). If you do not have a valid EU VAT ID, we add 24% Estonian
              VAT. Payment is by SEPA bank transfer.
            </p>
          </Section>

          <Section heading="Your responsibilities">
            <p>
              You confirm you hold a valid real estate license in your
              jurisdiction. You will provide accurate property data. You will not
              resell or redistribute our reports.
            </p>
            <p>
              For residential sales to consumers, you must give the buyer a clear
              written disclaimer that our report is an informational tool only —
              not a legal, structural, or environmental guarantee.
            </p>
          </Section>

          <Section heading="Data">
            <p>
              We process data under GDPR. You confirm you have lawful grounds to
              share any owner or buyer data with us.
            </p>
          </Section>

          <Section heading="Important limits">
            <p>
              Our reports are based on public records and automated analysis. They
              do not replace legal due diligence, surveys, or engineering advice.
              We are not a party to your property transactions.
            </p>
          </Section>

          <Section heading="Complaints">
            <p>
              If you have a complaint about our service, contact us at
              [complaints@landbook.com]. We acknowledge complaints within 2
              business days.
            </p>
          </Section>

          <div className="rounded border border-brand-sage/30 bg-brand-cream/40 p-4 text-[13px] leading-relaxed text-brand-charcoal/80">
            <p className="font-semibold text-brand-charcoal">
              By clicking &ldquo;I Agree,&rdquo; you confirm:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>You have read and understood these terms</li>
              <li>You have authority to bind your agency</li>
              <li>You agree to the full agreement linked below</li>
            </ol>
          </div>

          <Link
            href="/agent/agreement"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-forest underline underline-offset-2"
          >
            Read Full LandBook Agent Agreement
          </Link>
        </div>

        <div className="border-t border-brand-sage/20 px-8 py-6">
          <label className="flex items-start gap-3 text-[13px] text-brand-charcoal/85">
            <input
              type="checkbox"
              checked={license}
              onChange={(e) => setLicense(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-forest"
            />
            <span>I hold a valid real estate license in my jurisdiction</span>
          </label>
          <label className="mt-3 flex items-start gap-3 text-[13px] text-brand-charcoal/85">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-forest"
            />
            <span>
              I have read and agree to the LandBook Agent Agreement (v
              {AGENT_AGREEMENT_VERSION})
            </span>
          </label>

          {error && (
            <p className="mt-3 text-[12px] text-brand-terracotta" role="alert">
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[10px] leading-snug text-brand-charcoal/45">
              Contract governed by Estonian law.
              <br />
              Electronic acceptance per eIDAS.
            </p>
            <PillButton
              variant="primary"
              icon={<Icon.ArrowRight />}
              onClick={onAccept}
              disabled={!license || !agreed || pending}
              className="disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Accept & Continue"}
            </PillButton>
          </div>
        </div>
      </div>
    </main>
  );
}
