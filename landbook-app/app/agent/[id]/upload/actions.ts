"use server";

import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns, updateAgentBook } from "@/lib/agent-book";
import type { LandbookFile } from "@/lib/types";

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
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    return { ok: false, error: "LandBook not found" };
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
  const matched = await updateAgentBook(landbookId, user.uid, {
    $set: { agentNotes: notes, updated: new Date().toISOString() },
  });
  if (!matched) return { ok: false, error: "LandBook not found" };
  revalidatePath(`/agent/${landbookId}/upload`);
  return { ok: true };
}
