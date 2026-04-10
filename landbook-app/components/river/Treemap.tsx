export interface TreemapSegment {
  name: string;
  value: number;
  color: string;
}

export function Treemap({ segments }: { segments: TreemapSegment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  // Sort descending by value
  const sorted = [...segments].sort((a, b) => b.value - a.value);
  const pct = (v: number) => Math.round((v / total) * 100);

  // Split into top row (first 3) and bottom row (rest)
  const topRow = sorted.slice(0, 3);
  const bottomRow = sorted.slice(3);

  return (
    <div className="w-full h-[300px] flex flex-col gap-1 mb-8">
      {/* Top row */}
      <div className="flex flex-1 gap-1">
        {/* Largest block on left */}
        <div
          className={`${topRow[0].color} p-4 flex flex-col justify-between`}
          style={{ width: `${pct(topRow[0].value)}%` }}
        >
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {topRow[0].name}
          </span>
          <span className="text-xl font-bold text-white">{pct(topRow[0].value)}%</span>
        </div>
        {/* Right side: 2 stacked blocks */}
        {topRow.length > 1 && (
          <div className="flex-1 flex flex-col gap-1">
            {topRow[1] && (
              <div className={`${topRow[1].color} p-4 flex flex-col justify-between flex-1`}>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {topRow[1].name}
                </span>
                <span className="text-xl font-bold text-white">{pct(topRow[1].value)}%</span>
              </div>
            )}
            {topRow[2] && (
              <div
                className={`${topRow[2].color} p-4 flex flex-col justify-between`}
                style={{ height: "40%" }}
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {topRow[2].name}
                </span>
                <span className="text-lg font-bold text-white">{pct(topRow[2].value)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <div className="h-[25%] flex gap-1">
          {bottomRow.map((seg, i) => (
            <div
              key={seg.name}
              className={`${seg.color} p-4 flex items-center justify-between`}
              style={{
                width:
                  i === bottomRow.length - 1
                    ? undefined
                    : `${(seg.value / bottomRow.reduce((a, s) => a + s.value, 0)) * 100}%`,
                flex: i === bottomRow.length - 1 ? 1 : undefined,
              }}
            >
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                {seg.name}
              </span>
              <span className="text-lg font-bold text-white">{pct(seg.value)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
