"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SLIDES = [
  { src: "/landbook-slide-cover.jpg", alt: "LandBook cover page", w: 1000, h: 1101 },
  { src: "/landbook-slide-overview.jpg", alt: "LandBook overview page", w: 1000, h: 1391 },
  { src: "/landbook-slide-value.jpg", alt: "LandBook value and benefits page", w: 1000, h: 1359 },
  { src: "/landbook-slide-biodiversity.jpg", alt: "LandBook biodiversity and habitat page", w: 1000, h: 1378 },
];

const arrowClass =
  "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-charcoal shadow-md transition hover:bg-white";

export function SampleSlider({ label }: { label: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      6000
    );
    return () => clearInterval(t);
  }, [paused]);

  const go = (i: number) => setIndex((i + SLIDES.length) % SLIDES.length);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={label}
    >
      {/* Height follows the active slide so there's no dead whitespace. */}
      <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl">
        {SLIDES.map((s, i) => (
          <Image
            key={s.src}
            src={s.src}
            alt={s.alt}
            width={s.w}
            height={s.h}
            priority={i === 0}
            sizes="(min-width: 1400px) 900px, 100vw"
            className={
              i === index
                ? "relative h-auto w-full opacity-100 transition-opacity duration-500"
                : "pointer-events-none absolute left-0 top-0 h-auto w-full opacity-0 transition-opacity duration-500"
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Previous page"
        className={`${arrowClass} left-3`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Next page"
        className={`${arrowClass} right-3`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>

      <div className="mt-4 flex justify-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 w-2 rounded-full transition ${
              i === index ? "scale-125 bg-brand-charcoal" : "bg-brand-sage/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
