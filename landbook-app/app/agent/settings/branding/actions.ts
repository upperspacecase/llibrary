"use server";

import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { AgentSettings } from "@/lib/types";

export interface BrandingInput {
  agencyName?: string;
  leadAgent?: string;
  license?: string;
  phone?: string;
  publicEmail?: string;
  tagline?: string;
  accentColor?: string;
}

const TEXT_KEYS = [
  "agencyName",
  "leadAgent",
  "license",
  "phone",
  "publicEmail",
  "tagline",
  "accentColor",
] as const;

export async function saveBrandingAction(
  input: BrandingInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();

  const update: Record<string, string> = {};
  for (const k of TEXT_KEYS) {
    const v = input[k];
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed.length) update[k] = trimmed;
    }
  }

  const col = await getCollection<AgentSettings>("agent_settings");
  await col.updateOne(
    { ownerId: user.uid },
    {
      $set: {
        ...update,
        ownerId: user.uid,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  revalidatePath("/agent/settings/branding");
  return { ok: true };
}

export async function saveLogoAction(
  input: { downloadUrl: string }
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  const col = await getCollection<AgentSettings>("agent_settings");
  await col.updateOne(
    { ownerId: user.uid },
    {
      $set: {
        ownerId: user.uid,
        logoUrl: input.downloadUrl,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
  revalidatePath("/agent/settings/branding");
  return { ok: true };
}
