export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-cream/50">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-forest/10 flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-brand-forest text-3xl animate-pulse">
            description
          </span>
        </div>
        <h1 className="serif-title text-xl text-brand-forest mb-2">Loading LandBook</h1>
        <p className="text-brand-sage text-sm">Preparing your assessment document...</p>
      </div>
    </main>
  );
}
