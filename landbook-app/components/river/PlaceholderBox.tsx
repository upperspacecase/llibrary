export function PlaceholderBox({
  id,
  title,
  status,
  synthetic,
  children,
}: {
  id: string;
  title: string;
  status: string;
  synthetic?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#FFFBEB] p-5 mb-6">
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined text-brand-terracotta shrink-0"
          style={{ fontSize: 18 }}
        >
          {synthetic ? "science" : "construction"}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-terracotta">
              {id}
            </span>
            {synthetic && (
              <span className="text-[9px] font-black tracking-[0.15em] uppercase bg-brand-terracotta/15 text-brand-terracotta px-2 py-0.5">
                SYNTHETIC ESTIMATE
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-brand-forest mb-1">{title}</div>
          <div className="text-[11px] text-brand-terracotta/80 uppercase tracking-wide font-bold">
            {status}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}
