import { NextResponse } from "next/server";
import { Resend } from "resend";

const FEEDBACK_TO = "hi@landlibrary.co";
const FEEDBACK_FROM = "LandBook Feedback <hi@landlibrary.co>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let payload: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    propertyName?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const message = (payload.message || "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }

  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim();
  const propertyName = (payload.propertyName || "").trim();
  const subject = (payload.subject || "").trim()
    || `LandBook feedback${propertyName ? ` — ${propertyName}` : ""}`;

  const metaRows: Array<[string, string]> = [];
  if (propertyName) metaRows.push(["Property", propertyName]);
  if (name) metaRows.push(["From", name]);
  if (email) metaRows.push(["Reply-to", email]);

  const html = `
    <h2 style="font-family:system-ui,sans-serif;color:#1B3A2F;margin:0 0 16px">LandBook feedback</h2>
    <pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap;margin:0 0 20px">${escapeHtml(message)}</pre>
    ${
      metaRows.length
        ? `<table style="border-collapse:collapse;font-family:monospace;font-size:13px;color:#444">
             ${metaRows
               .map(
                 ([k, v]) =>
                   `<tr><td style="padding:2px 12px 2px 0;font-weight:bold">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`
               )
               .join("")}
           </table>`
        : ""
    }
  `;

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: FEEDBACK_FROM,
      to: FEEDBACK_TO,
      subject: subject.slice(0, 78),
      html,
      replyTo: email || undefined,
    });
    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message || "Failed to send" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
