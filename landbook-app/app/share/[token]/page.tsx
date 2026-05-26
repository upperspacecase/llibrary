import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCollection } from "@/lib/db";
import type { LandbookShare } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared LandBook",
  robots: { index: false, follow: false },
};

/**
 * Public share-link viewer.
 *
 * The share UI hands out `landlibrary.co/share/<token>` links. Resolve the
 * token to a landbook id, record a `view` activity event, then redirect to
 * the public `/[id]` viewer which already renders the full report (and
 * already falls back to the submissions collection when the doc lives there).
 *
 * Expired shares 404. Email-gated shares aren't gated yet — flag for later.
 */
export default async function SharedLandBookPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const shares = await getCollection<LandbookShare>("landbook_shares");
  const share = await shares.findOne({ token });
  if (!share) notFound();

  if (share.expiresAt) {
    const expired = new Date(share.expiresAt).getTime() < Date.now();
    if (expired) notFound();
  }

  // Best-effort referrer for the activity event. Anonymous viewers — we
  // don't have an email gate wired yet, so attribution is just the source.
  let referer: string | null = null;
  try {
    const h = await headers();
    referer = h.get("referer");
  } catch {
    // headers() may throw outside a request scope (e.g. during build) — ignore.
  }

  await shares.updateOne(
    { token },
    {
      $push: {
        activity: {
          kind: "viewed",
          at: new Date().toISOString(),
          meta: referer ? { referer } : undefined,
        },
      },
    }
  );

  redirect(`/${share.landbookId}`);
}
