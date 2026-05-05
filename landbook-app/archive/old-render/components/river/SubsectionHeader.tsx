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
      <div className="text-sm font-bold text-brand-forest font-body">{title}</div>
    </div>
  );
}
