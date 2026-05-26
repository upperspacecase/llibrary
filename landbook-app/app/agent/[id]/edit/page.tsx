import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/firebase/admin";
import { findAgentBook } from "@/lib/agent-book";
import { loadOverrideFields } from "@/lib/landbook-overrides";
import EditorClient, {
  type EditorComputed,
  type EditorOverrides,
} from "./EditorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit · Agents",
};

function formatHa(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatEur(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatScoreOutOf10(value?: number | null, scale: 10 | 100 = 10): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const v = scale === 100 ? value / 10 : value;
  return v.toFixed(1);
}

function formatRisk(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(0);
}

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const plainBook = await findAgentBook(id, user.uid);
  if (!plainBook) notFound();

  const data = plainBook.data;
  const overview = data?.narratives?.overview ?? {};
  const existingOverrides = (await loadOverrideFields(id)) || {};

  const computed: EditorComputed = {
    name:
      plainBook.name ||
      data?.property?.name ||
      plainBook.address ||
      "Untitled property",
    narrativeIntro: typeof overview.intro === "string" ? overview.intro : "",
    narrativeCallout: typeof overview.callout === "string" ? overview.callout : "",
    area: formatHa(data?.property?.area ?? (plainBook.area ? plainBook.area / 10000 : null)),
    naturalCapital: formatEur(data?.economics?.totalValue),
    longTermValue: formatEur(data?.economics?.npv?.thirtyYear),
    waterSecurity: formatScoreOutOf10(data?.water?.securityIndex, 10),
    biodiversityScore: formatScoreOutOf10(data?.scores?.biodiversity, 100),
    energyIndependence: formatScoreOutOf10(data?.energy?.independenceScore, 100),
    fireRisk: formatRisk(data?.fire?.riskScore),
    floodRisk: formatRisk(data?.flood?.riskScore),
    droughtRisk: formatRisk(data?.drought?.riskScore),
  };

  return (
    <EditorClient
      landbookId={id}
      computed={computed}
      overrides={existingOverrides as EditorOverrides}
    />
  );
}
