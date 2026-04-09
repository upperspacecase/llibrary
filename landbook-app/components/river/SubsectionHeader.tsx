import { DataSourceBadge } from "./DataSourceBadge";

export function SubsectionHeader({
  id,
  title,
  sources,
}: {
  id: string;
  title: string;
  sources: Array<"Pipeline" | "Computed" | "AI" | "User" | "Static" | "NEW">;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <div className="text-[10px] font-black tracking-[0.15em] uppercase text-brand-sage">
        {id}
      </div>
      <div className="text-sm font-bold text-brand-forest">{title}</div>
      <div className="flex gap-1 ml-auto">
        {sources.map((s) => (
          <DataSourceBadge key={s} source={s} />
        ))}
      </div>
    </div>
  );
}
