"use server";

import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { Landbook, LandbookFile } from "@/lib/types";

async function assertOwned(landbookId: string, ownerId: string): Promise<Landbook> {
  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id: landbookId, ownerId });
  if (!book) throw new Error("LandBook not found");
  return book;
}

export interface RecordFileInput {
  name: string;
  kind: string;
  size: number;
  downloadUrl: string;
}

export async function recordFileAction(
  landbookId: string,
  input: RecordFileInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  try {
    await assertOwned(landbookId, user.uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const doc: LandbookFile = {
    landbookId,
    ownerId: user.uid,
    name: input.name,
    kind: input.kind || "unknown",
    size: input.size,
    downloadUrl: input.downloadUrl,
    uploadedAt: new Date().toISOString(),
  };

  const files = await getCollection<LandbookFile>("landbook_files");
  await files.insertOne(doc);
  revalidatePath(`/agent/${landbookId}/upload`);
  return { ok: true };
}

export async function saveAgentNotesAction(
  landbookId: string,
  notes: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  try {
    await assertOwned(landbookId, user.uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const books = await getCollection<Landbook>("landbooks");
  await books.updateOne(
    { id: landbookId, ownerId: user.uid },
    {
      $set: {
        agentNotes: notes,
        updated: new Date().toISOString(),
      },
    }
  );
  revalidatePath(`/agent/${landbookId}/upload`);
  return { ok: true };
}
