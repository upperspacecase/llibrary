"use server";

import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { Landbook, LandbookOverride } from "@/lib/types";

type OverrideFields = LandbookOverride["fields"];

const FIELD_KEYS: ReadonlyArray<keyof OverrideFields> = [
  "name",
  "narrative",
  "area",
  "naturalCapital",
  "carbonStock",
];

export async function saveOverridesAction(
  landbookId: string,
  input: Partial<OverrideFields>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();

  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id: landbookId, ownerId: user.uid });
  if (!book) return { ok: false, error: "LandBook not found" };

  const cleaned: OverrideFields = {};
  for (const key of FIELD_KEYS) {
    const v = input[key];
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length) cleaned[key] = trimmed;
    }
  }

  const overrides = await getCollection<LandbookOverride>("landbook_overrides");
  await overrides.updateOne(
    { landbookId, ownerId: user.uid },
    {
      $set: {
        landbookId,
        ownerId: user.uid,
        fields: cleaned,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  await books.updateOne(
    { id: landbookId, ownerId: user.uid },
    { $set: { updated: new Date().toISOString() } }
  );

  revalidatePath(`/agent/${landbookId}/edit`);
  return { ok: true };
}
