import type { Meta } from "@/lib/types";

/**
 * Wraps a BUILD component with a red background when
 * one of its required data sources failed (per meta.apiStatus).
 */
export function DataSourceError({
  meta,
  sources,
  children,
}: {
  meta: Meta;
  sources: string[];
  children: React.ReactNode;
}) {
  const status = meta.apiStatus || {};
  const failed = sources.filter((s) => status[s] && status[s] !== "ok");

  if (failed.length === 0) return <>{children}</>;

  return (
    <div className="border-2 border-red-400/60 bg-red-50 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span
          className="material-symbols-outlined text-red-500 shrink-0"
          style={{ fontSize: 16 }}
        >
          error
        </span>
        <span className="text-[10px] font-black tracking-[0.15em] uppercase text-red-500">
          DATA SOURCE UNAVAILABLE: {failed.join(", ")}
        </span>
      </div>
      <div className="opacity-50">{children}</div>
    </div>
  );
}
