import "server-only";
import { getCollection } from "@/lib/db";
import type { AgreementAcceptance } from "@/lib/types";
import { AGENT_AGREEMENT_VERSION } from "./agreement";

/** True once the agent has accepted the current agreement version. */
export async function hasAcceptedAgreement(uid: string): Promise<boolean> {
  const col = await getCollection<AgreementAcceptance>("agreement_acceptances");
  const found = await col.findOne({ uid, version: AGENT_AGREEMENT_VERSION });
  return Boolean(found);
}
