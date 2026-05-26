"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PillButton, StatusPill, Icon } from "@/components/agent/primitives";
import type { LandbookStatus } from "@/lib/landbook-status";

function PdfButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent/${id}/pdf`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const m = /filename="?([^"]+)"?/i.exec(cd);
      const filename = m?.[1] || `landbook-${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <PillButton
        variant="light"
        icon={<Icon.Download />}
        onClick={download}
        disabled={pending}
        title={pending ? "First-time generation can take ~60s" : "Download PDF"}
      >
        {pending ? "Preparing…" : "PDF"}
      </PillButton>
      {error && (
        <span className="text-[10px] text-brand-terracotta">{error}</span>
      )}
    </div>
  );
}

export type AgentItem = {
  id: string;
  href: string;
  display: string;
  subline: string;
  status: LandbookStatus;
  updated?: string;
  isSubmission: boolean;
};

type SortKey =
  | "updated_desc"
  | "updated_asc"
  | "name_asc"
  | "name_desc"
  | "status";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "updated_desc", label: "Last updated ↓" },
  { key: "updated_asc", label: "Last updated ↑" },
  { key: "name_asc", label: "Name A–Z" },
  { key: "name_desc", label: "Name Z–A" },
  { key: "status", label: "Status" },
];

// Status ordering when sorting by status: things needing attention first.
const STATUS_RANK: Record<LandbookStatus, number> = {
  Processing: 0,
  Draft: 1,
  Ready: 2,
  Shared: 3,
  Archived: 4,
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BooksList({ items }: { items: AgentItem[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sortKey) {
      case "updated_desc":
        return copy.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
      case "updated_asc":
        return copy.sort((a, b) => (a.updated || "").localeCompare(b.updated || ""));
      case "name_asc":
        return copy.sort((a, b) =>
          a.display.localeCompare(b.display, undefined, { sensitivity: "base" })
        );
      case "name_desc":
        return copy.sort((a, b) =>
          b.display.localeCompare(a.display, undefined, { sensitivity: "base" })
        );
      case "status":
        return copy.sort((a, b) => {
          const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
          if (r !== 0) return r;
          return (b.updated || "").localeCompare(a.updated || "");
        });
    }
  }, [items, sortKey]);

  return (
    <>
      <div className="mt-8 flex items-center justify-end gap-3 text-[11px] font-medium text-brand-charcoal/60">
        <label htmlFor="books-sort" className="uppercase tracking-[0.12em] text-brand-charcoal/45">
          Sort
        </label>
        <select
          id="books-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-full border border-brand-sage/40 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-charcoal outline-none transition hover:border-brand-charcoal/60 focus:border-brand-charcoal"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <ul className="mt-4 divide-y divide-brand-sage/25 overflow-hidden rounded-lg border border-brand-sage/30 bg-white">
        {sorted.map((item) => (
          <li
            key={`${item.isSubmission ? "s" : "b"}:${item.id}`}
            className="flex items-center gap-6 px-6 py-5 transition hover:bg-brand-cream/40"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {item.isSubmission ? (
                  <span
                    className="font-serif text-lg font-bold text-brand-charcoal/80"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {item.display}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="font-serif text-lg font-bold text-brand-charcoal hover:underline"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    {item.display}
                  </Link>
                )}
                <StatusPill status={item.status} />
              </div>
              <p className="mt-1 truncate text-[12px] text-brand-charcoal/55">
                {item.subline}
              </p>
            </div>
            <div className="hidden text-right text-[11px] text-brand-charcoal/55 md:block">
              <p className="font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">
                {item.isSubmission ? "Submitted" : "Updated"}
              </p>
              <p className="mt-1">{formatDate(item.updated)}</p>
            </div>
            {!item.isSubmission && (
              <div className="flex items-center gap-2">
                <PdfButton id={item.id} />
                <Link href={`/agent/${item.id}/upload`}>
                  <PillButton variant="light" icon={<Icon.Upload />}>
                    Upload
                  </PillButton>
                </Link>
                <Link href={`/agent/${item.id}/share`}>
                  <PillButton variant="ghost" icon={<Icon.Share />}>
                    Share
                  </PillButton>
                </Link>
              </div>
            )}
            {item.isSubmission && (
              <span className="text-[11px] uppercase tracking-[0.15em] text-brand-charcoal/45">
                Awaiting analyst
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
