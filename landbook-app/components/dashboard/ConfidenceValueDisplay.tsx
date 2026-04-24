import type { ConfidenceValue } from "@/lib/dashboard-types";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function ConfidenceValueDisplay({
  label,
  cv,
  format,
}: {
  label: string;
  cv: ConfidenceValue | null | undefined;
  format?: (v: number | string | null) => string;
}) {
  const empty = !cv || cv.value === null || cv.value === undefined;
  const formatted = empty
    ? "—"
    : format
      ? format(cv.value)
      : String(cv.value);

  return (
    <div className="flex flex-col gap-1 py-2 border-b border-black/5 last:border-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-black tracking-[0.15em] uppercase text-brand-charcoal/60">
          {label}
        </span>
        {cv && !empty && (
          <ConfidenceBadge
            confidence={cv.confidence}
            source={cv.source}
            detail={cv.sourceDetail}
            compact
          />
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-2xl text-brand-charcoal">
          {formatted}
        </span>
        {cv?.unit && (
          <span className="text-sm text-brand-charcoal/60">{cv.unit}</span>
        )}
      </div>
      {cv?.source && !empty && (
        <span className="text-[10px] text-brand-charcoal/50">
          {cv.source}
          {cv.timestamp ? ` · ${new Date(cv.timestamp).toLocaleDateString()}` : ""}
        </span>
      )}
    </div>
  );
}
