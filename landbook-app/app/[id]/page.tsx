import { notFound } from "next/navigation";
import { getCollection } from "@/lib/db";
import { applyOverrides, loadOverrideFields } from "@/lib/landbook-overrides";
import type { Landbook, ReportData } from "@/lib/types";

import { SideNav } from "@/components/landbook/SideNav";
import { CoverSection } from "@/components/landbook/CoverSection";
import { RegenerateButton } from "@/components/landbook/RegenerateButton";
import {
  OverviewSection,
  RegionEcosystemSection,
  LandWaterSection,
  BiodiversityHabitatSection,
  ClimateSeasonsSection,
  ValueBenefitsSection,
  HistoryTrendsSection,
  RisksResilienceSection,
  FutureScenariosSection,
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

/**
 * Try to assemble ReportData from the 3-layer collections (facts + reports).
 * Falls back to null if the collections aren't populated yet.
 * Also detects whether narratives are stale relative to current facts.
 */
async function getReportDataFromLayers(id: string): Promise<{ data: ReportData; narrativesStale: boolean } | null> {
  try {
    const factsCol = await getCollection("facts");
    const reportsCol = await getCollection("reports");

    const factDoc = await factsCol.findOne({ landbookId: id });
    if (!factDoc) return null;

    // Unwrap fact fields back to plain values
    const unwrap = (field: unknown): unknown => {
      if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
        return (field as Record<string, unknown>).value;
      }
      return field ?? null;
    };

    const unwrapSection = (section: Record<string, unknown> | undefined): unknown => {
      if (!section) return {};
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(section)) {
        result[key] = unwrap(val);
      }
      return result;
    };

    // Build ReportData from fact fields
    const data: ReportData = {
      property: unwrapSection(factDoc.property) as ReportData["property"],
      scores: unwrapSection(factDoc.scores) as ReportData["scores"],
      climate: unwrapSection(factDoc.climate) as ReportData["climate"],
      terrain: unwrapSection(factDoc.terrain) as ReportData["terrain"],
      soil: unwrapSection(factDoc.soil) as ReportData["soil"],
      geology: unwrapSection(factDoc.geology) as ReportData["geology"],
      water: unwrapSection(factDoc.water) as ReportData["water"],
      species: unwrapSection(factDoc.species) as ReportData["species"],
      fire: unwrapSection(factDoc.fire) as ReportData["fire"],
      flood: unwrapSection(factDoc.flood) as ReportData["flood"],
      drought: unwrapSection(factDoc.drought) as ReportData["drought"],
      energy: unwrapSection(factDoc.energy) as ReportData["energy"],
      economics: unwrapSection(factDoc.economics) as ReportData["economics"],
      maps: unwrapSection(factDoc.maps) as ReportData["maps"],
      regional: unwrapSection(factDoc.regional) as ReportData["regional"],
      trends: unwrapSection(factDoc.trends) as ReportData["trends"],
      compliance: unwrapSection(factDoc.compliance) as ReportData["compliance"],
      actions: unwrapSection(factDoc.actions) as ReportData["actions"],
      agriculture: unwrapSection(factDoc.agriculture) as ReportData["agriculture"],
      narratives: {},
      meta: unwrapSection(factDoc.meta) as ReportData["meta"],
    };

    // Merge narratives from latest report
    const reportDoc = await reportsCol.findOne(
      { landbookId: id },
      { sort: { version: -1 } }
    );
    if (reportDoc?.narratives) {
      data.narratives = JSON.parse(JSON.stringify(reportDoc.narratives));
    }

    // Detect narrative staleness via content hash comparison
    const factsHash = (factDoc as Record<string, unknown>).contentHash as string | undefined;
    const reportHash = (reportDoc as Record<string, unknown> | null)?.factsContentHash as string | undefined;
    const narrativesStale = !reportDoc || !factsHash || factsHash !== reportHash;

    return { data, narrativesStale };
  } catch (err) {
    console.warn("[page] 3-layer read failed, will fall back to blob:", (err as Error).message);
    return null;
  }
}

