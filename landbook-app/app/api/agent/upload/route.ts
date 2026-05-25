import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const V1_BASE = process.env.V1_API_BASE_URL;

export async function POST(req: NextRequest) {
  if (!V1_BASE) {
    return NextResponse.json(
      { error: "V1_API_BASE_URL not configured" },
      { status: 500 }
    );
  }

  const user = await requireCurrentUser();
  const filename = req.nextUrl.searchParams.get("filename");
  if (!filename) {
    return NextResponse.json(
      { error: "filename query param required" },
      { status: 400 }
    );
  }

  // Scope every upload to the signed-in agent — prevents path-overlap between
  // agents and gives v1's blob store a clean per-agent prefix to enumerate later.
  const scoped = `agents/${user.uid}/${filename.replace(/^\/+/, "")}`;
  const contentType = req.headers.get("content-type") || "application/octet-stream";
  const body = await req.arrayBuffer();

  const upstream = await fetch(
    `${V1_BASE}/api/submissions/upload?filename=${encodeURIComponent(scoped)}`,
    {
      method: "POST",
      headers: { "content-type": contentType },
      body: Buffer.from(body),
    }
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "Upload failed", detail },
      { status: upstream.status }
    );
  }

  const { url } = (await upstream.json()) as { url: string };
  return NextResponse.json({ url, path: scoped });
}
