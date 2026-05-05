export interface TreemapSegment {
  name: string;
  value: number;
  color: string;
}

export function Treemap({ segments }: { segments: TreemapSegment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;

  const sorted = [...segments].sort((a, b) => b.value - a.value);
  const pct = (v: number) => Math.round((v / total) * 100);

  // Top row holds the 3 largest; bottom row holds the long tail.
  const topRow = sorted.slice(0, 3);
  const bottomRow = sorted.slice(3);

  // Top row split — largest spans its own share of (largest + next two);
  // the other two stack on the right with heights proportional to their values.
  const topTotal = topRow.reduce((a, s) => a + s.value, 0) || 1;
  const leftWidth = (topRow[0].value / topTotal) * 100;
  const rightSecondTotal =
    (topRow[1]?.value ?? 0) + (topRow[2]?.value ?? 0) || 1;
  const secondHeight = topRow[2]
    ? ((topRow[1]?.value ?? 0) / rightSecondTotal) * 100
    : 100;
  const thirdHeight = topRow[2]
    ? ((topRow[2].value) / rightSecondTotal) * 100
    : 0;

  const bottomTotal = bottomRow.reduce((a, s) => a + s.value, 0) || 1;

  return (
    <div className="w-full h-[300px] flex flex-col gap-1 mb-8">
      {/* Top row */}
      <div className="flex flex-1 gap-1">
        <div
          className={`${topRow[0].color} p-4 flex flex-col justify-between`}
          style={{ width: `${leftWidth}%` }}
        >
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {topRow[0].name}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{pct(topRow[0].value)}%</span>
            <span className="text-sm font-semibold text-white/85">(&euro;{topRow[0].value.toLocaleString()})</span>
          </div>
        </div>
        {topRow.length > 1 && (
          <div className="flex-1 flex flex-col gap-1">
            {topRow[1] && (
              <div
                className={`${topRow[1].color} p-4 flex flex-col justify-between`}
                style={{ height: `${secondHeight}%` }}
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {topRow[1].name}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{pct(topRow[1].value)}%</span>
                  <span className="text-sm font-semibold text-white/85">(&euro;{topRow[1].value.toLocaleString()})</span>
                </div>
              </div>
            )}
            {topRow[2] && (
              <div
                className={`${topRow[2].color} p-4 flex flex-col justify-between`}
                style={{ height: `${thirdHeight}%` }}
              >
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {topRow[2].name}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-white">{pct(topRow[2].value)}%</span>
                  <span className="text-sm font-semibold text-white/85">(&euro;{topRow[2].value.toLocaleString()})</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Bottom row */}
      {bottomRow.length > 0 && (
        <div className="h-[25%] flex gap-1">
          {bottomRow.map((seg) => (
            <div
              key={seg.name}
              className={`${seg.color} p-4 flex items-center justify-between`}
              style={{ width: `${(seg.value / bottomTotal) * 100}%` }}
            >
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                {seg.name}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">{pct(seg.value)}%</span>
                <span className="text-xs font-semibold text-white/85">(&euro;{seg.value.toLocaleString()})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
