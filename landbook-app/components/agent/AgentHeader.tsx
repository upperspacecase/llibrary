"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { FeedbackModal } from "./FeedbackModal";

type NavKey = "books" | "billing" | "settings";

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "books", label: "My LandBooks", href: "/agent" },
  { key: "billing", label: "Billing", href: "/agent/billing" },
  { key: "settings", label: "Settings", href: "/agent/settings/branding" },
];

const HELP_HREF = "mailto:hi@landlibrary.co?subject=LandBook%20Help";

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border border-brand-sage/40 px-3 py-1.5 text-[12px] text-brand-charcoal/70 transition hover:border-brand-charcoal";

export function AgentHeader({ active = "books" }: { active?: NavKey }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <header className="border-b border-brand-sage/25 bg-brand-cream/80 backdrop-blur">
      <div className="flex items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-10">
          <Link href="/agent" className="flex items-baseline gap-2">
            <span
              className="font-serif text-xl font-bold tracking-tight text-brand-charcoal"
              style={{ fontFamily: "var(--font-libre), serif" }}
            >
              LandBook
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-sage">
              Agents
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[18px] font-medium tracking-wide text-brand-charcoal/60 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "pb-1 transition",
                  active === item.key
                    ? "border-b border-brand-charcoal text-brand-charcoal"
                    : "hover:text-brand-charcoal"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-4 md:flex">
          <a href={HELP_HREF} className={pillClass}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r=".5" fill="currentColor" />
            </svg>
            Help
          </a>
          <button type="button" onClick={() => setFeedbackOpen(true)} className={pillClass}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Feedback
          </button>
          <UserMenu />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-sage/40 text-brand-charcoal md:hidden"
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-brand-sage/25 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-[18px] font-medium text-brand-charcoal/70">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(active === item.key && "text-brand-charcoal")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col items-start gap-3 border-t border-brand-sage/20 pt-4">
            <a href={HELP_HREF} className={pillClass}>
              Help
            </a>
            <button
              type="button"
              onClick={() => {
                setFeedbackOpen(true);
                setMobileOpen(false);
              }}
              className={pillClass}
            >
              Feedback
            </button>
            <UserMenu />
          </div>
        </div>
      )}

      {feedbackOpen && (
        <FeedbackModal source="Agent dashboard" onClose={() => setFeedbackOpen(false)} />
      )}
    </header>
  );
}
