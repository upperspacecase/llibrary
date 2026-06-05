"use server";

import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns } from "@/lib/agent-book";
import { coverWithSubscription, getPlanUsage } from "@/lib/plan-usage";
import { kickRefreshPipeline } from "@/lib/pipeline";

/**
 * Cover this LandBook with the agent's active subscription, then start
 * the pipeline. The page guards against allowance overflow but the shared
 * helper also re-checks server-side to keep an honest single source of truth.
 */
export async function coverWithSubscriptionAction(
  landbookId: string
): Promise<void> {
  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(landbookId, user.uid))) {
    throw new Error("LandBook not found");
  }

  const usage = await getPlanUsage(user.uid);
  await coverWithSubscription(user.uid, landbookId, usage);

  kickRefreshPipeline(landbookId);
  redirect(`/agent/${landbookId}/submitted`);
}
