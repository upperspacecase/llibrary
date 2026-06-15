"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { getCollection } from "@/lib/db";
import { requireCurrentUser } from "@/lib/firebase/admin";
import type { AgreementAcceptance } from "@/lib/types";
import { AGENT_AGREEMENT_VERSION } from "@/lib/agent/agreement";

const AGREEMENT_FROM = "LandBook <hi@landlibrary.co>";

/**
 * §13.3 — email the agent a confirmation of acceptance for their records.
 * Best-effort: a send failure must not block onboarding, since the acceptance
 * is already recorded. Throws on Resend errors so the caller can log them.
 */
async function sendAgreementConfirmation(
  to: string,
  version: string,
  acceptedAt: string,
  origin: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping agreement confirmation email");
    return;
  }
  const when = new Date(acceptedAt).toUTCString();
  const link = `${origin}/agent/agreement`;
  const html = `
    <h2 style="font-family:system-ui,sans-serif;color:#1B3A2F;margin:0 0 12px">LandBook Agent Agreement — accepted</h2>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#2C2C2C;margin:0 0 16px">
      You accepted the LandBook Agent Agreement (v${version}) on ${when}. Please keep this email for your records.
    </p>
    <ul style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#2C2C2C;margin:0 0 16px;padding-left:20px">
      <li>You pay only when the property sells — the Report Fee is due within 30 days of sale completion.</li>
      <li>You must notify us of a sale within 7 days of completion.</li>
      <li>Our reports are informational tools only — not legal, structural, or environmental advice.</li>
    </ul>
    <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#2C2C2C;margin:0 0 16px">
      <a href="${link}" style="color:#1B3A2F;font-weight:600">Read the full agreement</a>
    </p>
    <p style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.5;color:#777;margin:0">
      Contract governed by Estonian law. Electronic acceptance per eIDAS.
    </p>
  `;
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: AGREEMENT_FROM,
    to,
    subject: `Your LandBook Agent Agreement (v${version}) — accepted`,
    html,
  });
  if (result.error) {
    throw new Error(result.error.message || "Resend send failed");
  }
}

/**
 * Record the agent's one-time acceptance of the current agreement version, email
 * a confirmation, and send them on into the app. Captures the §13.2 evidence
 * (uid, email, version, UTC timestamp, IP, both checkbox confirmations).
 * Idempotent per (uid, version).
 */
export async function acceptAgreement(
  licenseConfirmed: boolean,
  agreementConfirmed: boolean
): Promise<void> {
  if (!licenseConfirmed || !agreementConfirmed) {
    throw new Error("Both confirmations are required.");
  }
  const user = await requireCurrentUser();

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "https://landbook.landlibrary.co";
  const acceptedAt = new Date().toISOString();

  const col = await getCollection<AgreementAcceptance>("agreement_acceptances");
  await col.updateOne(
    { uid: user.uid, version: AGENT_AGREEMENT_VERSION },
    {
      $setOnInsert: {
        uid: user.uid,
        email: user.email,
        version: AGENT_AGREEMENT_VERSION,
        acceptedAt,
        ip,
        licenseConfirmed,
        agreementConfirmed,
      },
    },
    { upsert: true }
  );

  // §13.3 confirmation email — best-effort; acceptance is already recorded.
  if (user.email) {
    try {
      await sendAgreementConfirmation(user.email, AGENT_AGREEMENT_VERSION, acceptedAt, origin);
    } catch (err) {
      console.error("Agreement confirmation email failed:", err);
    }
  }

  redirect("/agent");
}
