import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/firebase/admin";
import { hasAcceptedAgreement } from "@/lib/agent/agreement-store";
import { AgreementGate } from "@/components/agent/AgreementGate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent Agreement · LandBook",
};

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/agent/signin");
  if (await hasAcceptedAgreement(user.uid)) redirect("/agent");
  return <AgreementGate />;
}
