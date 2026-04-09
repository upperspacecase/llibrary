import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import type { Landbook, ReportData } from "@/lib/types";

import { SideNav } from "@/components/landbook/SideNav";
import { CoverSection } from "@/components/landbook/CoverSection";
import {
  OverviewSection,
  RegionEcosystemSection,
  MapsLayersSection,
  LandWaterSection,
  BiodiversityHabitatSection,
  ClimateSeasonsSection,
  ValueBenefitsSection,
  LandUseSection,
  HistoryTrendsSection,
  RisksResilienceSection,
  FutureScenariosSection,
  RecommendationsSection,
  YourKnowledgeSection,
  SourcesMethodologySection,
} from "@/components/landbook/sections";

export const dynamic = "force-dynamic";

async function getLandbook(id: string): Promise<Landbook | null> {
  const col = await getCollection("landbooks");
  const doc = await col.findOne({ id });
  if (doc) return JSON.parse(JSON.stringify(doc)) as Landbook;

  // Fall back to submissions collection (same as /api/landbooks/[id])
  const subs = await getCollection("submissions");
  const sub = await subs.findOne({ id });
  if (!sub) return null;

  const plain = JSON.parse(JSON.stringify(sub));
  plain.address = plain.address || plain.postcode || "";
  return plain as Landbook;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const landbook = await getLandbook(id);
  if (!landbook) return { title: "LandBook Not Found" };
  const name = landbook.data?.property?.name || landbook.address || "Property";
  return {
    title: `${name} | LandBook`,
    description: `Natural Capital Assessment for ${name}`,
  };
}

export default async function LandbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const landbook = await getLandbook(id);
  if (!landbook) notFound();

  const data = landbook.data;

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-cream/50">
        <div className="text-center">
          <h1 className="serif-title text-2xl text-brand-forest mb-4">No Data Yet</h1>
          <p className="text-brand-sage text-sm">
            This landbook has not been processed yet. Run the data pipeline to populate it.
          </p>
        </div>
      </main>
    );
  }

  const n = data.narratives || {};
  const propertyName = data.property?.name || "Property";

  return (
    <div className="flex min-h-screen">
      <SideNav propertyName={propertyName} />
      <main className="flex-1 min-h-screen bg-brand-cream p-12 lg:p-24 overflow-y-auto print:p-0 print:bg-white">
        {/* Cover page */}
        <div className="max-w-[800px] mx-auto shadow-2xl bg-white mb-12 print:shadow-none print:mb-0">
          <CoverSection
            property={data.property}
            maps={data.maps}
            scores={data.scores}
            meta={data.meta}
          />
        </div>

        {/* Section pages */}
        <div className="max-w-[800px] mx-auto space-y-12">
          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <OverviewSection
              property={data.property}
              scores={data.scores}
              economics={data.economics}
              water={data.water}
              fire={data.fire}
              maps={data.maps}
              narratives={n.executiveSummary}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RegionEcosystemSection
              regional={data.regional}
              narratives={n.context}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <MapsLayersSection maps={data.maps} />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <LandWaterSection
              terrain={data.terrain}
              soil={data.soil}
              geology={data.geology}
              water={data.water}
              climate={data.climate}
              drought={data.drought}
              narratives={{ terrain: n.terrain, water: n.water }}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <BiodiversityHabitatSection
              species={data.species}
              agriculture={data.agriculture}
              regional={data.regional}
              economics={data.economics}
              scores={data.scores}
              narratives={n.biodiversity}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ClimateSeasonsSection
              climate={data.climate}
              energy={data.energy}
              trends={data.trends}
              narratives={n.climate}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ValueBenefitsSection
              economics={data.economics}
              scores={data.scores}
              narratives={{ ecosystemServices: n.ecosystemServices, methodology: n.methodology }}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <LandUseSection
              agriculture={data.agriculture}
              compliance={data.compliance}
              economics={data.economics}
              narratives={{ agriculture: n.agriculture, compliance: n.compliance }}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <HistoryTrendsSection
              trends={data.trends}
              economics={data.economics}
              fire={data.fire}
              narratives={n.temporal}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RisksResilienceSection
              fire={data.fire}
              flood={data.flood}
              drought={data.drought}
              energy={data.energy}
              trends={data.trends}
              narratives={{ risks: n.risks, resilience: n.resilience }}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <FutureScenariosSection
              economics={data.economics}
              narratives={n.opportunities}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RecommendationsSection
              actions={data.actions}
              narratives={n.nextSteps}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <YourKnowledgeSection />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <SourcesMethodologySection
              meta={data.meta}
              narratives={n.methodology}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-[800px] mx-auto pt-8 pb-4">
          <div className="flex justify-between text-[10px] text-brand-sage">
            <span>LandBook &middot; Natural Capital Assessment</span>
            <span>{data.property.name}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
