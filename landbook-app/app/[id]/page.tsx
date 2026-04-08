import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import type { Landbook, ReportData } from "@/lib/types";

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
  let doc = await col.findOne({ id });
  if (!doc) {
    // Fall back to submissions collection (same as /api/landbooks/[id])
    const subs = await getCollection("submissions");
    const sub = await subs.findOne({ id });
    if (sub) {
      doc = { ...sub, address: (sub as Record<string, unknown>).address || (sub as Record<string, unknown>).postcode || "" } as typeof doc;
    }
  }
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc)) as Landbook;
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

  return (
    <main className="min-h-screen bg-brand-cream/50 py-12 print:py-0 print:bg-white">
      <div className="a4-page mx-auto bg-brand-cream print:shadow-none" style={{ width: "210mm" }}>
        {/* Cover — full bleed, no padding */}
        <CoverSection
          property={data.property}
          maps={data.maps}
          scores={data.scores}
          meta={data.meta}
        />

        {/* Sections — padded like A4 document */}
        <div className="px-[15%] py-[10%] space-y-16">
          <ExecutiveSummary
            property={data.property}
            scores={data.scores}
            economics={data.economics}
            water={data.water}
            fire={data.fire}
            narratives={n.executiveSummary}
          />

          <EcosystemServices
            economics={data.economics}
            narratives={n.ecosystemServices}
          />

          <Scorecard
            scores={data.scores}
            narratives={n.scorecard}
          />

          <TerrainSoil
            terrain={data.terrain}
            soil={data.soil}
            geology={data.geology}
            narratives={n.terrain}
          />

          <WaterSection
            water={data.water}
            climate={data.climate}
            narratives={n.water}
          />

          <ClimateSection
            climate={data.climate}
            narratives={n.climate}
          />

          <BiodiversitySection
            species={data.species}
            narratives={n.biodiversity}
          />

          <AgricultureSection
            agriculture={data.agriculture}
            narratives={n.agriculture}
          />

          <OpportunitiesSection
            economics={data.economics}
            narratives={n.opportunities}
          />

          <RisksSection
            fire={data.fire}
            flood={data.flood}
            drought={data.drought}
            narratives={n.risks}
          />

          <ResilienceSection
            energy={data.energy}
            narratives={n.resilience}
          />

          <RegionalContext
            regional={data.regional}
            narratives={n.context}
          />

          <TrendsSection
            trends={data.trends}
            economics={data.economics}
            narratives={n.temporal}
          />

          <MapPortfolio maps={data.maps} />

          <ComplianceSection
            compliance={data.compliance}
            narratives={n.compliance}
          />

          <NextSteps
            actions={data.actions}
            narratives={n.nextSteps}
          />

          <MethodologySection
            meta={data.meta}
            narratives={n.methodology}
          />
        </div>

        {/* Footer */}
        <footer className="px-[15%] pb-12">
          <div className="hairline mb-6 opacity-50" />
          <div className="flex justify-between text-[10px] text-brand-sage">
            <span>LandBook &middot; Natural Capital Assessment</span>
            <span>{data.property.name}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
