import "server-only";

/**
 * Fire v1's refresh pipeline for a LandBook (fall back to submissions
 * collection when no landbook exists for the id — v1 handles that).
 * Fire-and-forget; the worker can take 30–90s and the agent shouldn't
 * block on it. Errors are logged and swallowed.
 */
export function kickRefreshPipeline(id: string): void {
  const v1 = process.env.V1_API_BASE_URL;
  if (!v1) {
    console.warn("[pipeline] V1_API_BASE_URL not set — refresh skipped");
    return;
  }
  void fetch(`${v1.replace(/\/+$/, "")}/api/landbooks/${id}/refresh`, {
    method: "POST",
  }).catch((err) =>
    console.warn(`[pipeline] refresh kick-off failed for ${id}:`, err)
  );
}
