export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  const lastIdx = headers.length - 1;
  return (
    <table className="w-full text-left border-separate border-spacing-0">
      <thead>
        <tr className="border-b-[0.5px] border-brand-sage">
          {headers.map((h, hi) => (
            <th
              key={h}
              className={`py-3 align-bottom text-[10px] font-bold tracking-widest text-brand-sage uppercase text-left border-b-[0.5px] border-brand-sage ${hi < lastIdx ? "pr-6" : ""}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, ri) => (
          <tr key={ri}>
            {cells.map((cell, ci) => (
              <td
                key={ci}
                className={`py-3 text-sm border-b-[0.5px] border-brand-sage/20 ${ci === 0 ? "font-bold text-brand-forest" : "text-brand-charcoal"} ${ci < lastIdx ? "pr-6" : ""}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
