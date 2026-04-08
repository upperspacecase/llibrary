const COLORS: Record<string, string> = {
  forest: "#3f6653",
  amber: "#D4A574",
  terracotta: "#C4705A",
  sage: "#8B9A7E",
};

function fmt(v: unknown): string {
  if (v == null || v === "") return "\u2014";
  return String(v);
}

export function Gauge({
  value,
  max,
  color = "forest",
  label,
}: {
  value: number | null | undefined;
  max: number;
  color?: string;
  label: string;
}) {
  const fraction = Math.min(Math.max((value || 0) / max, 0), 1);
  const halfCircle = 141.37;
  const full = 282.74;
  const filled = halfCircle * fraction;
  const stroke = COLORS[color] || COLORS.forest;

  return (
    <div className="text-center">
      <div className="relative w-32 h-16 mx-auto overflow-hidden">
        <svg
          className="gauge-svg w-32 h-32 absolute top-0 left-0"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="#E7EEFE" strokeWidth="10"
            strokeDasharray={`${halfCircle} ${full}`}
          />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={stroke} strokeWidth="10"
            strokeDasharray={`${filled} ${full}`}
          />
        </svg>
        <div className="absolute bottom-0 w-full text-center">
          <span className="text-lg font-bold text-brand-forest">{fmt(value)}</span>
        </div>
      </div>
      <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase mt-2">
        {label}
      </p>
    </div>
  );
}
