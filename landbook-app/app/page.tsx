export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream/50">
      <div className="text-center">
        <h1 className="serif-title text-4xl text-brand-forest mb-4">LandBook</h1>
        <p className="text-brand-sage text-sm">
          Natural Capital Assessment Documents
        </p>
        <p className="text-brand-sage text-xs mt-4">
          Access a landbook at <code className="bg-brand-forest/10 px-2 py-1">/landbook/[id]</code>
        </p>
      </div>
    </main>
  );
}
