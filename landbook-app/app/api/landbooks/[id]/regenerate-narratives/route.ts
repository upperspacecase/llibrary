/**
 * Proxy: v2 → v1 narrative regeneration.
 *
 * The report page at app/[id]/page.tsx renders a "Regenerate" link to
 * /api/landbooks/[id]/regenerate-narratives. That endpoint lives on the v1
 * deployment. If v1 and v2 share a domain via Vercel rewrites, the relative
 * link would Just Work — but if they're on separate origins, it 404s.
 *
 * This proxy makes the v2 path always resolve. It forwards to:
 *   process.env.V1_API_BASE_URL + /api/landbooks/[id]/regenerate-narratives
 *
 * Set V1_API_BASE_URL in the v2 Vercel project to the v1 production URL
 * (e.g. "https://landlibrary.vercel.app"). If unset, the proxy returns 503
 * with a clear message so misconfiguration is loud, not silent.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS = ["POST", "GET"] as const;

async function forward(
  request: Request,
  id: string,
  method: (typeof ALLOWED_METHODS)[number]
): Promise<NextResponse> {
  const base = process.env.V1_API_BASE_URL;
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "V1_API_BASE_URL not set on the v2 deployment — set it to the v1 origin (e.g. https://landlibrary.vercel.app) so the regenerate-narratives action can reach the v1 pipeline endpoint.",
      },
      { status: 503 }
    );
  }

  const target = `${base.replace(/\/+$/, "")}/api/landbooks/${encodeURIComponent(id)}/regenerate-narratives`;

  // Forward cookies + auth headers so the v1 admin session (if any) is preserved.
  const forwardedHeaders: Record<string, string> = {};
  const cookie = request.headers.get("cookie");
  if (cookie) forwardedHeaders.cookie = cookie;
  const auth = request.headers.get("authorization");
  if (auth) forwardedHeaders.authorization = auth;

  let body: BodyInit | undefined;
  let contentType: string | null = null;
  if (method === "POST") {
    contentType = request.headers.get("content-type");
    if (contentType) forwardedHeaders["content-type"] = contentType;
    body = await request.text();
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers: forwardedHeaders,
      body,
      // No retry/timeout layer here — the v1 endpoint is itself idempotent and
      // already has narrative-call retries inside. We just want a clean forward.
    });
    const upstreamBody = await upstream.text();
    const respHeaders = new Headers();
    const upstreamCT = upstream.headers.get("content-type");
    if (upstreamCT) respHeaders.set("content-type", upstreamCT);
    return new NextResponse(upstreamBody, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to reach v1 regenerate-narratives at ${target}: ${(err as Error).message}`,
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return forward(request, id, "POST");
}

// The current dashboard renders the Regenerate as an <a href>, which is a GET.
// Forward GET as well so the link resolves; v1 will receive GET and either run
// or return 405 — but the v1 handler accepts only POST. To keep the user-visible
// behaviour consistent, GET on this proxy redirects to a no-op page until the
// frontend is converted to a POST form. For now: 405 with a helpful message.
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "regenerate-narratives must be POSTed. The Regenerate button should submit a POST form, not a GET link.",
    },
    { status: 405, headers: { allow: "POST" } }
  );
}
