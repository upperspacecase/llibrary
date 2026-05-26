"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eyebrow, PillButton, Icon } from "@/components/agent/primitives";
import { saveOverridesAction } from "./actions";

export interface EditorComputed {
  name: string;
  narrativeIntro: string;
  narrativeCallout: string;
  area: string;
  naturalCapital: string;
  longTermValue: string;
  waterSecurity: string;
  biodiversityScore: string;
  energyIndependence: string;
  fireRisk: string;
  floodRisk: string;
  droughtRisk: string;
}

export type EditorOverrides = Partial<EditorComputed>;

interface Props {
  landbookId: string;
  computed: EditorComputed;
  overrides: EditorOverrides;
}

type FieldKey = keyof EditorComputed;

const FIELDS: {
  key: FieldKey;
  label: string;
  unit?: string;
  hint?: string;
  multiline?: boolean;
}[] = [
  { key: "name", label: "Property name" },
  {
    key: "narrativeIntro",
    label: "Narrative — intro paragraph",
    hint: "The opening paragraph on the report.",
    multiline: true,
  },
  {
    key: "narrativeCallout",
    label: "Narrative — italic callout",
    hint: "The pull-quote next to the intro.",
  },
  { key: "area", label: "Total area", unit: "ha" },
  { key: "naturalCapital", label: "Annual natural capital", unit: "€" },
  { key: "longTermValue", label: "Long-term value (30 yr)", unit: "€" },
  { key: "waterSecurity", label: "Water security", unit: "/ 10", hint: "0 – 10" },
  { key: "biodiversityScore", label: "Biodiversity score", unit: "/ 10", hint: "0 – 10" },
  { key: "energyIndependence", label: "Energy independence", unit: "/ 10", hint: "0 – 10" },
  { key: "fireRisk", label: "Fire risk", unit: "/ 5", hint: "1 – 5" },
  { key: "floodRisk", label: "Flood risk", unit: "/ 5", hint: "1 – 5" },
  { key: "droughtRisk", label: "Drought risk", unit: "/ 5", hint: "1 – 5" },
];

