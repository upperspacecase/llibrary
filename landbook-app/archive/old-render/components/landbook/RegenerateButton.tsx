"use client";

import { useState } from "react";

interface Props {
  landbookId: string;
}

export function RegenerateButton({ landbookId }: Props) {
  const [state, setState] = useState<"idle" | "running" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function regenerate() {
    setState("running");
    setMessage(null);
    try {
      const res = await fetch(`/api/landbooks/${landbookId}/regenerate-narratives`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.ok === false) {
        setState("error");
        setMessage(body?.error || `HTTP ${res.status}`);
        return;
      }
      setState("ok");
      setMessage("Narratives regenerated. Reloading...");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setState("error");
      setMessage((err as Error).message);
    }
  }

  const label =
    state === "running" ? "Regenerating…"
    : state === "ok" ? "Done"
    : state === "error" ? "Try again"
    : "Regenerate";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={regenerate}
        disabled={state === "running"}
        className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      {message && (
        <span className={`text-xs ${state === "error" ? "text-red-700" : "text-amber-700"}`}>
          {message}
        </span>
      )}
    </div>
  );
}
