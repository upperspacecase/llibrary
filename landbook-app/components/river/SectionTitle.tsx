export function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h1 className="serif-title text-[24px] text-brand-forest mb-4">{title}</h1>
      <div className="hairline" />
    </div>
  );
}
