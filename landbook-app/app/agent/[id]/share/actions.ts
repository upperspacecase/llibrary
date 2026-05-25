"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type {
  Landbook,
  LandbookShare,
  ShareActivity,
  ShareRecipient,
} from "@/lib/types";

async function assertOwned(landbookId: string, ownerId: string) {
  const books = await getCollection<Landbook>("landbooks");
  const book = await books.findOne({ id: landbookId, ownerId });
  if (!book) throw new Error("LandBook not found");
}

export async function ensureShareAction(landbookId: string): Promise<
  | { ok: true; share: LandbookShare }
  | { ok: false; error: string }
> {
  const user = await requireCurrentUser();
  try {
    await assertOwned(landbookId, user.uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const shares = await getCollection<LandbookShare>("landbook_shares");
  const existing = await shares.findOne({ landbookId, ownerId: user.uid });
  if (existing) {
    return {
      ok: true,
      share: JSON.parse(JSON.stringify(existing)) as LandbookShare,
    };
  }

  const now = new Date().toISOString();
  const share: LandbookShare = {
    landbookId,
    ownerId: user.uid,
    token: randomUUID(),
    createdAt: now,
    expiresAt: null,
    emailGate: false,
    recipients: [],
    activity: [{ kind: "created", at: now }],
  };
  await shares.insertOne(share);
  revalidatePath(`/agent/${landbookId}/share`);
  return { ok: true, share };
}

export async function addRecipientAction(
  landbookId: string,
  recipient: { name: string; email: string; role?: string }
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCurrentUser();
  try {
    await assertOwned(landbookId, user.uid);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const name = recipient.name.trim();
  const email = recipient.email.trim();
  if (!name || !email) return { ok: false, error: "Name and email required" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Email looks invalid" };
  }

  const now = new Date().toISOString();
  const newRecipient: ShareRecipient = {
    name,
    email,
    role: recipient.role?.trim() || undefined,
    sentAt: now,
  };
  const event: ShareActivity = {
    kind: "recipient_added",
    at: now,
    meta: { email, name },
  };

  const shares = await getCollection<LandbookShare>("landbook_shares");
  const result = await shares.updateOne(
    { landbookId, ownerId: user.uid },
    {
      $push: { recipients: newRecipient, activity: event },
    }
  );

  if (result.matchedCount === 0) {
    // Share doc didn't exist — bootstrap it then retry.
    const bootstrap = await ensureShareAction(landbookId);
    if (!bootstrap.ok) return { ok: false, error: bootstrap.error };
    await shares.updateOne(
      { landbookId, ownerId: user.uid },
      { $push: { recipients: newRecipient, activity: event } }
    );
  }

  revalidatePath(`/agent/${landbookId}/share`);
  return { ok: true };
}
