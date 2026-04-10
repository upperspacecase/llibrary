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
    <div className="flex items-center gap-3 mb-6 mt-10 first:mt-0">
      <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-sage font-body">
        {id}
      </div>
      <div className="text-sm font-bold text-brand-forest font-body">{title}</div>
      <div className="flex gap-1 ml-auto">
        {sources.map((s) => (
          <DataSourceBadge key={s} source={s} />
        ))}
      </div>
    </div>
  );
}
