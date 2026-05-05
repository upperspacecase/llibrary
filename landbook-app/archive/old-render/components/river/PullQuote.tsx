export function PullQuote({ text }: { text: string | undefined | null }) {
  if (!text) return null;
  return (
    <div className="flex justify-end py-4">
      <blockquote className="max-w-[320px] border-l-4 border-brand-terracotta pl-6 py-2">
        <p className="serif-title text-xl text-brand-forest leading-relaxed">
          &ldquo;{text}&rdquo;
        </p>
      </blockquote>
    </div>
  );
}