export default function EditorClient({
  landbookId,
  computed,
  overrides,
}: Props) {
  const [values, setValues] = useState<EditorOverrides>({ ...overrides });
  const [selected, setSelected] = useState<FieldKey | null>("name");
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

  // ---------- canvas blocks (mirror OverviewSection structure) ----------

  const Metric = ({
    label,
    fieldKey,
    unit,
  }: {
    label: string;
    fieldKey: FieldKey;
    unit?: string;
  }) => (
    <button
      type="button"
      onClick={() => setSelected(fieldKey)}
      className={`text-left transition ${
        selected === fieldKey ? "ring-2 ring-brand-charcoal/30 ring-offset-2" : ""
      }`}
    >
      <p className="text-[10px] font-bold tracking-[0.2em] text-brand-sage uppercase">
        {label}
      </p>
      <p
        className="mt-2 text-[32px] font-bold tracking-tighter leading-none text-brand-forest"
        style={{ fontFamily: "var(--font-libre), serif" }}
      >
        {display(fieldKey)}
        {unit && (
          <span className="ml-1 text-base text-brand-sage">{unit}</span>
        )}
      </p>
      {isOverridden(fieldKey) && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-terracotta">
          Overridden
        </p>
      )}
    </button>
  );

  const RiskMetric = ({
    label,
    fieldKey,
  }: {
    label: string;
    fieldKey: FieldKey;
  }) => (
    <button
      type="button"
      onClick={() => setSelected(fieldKey)}
      className={`text-left transition ${
        selected === fieldKey ? "ring-2 ring-brand-charcoal/30 ring-offset-2" : ""
      }`}
    >
      <div className="flex justify-between items-end mb-2">
        <p className="text-[10px] font-bold tracking-widest text-brand-forest uppercase">
          {label}
        </p>
        <span
          className="text-xl font-bold text-brand-forest"
          style={{ fontFamily: "var(--font-libre), serif" }}
        >
          {display(fieldKey)}/5
        </span>
      </div>
      <div className="h-2 w-full bg-brand-sage/20">
        <div
          className="h-full bg-brand-terracotta"
          style={{
            width: `${Math.min(
              (Number.parseFloat(display(fieldKey)) || 0) * 20,
              100
            )}%`,
          }}
        />
      </div>
      {isOverridden(fieldKey) && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-terracotta">
          Overridden
        </p>
      )}
    </button>
  );

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
                Editing Overview
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
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            {saved && !dirty && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-forest">
                Live on report
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
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-brand-sage/40 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal hover:border-brand-charcoal"
            >
              <Icon.Eye /> Open report
            </Link>
            <PillButton
              variant="primary"
              onClick={save}
              disabled={!dirty || pending}
            >
              {pending ? "Saving…" : "Save changes"}
            </PillButton>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-brand-sage/20 px-6 py-2 text-[11px] font-medium text-brand-charcoal/55">
          <span className="border-b-2 border-brand-charcoal px-1 py-1 text-brand-charcoal">
            Overview
          </span>
          <span className="ml-2 text-brand-charcoal/45">
            Click any field below to override what the buyer sees on the report.
          </span>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-104px)] grid-cols-1 lg:grid-cols-[1fr_360px]">
        {/* Canvas — mirrors the public OverviewSection structure */}
        <div className="overflow-y-auto bg-brand-cream/60 p-10">
          <div className="mx-auto max-w-2xl rounded-md bg-white p-12 shadow-xl">
            <Eyebrow>Overview</Eyebrow>

            <button
              type="button"
              onClick={() => setSelected("name")}
              className={`mt-4 block w-full text-left transition ${
                selected === "name" ? "ring-2 ring-brand-charcoal/30 ring-offset-2" : ""
              }`}
            >
              <h1
                className="font-serif text-3xl font-bold leading-tight text-brand-forest"
                style={{ fontFamily: "var(--font-libre), serif" }}
              >
                {display("name")}
              </h1>
              {isOverridden("name") && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                  Overridden
                </p>
              )}
            </button>

            {/* Narrative — two slots */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <button
                type="button"
                onClick={() => setSelected("narrativeIntro")}
                className={`text-left transition ${
                  selected === "narrativeIntro" ? "ring-2 ring-brand-charcoal/30 ring-offset-2" : ""
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-charcoal/90">
                  {display("narrativeIntro") || (
                    <span className="text-brand-charcoal/40">
                      Click to write the intro paragraph.
                    </span>
                  )}
                </p>
                {isOverridden("narrativeIntro") && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                    Overridden
                  </p>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelected("narrativeCallout")}
                className={`text-left transition ${
                  selected === "narrativeCallout" ? "ring-2 ring-brand-charcoal/30 ring-offset-2" : ""
                }`}
              >
                <div className="border-l-[6px] border-brand-terracotta pl-6 py-2">
                  <blockquote
                    className="text-brand-forest leading-tight text-xl italic"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    &ldquo;
                    {display("narrativeCallout") || (
                      <span className="not-italic text-brand-charcoal/40">
                        Click to write the callout.
                      </span>
                    )}
                    &rdquo;
                  </blockquote>
                </div>
                {isOverridden("narrativeCallout") && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                    Overridden
                  </p>
                )}
              </button>
            </div>

            {/* Key metrics row 1 */}
            <div className="mt-12 border-t border-brand-sage/30 pt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Metric label="Total Area" fieldKey="area" unit="ha" />
              <Metric label="Annual Natural Capital" fieldKey="naturalCapital" unit="€" />
              <Metric label="Long-Term Value" fieldKey="longTermValue" unit="€" />
            </div>

            {/* Key metrics row 2 */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              <Metric label="Water Security" fieldKey="waterSecurity" unit="/10" />
              <Metric label="Biodiversity Score" fieldKey="biodiversityScore" unit="/10" />
              <Metric label="Energy Independence" fieldKey="energyIndependence" unit="/10" />
            </div>

            {/* Risk row */}
            <div className="mt-12 border-t border-brand-sage/30 pt-8">
              <h3 className="text-[10px] font-bold tracking-[0.3em] text-brand-sage uppercase mb-6">
                Risk Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <RiskMetric label="Fire Risk" fieldKey="fireRisk" />
                <RiskMetric label="Flood Risk" fieldKey="floodRisk" />
                <RiskMetric label="Drought Risk" fieldKey="droughtRisk" />
              </div>
            </div>
          </div>
        </div>

        {/* Field inspector */}
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
                ? selectedField.hint ||
                  "Type below to override the computed value. Saved overrides show up on the public report."
                : "Click any field on the left."}
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
                {selectedField?.unit && (
                  <span className="ml-1 text-brand-charcoal/50">
                    {selectedField.unit}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-brand-charcoal/55">
                Your override
              </p>
              {selectedField?.multiline ? (
                <textarea
                  rows={6}
                  value={selected ? (values[selected] ?? "") : ""}
                  placeholder={selected ? computed[selected] : "—"}
                  disabled={!selected}
                  onChange={(e) =>
                    selected && setField(selected, e.target.value)
                  }
                  className="mt-1 w-full rounded border border-brand-sage/30 bg-brand-cream/40 px-3 py-2 text-sm text-brand-charcoal focus:outline-none focus:ring-1 focus:ring-brand-charcoal disabled:text-brand-charcoal/40"
                />
              ) : (
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={selected ? (values[selected] ?? "") : ""}
                    placeholder={selected ? computed[selected] : "—"}
                    disabled={!selected}
                    onChange={(e) =>
                      selected && setField(selected, e.target.value)
                    }
                    className="flex-1 rounded border border-brand-sage/30 bg-brand-cream/40 px-3 py-2 text-base text-brand-charcoal disabled:text-brand-charcoal/40"
                  />
                  {selectedField?.unit && (
                    <span className="text-[12px] text-brand-charcoal/55">
                      {selectedField.unit}
                    </span>
                  )}
                </div>
              )}
              {selected && isOverridden(selected) && (
                <button
                  type="button"
                  onClick={() => setField(selected, "")}
                  className="mt-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55 hover:text-brand-charcoal"
                >
                  Clear override
                </button>
              )}
              <p className="mt-2 text-[10px] text-brand-charcoal/45">
                Overrides replace the computed value on the public report.
                Leave blank to keep the computed value.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