export default async function LandbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const landbook = await getLandbook(id);
  if (!landbook) notFound();

  // Try 3-layer read first, fall back to blob
  const layerResult = await getReportDataFromLayers(id);
  const baseData = layerResult?.data || landbook.data;
  const narrativesStale = layerResult?.narrativesStale ?? false;

  // Backfill fields that the fact-store didn't persist in older runs
  // from the blob, so existing landbooks keep rendering without a re-run.
  if (baseData && layerResult?.data && landbook.data?.economics) {
    const blobEcon = landbook.data.economics;
    if (!baseData.economics.premiums?.length && blobEcon.premiums?.length) {
      baseData.economics.premiums = blobEcon.premiums;
    }
    if (!baseData.economics.premiumMethodology && blobEcon.premiumMethodology) {
      baseData.economics.premiumMethodology = blobEcon.premiumMethodology;
    }
    if (!baseData.economics.revenueLayers?.length && blobEcon.revenueLayers?.length) {
      baseData.economics.revenueLayers = blobEcon.revenueLayers;
    }
    if (!baseData.economics.implicitScenarios?.length && blobEcon.implicitScenarios?.length) {
      baseData.economics.implicitScenarios = blobEcon.implicitScenarios;
    }
    if (!baseData.economics.layerNpv?.length && blobEcon.layerNpv?.length) {
      baseData.economics.layerNpv = blobEcon.layerNpv;
    }
    if (!baseData.economics.ecosystemServices?.breakdown?.length && blobEcon.ecosystemServices?.breakdown?.length) {
      baseData.economics.ecosystemServices.breakdown = blobEcon.ecosystemServices.breakdown;
    }
  }

  // Layer the agent's overrides on top so the buyer sees what the agent
  // intends. Overrides are stored as the raw strings the agent typed;
  // applyOverrides parses + scales them into the underlying data shape.
  const overrides = baseData ? await loadOverrideFields(id) : null;
  const data = baseData ? applyOverrides(baseData, overrides) : null;

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

        {/* Narrative staleness banner */}
        {narrativesStale && (
          <div className="max-w-[800px] mx-auto mb-6 print:hidden">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-amber-800 text-sm font-medium">Narratives out of date</p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Data has been updated since narratives were last generated.
                </p>
              </div>
              <RegenerateButton landbookId={id} />
            </div>
          </div>
        )}

        {/* Section pages */}
        <div className="max-w-[800px] mx-auto space-y-12">
          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <OverviewSection
              property={data.property}
              scores={data.scores}
              economics={data.economics}
              water={data.water}
              fire={data.fire}
              flood={data.flood}
              drought={data.drought}
              energy={data.energy}
              maps={data.maps}
              meta={data.meta}
              allNarratives={data.narratives}
              narratives={n.overview}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ValueBenefitsSection
              property={data.property}
              economics={data.economics}
              scores={data.scores}
              meta={data.meta}
              narratives={n.valueBenefits}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <FutureScenariosSection
              economics={data.economics}
              narratives={n.futureScenarios}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RegionEcosystemSection
              terrain={data.terrain}
              water={data.water}
              energy={data.energy}
              narratives={n.regionEcosystem}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <LandWaterSection
              terrain={data.terrain}
              geology={data.geology}
              water={data.water}
              climate={data.climate}
              drought={data.drought}
              flood={data.flood}
              narratives={n.landWater}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <BiodiversityHabitatSection
              species={data.species}
              agriculture={data.agriculture}
              regional={data.regional}
              scores={data.scores}
              narratives={n.biodiversity}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <ClimateSeasonsSection
              climate={data.climate}
              energy={data.energy}
              trends={data.trends}
              narratives={n.climateSeasons}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <HistoryTrendsSection
              trends={data.trends}
              fire={data.fire}
              narratives={n.historyTrends}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <RisksResilienceSection
              fire={data.fire}
              flood={data.flood}
              drought={data.drought}
              energy={data.energy}
              trends={data.trends}
              narratives={n.risksResilience}
            />
          </div>

          <div className="shadow-2xl bg-white p-16 print:shadow-none print:p-8">
            <SourcesMethodologySection />
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-[800px] mx-auto pt-8 pb-4">
          <div className="flex justify-between text-[10px] text-brand-sage">
            <span>LandBook &mdash; Notes from the field.</span>
            <span>{data.property.name}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
