import type { Metadata } from "next";
import Image from "next/image";
import { getCollection } from "@/lib/db";
import type { Landbook, ReportData } from "@/lib/types";
import { CoverSection } from "@/components/landbook/CoverSection";
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
import { PricingSection } from "@/components/agents/PricingSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "For Rural Agents | LandBook",
  description:
    "Show up to every listing pitch with a professional LandBook that builds trust with sellers and cuts buyer due diligence from weeks to days.",
};

const CREATE_URL = "https://www.landlibrary.co/create";
const DEMO_LANDBOOK_ID = "4f10f955-3b64-4307-83fc-97bae872b68c";

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

async function getReportDataFromLayers(
  id: string
): Promise<{ data: ReportData } | null> {
  try {
    const factsCol = await getCollection("facts");
    const reportsCol = await getCollection("reports");

    const factDoc = await factsCol.findOne({ landbookId: id });
    if (!factDoc) return null;

    const unwrap = (field: unknown): unknown => {
      if (
        field &&
        typeof field === "object" &&
        "value" in (field as Record<string, unknown>)
      ) {
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

    const reportDoc = await reportsCol.findOne(
      { landbookId: id },
      { sort: { version: -1 } }
    );
    if (reportDoc?.narratives) {
      data.narratives = JSON.parse(JSON.stringify(reportDoc.narratives));
    }

    return { data };
  } catch (err) {
    console.warn("[agents] 3-layer read failed, will fall back to blob:", (err as Error).message);
    return null;
  }
}

function HeroCopy() {
  return (
    <div>
      <Image
        src="/landbook-logo.png"
        alt="LandBook"
        width={2000}
        height={600}
        priority
        className="mb-8 h-8 w-auto sm:mb-12 sm:h-10"
      />

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal">
        For Rural Agents
      </p>

      <h1 className="serif-title mt-6 text-4xl leading-[1.05] text-brand-charcoal sm:text-5xl lg:text-6xl">
        Win more listings.
        <br />
        Close deals faster.
      </h1>

      <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-charcoal/80 sm:mt-8">
        Show up to every listing pitch with a professional LandBook that
        instantly builds trust with sellers. Then hand buyers the same report
        to cut due diligence from weeks to days. One book. Two wins.
      </p>

      <p className="mt-6 max-w-xl text-base italic leading-relaxed text-brand-charcoal/70">
        For a limited time, we&apos;re offering complimentary Landbooks to
        select agents who meet our criteria.
      </p>

      <div className="mt-8 sm:mt-10">
        <a
          href={CREATE_URL}
          className="inline-flex w-full items-center justify-center rounded-full border border-brand-charcoal bg-brand-charcoal px-8 py-4 text-sm font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal sm:w-auto"
        >
          Get your first LandBook
        </a>
      </div>

      <p className="mt-4 text-xs text-brand-charcoal/50">
        Only 50 complimentary reports left this quarter.
      </p>
    </div>
  );
}

export default async function AgentsPage() {
  const landbook = await getLandbook(DEMO_LANDBOOK_ID);
  const layerResult = landbook
    ? await getReportDataFromLayers(DEMO_LANDBOOK_ID)
    : null;
  const data = layerResult?.data || landbook?.data;
  const n = data?.narratives || {};

  return (
    <main className="min-h-screen overflow-x-clip bg-brand-cream">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 sm:py-16 lg:px-12 lg:py-24">
        <div className="grid gap-10 sm:gap-12 min-[1400px]:grid-cols-[380px_minmax(900px,1fr)] min-[1400px]:gap-16">
          <div className="min-[1400px]:sticky min-[1400px]:top-24 min-[1400px]:self-start">
            <HeroCopy />
          </div>

          <div className="rounded-lg border border-brand-sage/30 bg-brand-cream shadow-xl max-h-[70vh] overflow-x-hidden overflow-y-auto min-[1400px]:max-h-[calc(100vh-8rem)]">
            <div className="p-4 sm:p-8 lg:p-12">
            {data ? (
              <>
                <div className="max-w-[800px] mx-auto shadow-2xl bg-white mb-8 sm:mb-12 overflow-hidden">
                  <CoverSection
                    property={data.property}
                    maps={data.maps}
                    scores={data.scores}
                    meta={data.meta}
                  />
                </div>

                <div className="max-w-[800px] mx-auto space-y-8 sm:space-y-12">
                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
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

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <ValueBenefitsSection
                      property={data.property}
                      economics={data.economics}
                      scores={data.scores}
                      meta={data.meta}
                      narratives={n.valueBenefits}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <FutureScenariosSection
                      economics={data.economics}
                      narratives={n.futureScenarios}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <RegionEcosystemSection
                      terrain={data.terrain}
                      water={data.water}
                      energy={data.energy}
                      narratives={n.regionEcosystem}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
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

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <BiodiversityHabitatSection
                      species={data.species}
                      agriculture={data.agriculture}
                      regional={data.regional}
                      scores={data.scores}
                      narratives={n.biodiversity}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <ClimateSeasonsSection
                      climate={data.climate}
                      energy={data.energy}
                      trends={data.trends}
                      narratives={n.climateSeasons}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <HistoryTrendsSection
                      trends={data.trends}
                      fire={data.fire}
                      narratives={n.historyTrends}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <RisksResilienceSection
                      fire={data.fire}
                      flood={data.flood}
                      drought={data.drought}
                      energy={data.energy}
                      trends={data.trends}
                      narratives={n.risksResilience}
                    />
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sage">
                      Sample preview
                    </p>
                    <p className="serif-title mt-4 text-xl text-brand-forest sm:text-2xl">
                      Additional sections available in the full LandBook.
                    </p>
                  </div>

                  <div className="shadow-2xl bg-white p-6 sm:p-10 lg:p-16 overflow-hidden">
                    <SourcesMethodologySection
                      meta={data.meta}
                      narratives={n.sourcesMethodology}
                    />
                  </div>
                </div>

                <div className="max-w-[800px] mx-auto pt-8 pb-4">
                  <div className="flex justify-between text-[10px] text-brand-sage">
                    <span>LandBook &mdash; Notes from the field.</span>
                    <span>{data.property?.name}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-[600px] items-center justify-center text-sm text-brand-sage">
                Sample LandBook unavailable.
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <PricingSection />
    </main>
  );
}
