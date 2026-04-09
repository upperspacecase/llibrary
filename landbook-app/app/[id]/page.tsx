import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import type { Landbook, ReportData } from "@/lib/types";

import { SideNav } from "@/components/landbook/SideNav";
import { CoverSection } from "@/components/landbook/CoverSection";
import { ExecutiveSummary } from "@/components/landbook/ExecutiveSummary";
import { EcosystemServices } from "@/components/landbook/EcosystemServices";
import { Scorecard } from "@/components/landbook/Scorecard";
import { TerrainSoil } from "@/components/landbook/TerrainSoil";
import { WaterSection } from "@/components/landbook/WaterSection";
import { ClimateSection } from "@/components/landbook/ClimateSection";
import { BiodiversitySection } from "@/components/landbook/BiodiversitySection";
import { AgricultureSection } from "@/components/landbook/AgricultureSection";
import { OpportunitiesSection } from "@/components/landbook/OpportunitiesSection";
import { RisksSection } from "@/components/landbook/RisksSection";
import { ResilienceSection } from "@/components/landbook/ResilienceSection";
import { RegionalContext } from "@/components/landbook/RegionalContext";
import { TrendsSection } from "@/components/landbook/TrendsSection";
import { MapPortfolio } from "@/components/landbook/MapPortfolio";
import { ComplianceSection } from "@/components/landbook/ComplianceSection";
import { NextSteps } from "@/components/landbook/NextSteps";
import { MethodologySection } from "@/components/landbook/MethodologySection";

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
            <ExecutiveSummary
              property={data.property}
              scores={data.scores}
              economics={data.economics}
              water={data.water}
              fire={data.fire}
              narratives={n.executiveSummary}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <EcosystemServices
              economics={data.economics}
              narratives={n.ecosystemServices}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <Scorecard
              scores={data.scores}
              narratives={n.scorecard}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <TerrainSoil
              terrain={data.terrain}
              soil={data.soil}
              geology={data.geology}
              narratives={n.terrain}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <WaterSection
              water={data.water}
              climate={data.climate}
              narratives={n.water}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ClimateSection
              climate={data.climate}
              narratives={n.climate}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <BiodiversitySection
              species={data.species}
              narratives={n.biodiversity}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <AgricultureSection
              agriculture={data.agriculture}
              narratives={n.agriculture}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <OpportunitiesSection
              economics={data.economics}
              narratives={n.opportunities}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RisksSection
              fire={data.fire}
              flood={data.flood}
              drought={data.drought}
              narratives={n.risks}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ResilienceSection
              energy={data.energy}
              narratives={n.resilience}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RegionalContext
              regional={data.regional}
              narratives={n.context}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <TrendsSection
              trends={data.trends}
              economics={data.economics}
              narratives={n.temporal}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <MapPortfolio maps={data.maps} />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ComplianceSection
              compliance={data.compliance}
              narratives={n.compliance}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <NextSteps
              actions={data.actions}
              narratives={n.nextSteps}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <MethodologySection
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
