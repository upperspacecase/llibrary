import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/firebase/admin";
import { assertAgentOwns } from "@/lib/agent-book";

export const runtime = "nodejs";
// Generation calls the Puppeteer worker which can take 30–90s on a cold landbook.
// Keep us under Vercel Pro's 300s cap.
export const maxDuration = 280;

const V1 = process.env.V1_API_BASE_URL;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN;

/**
 * Stream the latest PDF for an agent's LandBook. If none exists yet, ask
 * v1 to render + store one first, then stream. v1 already owns the
 * Puppeteer worker + GridFS pipeline — we just authenticate the agent,
 * check ownership, and forward server-to-server with INTERNAL_API_TOKEN.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!V1 || !INTERNAL_TOKEN) {
    return NextResponse.json(
      { error: "PDF pipeline not configured" },
      { status: 500 }
    );
  }

  const user = await requireCurrentUser();
  if (!(await assertAgentOwns(id, user.uid))) {
    return NextResponse.json({ error: "LandBook not found" }, { status: 404 });
  }

  const base = V1.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${INTERNAL_TOKEN}` };

  // Try to stream the latest first. v1 returns 404 if no version exists.
  let upstream = await fetch(`${base}/api/landbooks/${id}/pdf`, { headers });

  if (upstream.status === 404) {
    // No PDF yet — generate, then re-fetch. POST returns metadata, not the
    // file body, so we have to follow up with the GET.
    const gen = await fetch(`${base}/api/landbooks/${id}/generate-pdf`, {
      method: "POST",
      headers,
    });
    if (!gen.ok) {
      const detail = await gen.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to generate PDF",
          status: gen.status,
          detail: detail.slice(0, 500),
        },
        { status: 502 }
      );
    }
    upstream = await fetch(`${base}/api/landbooks/${id}/pdf`, { headers });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "PDF fetch failed", status: upstream.status, detail: detail.slice(0, 500) },
      { status: upstream.status }
    );
  }

  // Pass through the file. Content-Disposition + Content-Type come from v1.
  const out = new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ??
        `attachment; filename="landbook-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
  return out;
}
