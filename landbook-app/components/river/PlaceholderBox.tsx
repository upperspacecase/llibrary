export function PlaceholderBox({
  id,
  title,
  status,
}: {
  id: string;
  title: string;
  status: string;
}) {
  return (
    <div className="border-2 border-brand-terracotta/60 bg-brand-terracotta/5 p-5 mb-6">
      <div className="flex items-start gap-3">
        <span
          className="material-symbols-outlined text-brand-terracotta shrink-0"
          style={{ fontSize: 18 }}
        >
          construction
        </span>
        <div>
          <div className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-terracotta mb-1">
            {id}
          </div>
          <div className="text-sm font-bold text-brand-forest mb-1">{title}</div>
          <div className="text-[11px] text-brand-terracotta/80 uppercase tracking-wide font-bold">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
