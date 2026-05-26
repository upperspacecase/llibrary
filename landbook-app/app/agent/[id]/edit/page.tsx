import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/firebase/admin";
import { findAgentBook } from "@/lib/agent-book";
import type { LandbookOverride } from "@/lib/types";
import EditorClient, {
  type EditorComputed,
  type EditorOverrides,
} from "./EditorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit · Agents",
};

const DEFAULT_NARRATIVE =
  "The overview narrative for this property will appear here. Click into any field to add your edits — they'll be tracked as overrides in the audit trail.";

function formatHa(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} ha`;
}

function formatCurrency(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatTonnes(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 0 })} t CO₂e`;
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

  const overridesCol = await getCollection<LandbookOverride>(
    "landbook_overrides"
  );
  const overrideDoc = await overridesCol.findOne({
    landbookId: id,
    ownerId: user.uid,
  });

  const plainOverrides = overrideDoc
    ? (JSON.parse(JSON.stringify(overrideDoc.fields || {})) as EditorOverrides)
    : {};

  const computed: EditorComputed = {
    name:
      plainBook.name ||
      plainBook.data?.property?.name ||
      plainBook.address ||
      "Untitled property",
    narrative: DEFAULT_NARRATIVE,
    area: formatHa(plainBook.data?.property?.area ?? plainBook.area),
    naturalCapital: formatCurrency(plainBook.data?.economics?.totalValue),
    carbonStock: formatTonnes(plainBook.data?.economics?.carbonStock),
  };

  return (
    <EditorClient
      landbookId={id}
      computed={computed}
      overrides={plainOverrides}
    />
  );
}
