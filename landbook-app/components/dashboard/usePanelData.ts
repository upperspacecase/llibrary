"use client";

import { useEffect, useState } from "react";

export function usePanelData<T>(url: string) {
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    loading: boolean;
  }>({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.ok) setState({ data: j.data as T, error: null, loading: false });
        else setState({ data: null, error: j.error || "failed", loading: false });
      })
      .catch((e) => {
        if (!cancelled) setState({ data: null, error: String(e), loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
