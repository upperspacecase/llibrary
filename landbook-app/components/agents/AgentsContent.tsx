"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { COPY, type Lang } from "./copy";
import { SampleSlider } from "./SampleSlider";
import { PricingSection } from "./PricingSection";

export function AgentsContent({
  complimentaryLeft,
}: {
  complimentaryLeft: number;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const c = COPY[lang];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function scrollToPricing() {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-brand-cream">
      <div className="mx-auto flex max-w-[1600px] justify-end px-4 pt-6 sm:px-6 lg:px-12">
        <div ref={langRef} className="relative text-[13px]">
          <button
            type="button"
            onClick={() => setLangOpen((o) => !o)}
            aria-expanded={langOpen}
            className="flex items-center gap-1 rounded-full border border-brand-sage/40 bg-white px-3 py-1.5 font-semibold text-brand-charcoal transition hover:bg-black/[0.04]"
          >
            {lang.toUpperCase()}
            <svg
              className={`transition-transform ${langOpen ? "rotate-180" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            className={`absolute right-0 top-[calc(100%+6px)] min-w-full overflow-hidden rounded-lg border border-brand-sage/40 bg-white shadow-lg transition ${
              langOpen
                ? "visible translate-y-0 opacity-100"
                : "invisible -translate-y-1 opacity-0"
            }`}
          >
            {(["en", "pt"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLang(l);
                  setLangOpen(false);
                }}
                className={`block w-full px-4 py-2 text-left font-medium text-brand-charcoal transition hover:bg-black/[0.04] ${
                  lang === l ? "pointer-events-none font-bold opacity-40" : ""
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 sm:py-12 lg:px-12 lg:py-16">
        <div className="grid gap-10 sm:gap-12 min-[1400px]:grid-cols-[380px_minmax(900px,1fr)] min-[1400px]:gap-16">
          <div className="min-[1400px]:sticky min-[1400px]:top-24 min-[1400px]:self-start">
            <Image
              src="/landbook-logo.png"
              alt="LandBook"
              width={2000}
              height={600}
              priority
              className="mb-8 h-[38px] w-auto sm:mb-12 sm:h-12"
            />

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
              {c.hero.eyebrow}
            </p>

            <h1 className="serif-title mt-6 text-4xl leading-[1.05] text-brand-charcoal sm:text-5xl lg:text-6xl">
              {c.hero.headline[0]}
              <br />
              {c.hero.headline[1]}
            </h1>

            <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-brand-charcoal/80 sm:mt-8">
              {c.hero.body}
            </p>

            <p className="mt-6 max-w-xl text-[19px] italic leading-relaxed text-brand-charcoal/70">
              {c.hero.complimentary}
            </p>

            <div className="mt-8 sm:mt-10">
              <button
                type="button"
                onClick={scrollToPricing}
                className="inline-flex w-full items-center justify-center rounded-full border border-brand-charcoal bg-brand-charcoal px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal sm:w-auto"
              >
                {c.hero.cta}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-brand-charcoal/50">
              {c.hero.complimentaryLeft.replace("{n}", String(complimentaryLeft))}
            </p>
          </div>

          <div className="mx-auto w-full max-w-[600px]">
            <SampleSlider label={c.sampleLabel} />
          </div>
        </div>
      </div>

      <PricingSection copy={c.pricing} />
    </main>
  );
}
