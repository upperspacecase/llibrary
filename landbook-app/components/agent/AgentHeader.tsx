import Link from "next/link";
import { cn } from "@/lib/utils";

type NavKey = "books" | "billing" | "settings";

const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "books", label: "My LandBooks", href: "/agent" },
  { key: "billing", label: "Billing", href: "/agent/billing" },
  { key: "settings", label: "Settings", href: "/agent/settings/branding" },
];

export function AgentHeader({ active = "books" }: { active?: NavKey }) {
  return (
    <header className="border-b border-brand-sage/25 bg-brand-cream/80 backdrop-blur">
      <div className="flex items-center justify-between px-8 py-4">
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
          <nav className="flex items-center gap-7 text-[12px] font-medium tracking-wide text-brand-charcoal/60">
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "pb-1 transition",
                  active === item.key
                    ? "text-brand-charcoal border-b border-brand-charcoal"
                    : "hover:text-brand-charcoal"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-brand-sage/40 px-3 py-1.5 text-[11px] text-brand-charcoal/70 hover:border-brand-charcoal"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="17" r=".5" fill="currentColor" />
            </svg>
            Help
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-forest text-[11px] font-semibold text-brand-cream">
            —
          </div>
        </div>
      </div>
    </header>
  );
}
