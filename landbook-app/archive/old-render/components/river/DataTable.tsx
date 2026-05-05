export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b-[0.5px] border-brand-sage">
          {headers.map((h) => (
            <th
              key={h}
              className="py-3 text-[10px] font-bold tracking-widest text-brand-sage uppercase text-left"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, ri) => (
          <tr key={ri} className="border-b-[0.5px] border-brand-sage/20">
            {cells.map((cell, ci) => (
              <td
                key={ci}
                className={`py-3 text-sm ${ci === 0 ? "font-bold text-brand-forest" : "text-brand-charcoal"}`}
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
