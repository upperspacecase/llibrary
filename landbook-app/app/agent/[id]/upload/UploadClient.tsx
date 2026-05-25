"use client";

import { useRef, useState, useTransition } from "react";
import { Eyebrow, Icon } from "@/components/agent/primitives";
import type { LandbookFile } from "@/lib/types";
import { recordFileAction, saveAgentNotesAction } from "./actions";

interface Props {
  landbookId: string;
  initialFiles: LandbookFile[];
  initialNotes: string;
}

interface UploadJob {
  id: string;
  name: string;
  size: number;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function UploadClient({
  landbookId,
  initialFiles,
  initialNotes,
}: Props) {
  const [files, setFiles] = useState<LandbookFile[]>(initialFiles);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [pendingNotes, startNotesTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function startUpload(rawFiles: FileList | File[]) {
    const list = Array.from(rawFiles);
    for (const file of list) {
      const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const safe = safeFilename(file.name);
      const path = `landbooks/${landbookId}/${jobId}-${safe}`;

      setJobs((prev) => [
        ...prev,
        {
          id: jobId,
          name: file.name,
          size: file.size,
          progress: 0,
          status: "uploading",
        },
      ]);

      try {
        const res = await fetch(
          `/api/agent/upload?filename=${encodeURIComponent(path)}`,
          {
            method: "POST",
            headers: { "content-type": file.type || "application/octet-stream" },
            body: file,
          }
        );
        if (!res.ok) {
          const detail = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(detail.error || `Upload failed (${res.status})`);
        }
        const { url } = (await res.json()) as { url: string };

        const recordRes = await recordFileAction(landbookId, {
          name: file.name,
          kind: file.type || "unknown",
          size: file.size,
          downloadUrl: url,
        });
        if (!recordRes.ok) {
          throw new Error(recordRes.error || "Save failed");
        }

        const recorded: LandbookFile = {
          landbookId,
          ownerId: "",
          name: file.name,
          kind: file.type || "unknown",
          size: file.size,
          downloadUrl: url,
          uploadedAt: new Date().toISOString(),
        };
        setFiles((prev) => [recorded, ...prev]);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "done", progress: 100 } : j
          )
        );
      } catch (err) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: "error", error: (err as Error).message }
              : j
          )
        );
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) startUpload(e.dataTransfer.files);
  }

  function saveNotes() {
    setNotesError(null);
    startNotesTransition(async () => {
      const res = await saveAgentNotesAction(landbookId, notes);
      if (res.ok) {
        setSavedNotes(notes);
      } else {
        setNotesError(res.error || "Failed to save");
      }
    });
  }

  const activeJobs = jobs.filter((j) => j.status !== "done");
  const notesDirty = notes !== savedNotes;

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mt-8 cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition ${
          dragOver
            ? "border-brand-charcoal bg-brand-cream"
            : "border-brand-sage/45 bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) startUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-cream text-brand-charcoal/70">
          <Icon.Upload />
        </div>
        <p
          className="mt-4 font-serif text-xl font-bold text-brand-charcoal"
          style={{ fontFamily: "var(--font-libre), serif" }}
        >
          Drop files here
        </p>
        <p className="mt-1 text-sm text-brand-charcoal/55">
          or <span className="underline">browse</span> — PDF, JPG, PNG, KML, DOC
          up to 50 MB
        </p>
      </div>

      {activeJobs.length > 0 && (
        <div className="mt-6 space-y-2 rounded-lg border border-brand-sage/30 bg-white p-4">
          <Eyebrow>Uploading</Eyebrow>
          <ul className="mt-2 space-y-3">
            {activeJobs.map((j) => (
              <li key={j.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate text-brand-charcoal">{j.name}</span>
                  <span className="text-[11px] text-brand-charcoal/55">
                    {j.status === "error"
                      ? j.error || "Failed"
                      : `${j.progress}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-sage/20">
                  <div
                    className={`h-full transition-all ${
                      j.status === "error"
                        ? "bg-brand-terracotta"
                        : "bg-brand-forest"
                    }`}
                    style={{ width: `${j.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-brand-sage/40 bg-white py-12 text-center text-[12px] text-brand-charcoal/55">
          No files uploaded yet.
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-brand-sage/20 overflow-hidden rounded-lg border border-brand-sage/30 bg-white">
          {files.map((f) => (
            <li
              key={f.downloadUrl}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-brand-charcoal/55">
                  <Icon.File />
                </span>
                <div className="min-w-0">
                  <a
                    href={f.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium text-brand-charcoal hover:underline"
                  >
                    {f.name}
                  </a>
                  <p className="truncate text-[11px] text-brand-charcoal/55">
                    {formatSize(f.size)} · {formatWhen(f.uploadedAt)}
                  </p>
                </div>
              </div>
              <a
                href={f.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70 hover:text-brand-charcoal"
              >
                Open
              </a>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 rounded-lg border border-brand-sage/30 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Agent notes</Eyebrow>
            <p className="mt-1 text-[11px] text-brand-charcoal/55">
              Internal context for the analyst — not visible to the buyer.
            </p>
          </div>
          <button
            type="button"
            onClick={saveNotes}
            disabled={!notesDirty || pendingNotes}
            className="rounded-full border border-brand-charcoal bg-brand-charcoal px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-cream transition hover:bg-transparent hover:text-brand-charcoal disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendingNotes ? "Saving…" : notesDirty ? "Save notes" : "Saved"}
          </button>
        </div>
        <textarea
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the analyst should know about this property…"
          className="mt-3 w-full rounded border border-brand-sage/30 bg-brand-cream/40 px-4 py-3 text-sm text-brand-charcoal/85 focus:outline-none focus:ring-1 focus:ring-brand-charcoal"
        />
        {notesError && (
          <p className="mt-2 text-[11px] text-brand-terracotta">{notesError}</p>
        )}
      </div>
    </>
  );
}
