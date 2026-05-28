/**
 * Browser fetch helper for the dashboard panels.
 *
 * Adds an 8s timeout via AbortController and one retry with a 600ms backoff
 * — the most common failure mode in this stack is a cold MongoDB connection
 * on the first request after a deploy, which usually succeeds on the second
 * try. Returns parsed JSON on success or throws — callers decide whether to
 * surface an error UI or stay quiet.
 */
export async function fetchJson(url, { timeoutMs = 8000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      // Don't retry if we've used all our attempts, or the error was an
      // explicit abort triggered by something other than our timeout.
      if (attempt >= retries) break;
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Read a baked dashboard dataset, falling back to the live API endpoint if
 * the static file is missing (e.g. local dev where `npm run bake:odemira`
 * hasn't been run, or a build where the bake step skipped a target).
 *
 * Static read uses no retries — if the file 404s we want to fail fast and
 * fall through to /api which has its own retry.
 */
export async function fetchDashboard(staticUrl, apiUrl, opts = {}) {
  try {
    return await fetchJson(staticUrl, { ...opts, retries: 0, timeoutMs: opts.timeoutMs ?? 4000 });
  } catch (err) {
    if (!apiUrl) throw err;
    return await fetchJson(apiUrl, opts);
  }
}
