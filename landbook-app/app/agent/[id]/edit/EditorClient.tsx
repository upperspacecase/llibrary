"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eyebrow, PillButton, Icon } from "@/components/agent/primitives";
import { saveOverridesAction } from "./actions";

export interface EditorComputed {
  name: string;
  narrative: string;
  area: string;
  naturalCapital: string;
  carbonStock: string;
}

export interface EditorOverrides {
  name?: string;
  narrative?: string;
  area?: string;
  naturalCapital?: string;
  carbonStock?: string;
}

interface Props {
  landbookId: string;
  computed: EditorComputed;
  overrides: EditorOverrides;
}

type FieldKey = keyof EditorOverrides;

const FIELDS: { key: FieldKey; label: string; hint?: string }[] = [
  { key: "name", label: "Property name" },
  { key: "area", label: "Area" },
  { key: "naturalCapital", label: "Natural capital" },
  { key: "carbonStock", label: "Carbon stock" },
  {
    key: "narrative",
    label: "Overview narrative",
    hint: "Multi-line description that opens the report.",
  },
];

export default function EditorClient({
  landbookId,
  computed,
  overrides,
}: Props) {
  const [values, setValues] = useState<EditorOverrides>({ ...overrides });
  const [selected, setSelected] = useState<FieldKey | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = overrides;

  const dirty = FIELDS.some(({ key }) => {
    const a = (values[key] || "").trim();
    const b = (initial[key] || "").trim();
    return a !== b;
  });

  function setField(key: FieldKey, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function discard() {
    setValues({ ...initial });
    setSaved(false);
    setError(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveOverridesAction(landbookId, values);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error || "Failed to save");
      }
    });
  }

  const display = (key: FieldKey) => {
    const v = values[key];
    if (v && v.trim().length) return v.trim();
    return computed[key];
  };

  const isOverridden = (key: FieldKey) => {
    const v = values[key];
    return !!v && v.trim().length > 0;
  };

  const selectedField = selected ? FIELDS.find((f) => f.key === selected) : null;

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="border-b border-brand-sage/25 bg-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/agent"
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60"
            >
              <span>←</span> My LandBooks
            </Link>
            <div className="h-5 w-px bg-brand-sage/40" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/50">
                Editing draft
              </p>
              <p
                className="font-serif text-base font-bold leading-tight"
                style={{ fontFamily: "var(--font-libre), serif" }}
              >
                {display("name")}
              </p>
            </div>
            <span
              className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                dirty
                  ? "bg-brand-amber/30 text-brand-charcoal"
                  : "bg-brand-sage/15 text-brand-charcoal/70"
              }`}
            >
              {dirty ? "Unsaved changes" : "No unsaved overrides"}
            </span>
            {saved && !dirty && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-forest">
                Saved
              </span>
            )}
            {error && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-terracotta">
                {error}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={!dirty || pending}
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60 disabled:opacity-40"
            >
              Discard
            </button>
            <Link
              href={`/${landbookId}`}
              className="inline-flex items-center gap-2 rounded-full border border-brand-sage/40 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:border-brand-charcoal"
            >
              <Icon.Eye /> Preview
            </Link>
            <PillButton
              variant="primary"
              onClick={save}
              disabled={!dirty || pending}
            >
              {pending ? "Saving…" : "Save & publish"}
            </PillButton>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-brand-sage/20 px-6 py-2 text-[11px] font-medium text-brand-charcoal/55">
          <span className="border-b-2 border-brand-charcoal px-1 py-1 text-brand-charcoal">
            Overview
          </span>
          <span className="ml-2 text-brand-charcoal/45">
            The rest of the report is generated by our analysts and not
            editable.
          </span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-104px)] grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="overflow-y-auto bg-brand-cream/60 p-10">
          <div className="mx-auto max-w-2xl rounded-md bg-white p-12 shadow-xl">
            <Eyebrow>Overview</Eyebrow>

            <button
              type="button"
              onClick={() => setSelected("name")}
              className="mt-4 block w-full text-left"
            >
              <h1
                className="font-serif text-3xl font-bold leading-tight text-brand-charcoal"
                style={{ fontFamily: "var(--font-libre), serif" }}
              >
                {display("name")}
              </h1>
              {isOverridden("name") && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                  Overridden by you
                </p>
              )}
            </button>

            <div className="mt-8 grid grid-cols-3 gap-6 border-y border-brand-sage/25 py-6">
              {(["area", "naturalCapital", "carbonStock"] as FieldKey[]).map(
                (key) => {
                  const labels: Record<string, string> = {
                    area: "Area",
                    naturalCapital: "Natural capital",
                    carbonStock: "Carbon stock",
                  };
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelected(key)}
                      className="-mx-2 px-2 text-left"
                    >
                      <p className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/50">
                        {labels[key]}
                      </p>
                      <p
                        className="mt-2 font-serif text-2xl font-bold tabular-nums"
                        style={{ fontFamily: "var(--font-libre), serif" }}
                      >
                        {display(key)}
                      </p>
                      {isOverridden(key) && (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-terracotta">
                          Overridden
                        </p>
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelected("narrative")}
              className="mt-6 block w-full text-left"
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-charcoal/90">
                {display("narrative")}
              </p>
              {isOverridden("narrative") && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                  Overridden by you
                </p>
              )}
            </button>

            <div className="mt-8 rounded border border-dashed border-brand-sage/45 bg-brand-cream/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/65">
                  Insert client content
                </p>
                <Link
                  href={`/agent/${landbookId}/upload`}
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55 hover:text-brand-charcoal"
                >
                  + Add block
                </Link>
              </div>
              <p className="mt-1 text-[11px] text-brand-charcoal/50">
                Drop a photo, note, or document into this section.
              </p>
            </div>
          </div>
        </div>

        <aside className="border-t border-brand-sage/25 bg-white lg:border-l lg:border-t-0">
          <div className="border-b border-brand-sage/25 px-5 py-4">
            <Eyebrow>Field inspector</Eyebrow>
            <p
              className="mt-2 font-serif text-base font-bold"
              style={{ fontFamily: "var(--font-libre), serif" }}
            >
              {selectedField ? selectedField.label : "Nothing selected"}
            </p>
            <p className="text-[11px] text-brand-charcoal/55">
              {selectedField
                ? selectedField.hint || "Type below to override the computed value."
                : "Click a value on the left to see its source and override it."}
            </p>
          </div>
          <div className="space-y-5 px-5 py-5 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/55">
                Computed value
              </p>
              <p
                className={`mt-1 whitespace-pre-wrap tabular-nums ${
                  selected ? "text-brand-charcoal/80" : "text-brand-charcoal/40"
                }`}
              >
                {selected ? computed[selected] || "—" : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/55">
                Your override
              </p>
              {selected === "narrative" ? (
                <textarea
                  rows={6}
                  value={values.narrative ?? ""}
                  placeholder={computed.narrative}
                  onChange={(e) => setField("narrative", e.target.value)}
                  className="mt-1 w-full rounded border border-brand-sage/30 bg-brand-cream/40 px-3 py-2 text-sm text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-charcoal"
                />
              ) : (
                <input
                  value={selected ? values[selected] ?? "" : ""}
                  placeholder={selected ? computed[selected] : "—"}
                  disabled={!selected}
                  onChange={(e) =>
                    selected && setField(selected, e.target.value)
                  }
                  className="mt-1 w-full rounded border border-brand-sage/30 bg-brand-cream/40 px-3 py-2 text-base text-brand-charcoal disabled:text-brand-charcoal/40"
                />
              )}
              <p className="mt-1 text-[10px] text-brand-charcoal/45">
                Overrides are visible in the audit trail. Buyers see only the
                final number.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
