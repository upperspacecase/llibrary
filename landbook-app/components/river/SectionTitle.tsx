export function SectionTitle({ title }: { title: string }) {
  return (
    <header className="mb-12">
      <div className="border-b-[0.5pt] border-outline-variant pb-8">
        <h1 className="font-serif text-[1.95rem] font-bold text-brand-forest leading-tight">
          {title}
        </h1>
      </div>
    </header>
  );
}
