"use server";

import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns, updateAgentBook } from "@/lib/agent-book";
import type { LandbookOverride } from "@/lib/types";

type OverrideFields = LandbookOverride["fields"];

const FIELD_KEYS: ReadonlyArray<keyof OverrideFields> = [
  "name",
  "narrativeIntro",
  "narrativeCallout",
  "area",
  "naturalCapital",
  "longTermValue",
  "waterSecurity",
  "biodiversityScore",
  "energyIndependence",
  "fireRisk",
  "floodRisk",
  "droughtRisk",
];

export async function saveOverridesAction(
  landbookId: string,
  input: Partial<OverrideFields>
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    return { ok: false, error: "LandBook not found" };
  }

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

  await updateAgentBook(landbookId, user.uid, {
    $set: { updated: new Date().toISOString() },
  });

  // The public viewer at /[id] reads overrides too — bust its cache so the
  // buyer sees the new values immediately.
  revalidatePath(`/agent/${landbookId}/edit`);
  revalidatePath(`/${landbookId}`);
  return { ok: true };
}
