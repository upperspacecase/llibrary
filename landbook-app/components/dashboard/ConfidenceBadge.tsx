import type { ConfidenceScore, ConfidenceTier } from "@/lib/dashboard-types";
import { tierFromScore } from "@/lib/dashboard-types";

const TIER_STYLE: Record<
  ConfidenceTier,
  { label: string; filled: number; dot: string; text: string; bg: string }
> = {
  measured: {
    label: "Measured",
    filled: 5,
    dot: "bg-emerald-700",
    text: "text-emerald-800",
    bg: "bg-emerald-50",
  },
  proximate: {
    label: "Proximate",
    filled: 4,
    dot: "bg-blue-700",
    text: "text-blue-800",
    bg: "bg-blue-50",
  },
  satellite: {
    label: "Satellite",
    filled: 3,
    dot: "bg-purple-700",
    text: "text-purple-800",
    bg: "bg-purple-50",
  },
  modeled: {
    label: "Modeled",
    filled: 2,
    dot: "bg-amber-600",
    text: "text-amber-800",
    bg: "bg-amber-50",
  },
  estimated: {
    label: "Estimated",
    filled: 1,
    dot: "bg-rose-600",
    text: "text-rose-800",
    bg: "bg-rose-50",
  },
};

export function ConfidenceBadge({
  confidence,
  source,
  detail,
  compact = false,
}: {
  confidence: ConfidenceScore;
  source?: string;
  detail?: string;
  compact?: boolean;
}) {
  const tier = tierFromScore(confidence);
  const style = TIER_STYLE[tier];
  const dots = Array.from({ length: 5 }).map((_, i) => i < style.filled);
  const title = [style.label, source, detail].filter(Boolean).join(" — ");

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 ${style.bg} ${style.text}`}
    >
      <span className="flex items-center gap-[2px]" aria-hidden>
        {dots.map((filled, i) => (
          <span
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              filled ? style.dot : "bg-current opacity-20"
            }`}
          />
        ))}
      </span>
      {!compact && (
        <span className="text-[9px] font-black tracking-[0.15em] uppercase">
          {style.label}
        </span>
      )}
    </span>
  );
}

export function ConfidenceTierLabel({ tier }: { tier: ConfidenceTier }) {
  return <span>{TIER_STYLE[tier].label}</span>;
}
