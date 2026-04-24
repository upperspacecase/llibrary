import type { ReactNode } from "react";

export function PanelCard({
  title,
  subtitle,
  icon,
  action,
  children,
  span = 1,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  span?: 1 | 2 | 3;
}) {
  const spanClass =
    span === 3
      ? "md:col-span-3"
      : span === 2
        ? "md:col-span-2"
        : "md:col-span-1";

  return (
    <section
      className={`bg-white border border-black/10 p-5 flex flex-col gap-4 ${spanClass}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span
              className="material-symbols-outlined text-brand-forest"
              style={{ fontSize: 20 }}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <div>
            <h2 className="font-serif text-lg text-brand-charcoal leading-none">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] tracking-[0.1em] uppercase text-brand-charcoal/50 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export function PanelEmptyState({
  icon,
  title,
  hint,
}: {
  icon?: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-2 text-brand-charcoal/50">
      {icon && (
        <span
          className="material-symbols-outlined opacity-40"
          style={{ fontSize: 32 }}
          aria-hidden
        >
          {icon}
        </span>
      )}
      <p className="text-sm">{title}</p>
      {hint && <p className="text-[11px] max-w-[24ch]">{hint}</p>}
    </div>
  );
}

export function PanelError({ source, message }: { source: string; message: string }) {
  return (
    <div className="bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-900">
      <div className="font-black tracking-[0.1em] uppercase text-[10px] mb-1">
        {source} unavailable
      </div>
      <div>{message}</div>
    </div>
  );
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-black/5" />
      ))}
    </div>
  );
}
