import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import type { Landbook } from "@/lib/types";
import { SensorMapPanel } from "@/components/dashboard/panels/SensorMapPanel";
import { WeatherPanel } from "@/components/dashboard/panels/WeatherPanel";
import { SoilPanel } from "@/components/dashboard/panels/SoilPanel";
import { WaterPanel } from "@/components/dashboard/panels/WaterPanel";
import { SpeciesPanel } from "@/components/dashboard/panels/SpeciesPanel";
import { HistoricPanel } from "@/components/dashboard/panels/HistoricPanel";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";

export const dynamic = "force-dynamic";

async function getLandbook(id: string): Promise<Landbook | null> {
  const col = await getCollection("landbooks");
  const doc = await col.findOne({ id });
  if (doc) return JSON.parse(JSON.stringify(doc)) as Landbook;

  const subs = await getCollection("submissions");
  const sub = await subs.findOne({ id });
  if (!sub) return null;
  const plain = JSON.parse(JSON.stringify(sub));
  plain.address = plain.address || plain.postcode || "";
  return plain as Landbook;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lb = await getLandbook(id);
  if (!lb) return { title: "Dashboard Not Found" };
  const name = lb.data?.property?.name || lb.address || "Property";
  return { title: `${name} · Dashboard | LandBook` };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const landbook = await getLandbook(id);
  if (!landbook) notFound();

  const name = landbook.data?.property?.name || landbook.address || "Property";
  const rawCenter =
    landbook.center && typeof landbook.center.lat === "number" && typeof landbook.center.lng === "number"
      ? landbook.center
      : landbook.data?.property?.coords;
  const center =
    rawCenter && typeof rawCenter.lat === "number" && typeof rawCenter.lng === "number"
      ? { lat: rawCenter.lat, lng: rawCenter.lng }
      : null;

  if (!center) {
    return (
      <main className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
        <div className="bg-white border border-black/10 p-6 max-w-md text-center">
          <h1 className="font-serif text-xl text-brand-charcoal mb-2">
            Dashboard unavailable
          </h1>
          <p className="text-sm text-brand-charcoal/60">
            This landbook has no boundary or coordinates recorded, so the
            dashboard cannot be generated.
          </p>
          <a
            href={`/${id}`}
            className="inline-block mt-4 text-sm text-brand-forest underline"
          >
            View LandBook report instead
          </a>
        </div>
      </main>
    );
  }

  const { lat, lng } = center;
  const area = landbook.area ?? 0;
  const boundary = landbook.boundary ?? [];

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="border-b border-black/10 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-brand-charcoal/50">
              LandBook Dashboard
            </p>
            <h1 className="font-serif text-3xl text-brand-charcoal mt-1">
              {name}
            </h1>
            <p className="text-sm text-brand-charcoal/60 mt-1">
              {landbook.address}
            </p>
          </div>
          <dl className="flex gap-6 text-right">
            <div>
              <dt className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
                Area
              </dt>
              <dd className="font-serif text-xl text-brand-charcoal">
                {area ? `${Number(area).toFixed(2)} ha` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] uppercase text-brand-charcoal/50">
                Coordinates
              </dt>
              <dd className="font-mono text-xs text-brand-charcoal">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <RecommendedActions landbookId={id} />
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <SensorMapPanel
          landbookId={id}
          boundary={boundary}
          center={center}
        />
        <WeatherPanel landbookId={id} lat={lat} lng={lng} />
        <SoilPanel landbookId={id} lat={lat} lng={lng} />
        <WaterPanel landbookId={id} lat={lat} lng={lng} />
        <SpeciesPanel landbookId={id} lat={lat} lng={lng} />
        <HistoricPanel landbookId={id} lat={lat} lng={lng} />
      </div>
    </main>
  );
}
