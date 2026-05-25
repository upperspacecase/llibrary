import * as React from "react";
import { cn } from "@/lib/utils";

export const Eyebrow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p
    className={cn(
      "text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-charcoal/60",
      className
    )}
  >
    {children}
  </p>
);

export const SerifTitle = ({
  children,
  className,
  as: As = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) => (
  <As
    className={cn(
      "font-serif font-bold text-brand-charcoal",
      className
    )}
    style={{ fontFamily: "var(--font-libre), serif" }}
  >
    {children}
  </As>
);

type PillVariant = "primary" | "ghost" | "light";

export const PillButton = ({
  children,
  variant = "primary",
  className,
  icon,
  full,
  type = "button",
  ...rest
}: {
  children: React.ReactNode;
  variant?: PillVariant;
  className?: string;
  icon?: React.ReactNode;
  full?: boolean;
  type?: "button" | "submit" | "reset";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants: Record<PillVariant, string> = {
    primary:
      "bg-brand-charcoal text-brand-cream border-brand-charcoal hover:bg-transparent hover:text-brand-charcoal",
    ghost:
      "bg-transparent text-brand-charcoal border-brand-charcoal hover:bg-brand-charcoal hover:text-brand-cream",
    light:
      "bg-white text-brand-charcoal border-brand-sage/40 hover:border-brand-charcoal",
  };
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] transition",
        full && "w-full",
        variants[variant],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
};

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
      {label}
    </span>
    <div className="mt-2">{children}</div>
    {hint && (
      <span className="mt-1 block text-[11px] text-brand-charcoal/50">
        {hint}
      </span>
    )}
  </label>
);

export const TextInput = ({
  defaultValue,
  placeholder,
  className,
  icon,
  suffix,
  type = "text",
  name,
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  type?: string;
  name?: string;
}) => (
  <div
    className={cn(
      "flex items-center gap-2 border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal focus-within:border-brand-charcoal",
      className
    )}
  >
    {icon}
    <input
      type={type}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="w-full bg-transparent outline-none placeholder:text-brand-charcoal/35"
    />
    {suffix}
  </div>
);

export type StatusKind =
  | "Draft"
  | "Processing"
  | "Ready"
  | "Shared"
  | "Archived";

export const StatusPill = ({ status }: { status: StatusKind }) => {
  const styles: Record<StatusKind, string> = {
    Draft: "bg-brand-sage/15 text-brand-charcoal/70",
    Processing: "bg-brand-amber/25 text-brand-charcoal",
    Ready: "bg-brand-forest/15 text-brand-forest",
    Shared: "bg-brand-charcoal/90 text-brand-cream",
    Archived: "bg-brand-charcoal/10 text-brand-charcoal/50",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
        styles[status]
      )}
    >
      {status === "Processing" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-terracotta" />
      )}
      {status === "Ready" && (
        <span className="h-1.5 w-1.5 rounded-full bg-brand-forest" />
      )}
      {status}
    </span>
  );
};

const svg = (path: React.ReactNode, strokeWidth = 2) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
  >
    {path}
  </svg>
);

export const Icon = {
  Plus: () => svg(<path d="M12 5v14M5 12h14" />),
  Search: () =>
    svg(
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
  Mail: () =>
    svg(
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m2 7 10 6 10-6" />
      </>
    ),
  Lock: () =>
    svg(
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
  ArrowRight: () => svg(<path d="M5 12h14M13 5l7 7-7 7" />),
  Check: () => svg(<path d="M20 6 9 17l-5-5" />, 2.5),
  Upload: () =>
    svg(
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
      </>
    ),
  Pencil: () =>
    svg(
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  Eye: () =>
    svg(
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  Share: () =>
    svg(
      <>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </>
    ),
  Phone: () =>
    svg(
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    ),
  Chat: () =>
    svg(
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    ),
  MapPin: () =>
    svg(
      <>
        <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  Clock: () =>
    svg(
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
  Download: () =>
    svg(
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m7 10 5 5 5-5" />
        <path d="M12 15V3" />
      </>
    ),
  Copy: () =>
    svg(
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
  Image: () =>
    svg(
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
      </>
    ),
  File: () =>
    svg(
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </>
    ),
};
