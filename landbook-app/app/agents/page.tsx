import type { Metadata } from "next";
import { AgentsContent } from "@/components/agents/AgentsContent";
import { freeLandbooksThisMonth } from "@/lib/plan-usage";

export const dynamic = "force-dynamic";

/** Complimentary LandBooks offered per calendar month. */
const MONTHLY_FREE_CAP = 25;

export const metadata: Metadata = {
  title: "For Rural Estate Agents | LandBook",
  description:
    "Show up to every listing pitch with a professional LandBook that builds trust with sellers and cuts buyer due diligence from weeks to days.",
};

export default async function AgentsPage() {
  // Don't 500 the marketing page if the count query hiccups — fall back to
  // the full cap so the scarcity line still renders.
  let issuedThisMonth = 0;
  try {
    issuedThisMonth = await freeLandbooksThisMonth();
  } catch {
    issuedThisMonth = 0;
  }
  const complimentaryLeft = Math.max(0, MONTHLY_FREE_CAP - issuedThisMonth);

  return <AgentsContent complimentaryLeft={complimentaryLeft} />;
}
