import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Field,
  TextInput,
} from "@/components/agent/primitives";

export const metadata: Metadata = {
  title: "Co-branding · Agents",
};

const SWATCHES = [
  "#1B3A2F",
  "#8B9A7E",
  "#C4705A",
  "#D4A574",
  "#2C2C2C",
  "#7A5B4A",
];

export default function CoBrandingPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="settings" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <Eyebrow>Settings · Co-branding</Eyebrow>
          <SerifTitle className="mt-3 text-3xl leading-tight">
            Co-branding
          </SerifTitle>
          <p className="mt-2 max-w-2xl text-sm text-brand-charcoal/60">
            Applied to the cover and footer of every report you generate.
            Buyers see your brand alongside LandBook&rsquo;s methodology badge.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
            <form className="space-y-6">
              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Logo</Eyebrow>
                <div className="mt-4 flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-brand-sage/45 bg-brand-cream/50 text-[11px] text-brand-charcoal/45">
                    No logo
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-charcoal">
                      Upload your logo
                    </p>
                    <p className="text-[11px] text-brand-charcoal/50">
                      SVG or PNG. Transparent background works best.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-brand-sage/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70"
                      >
                        Choose file
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Agent / Agency details</Eyebrow>
                <Field label="Agency name">
                  <TextInput placeholder="Your agency name" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Lead agent">
                    <TextInput placeholder="Full name" />
                  </Field>
                  <Field label="License #">
                    <TextInput placeholder="optional" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone">
                    <TextInput placeholder="+…" />
                  </Field>
                  <Field label="Public email">
                    <TextInput placeholder="hello@…" />
                  </Field>
                </div>
                <Field label="Tagline (cover footer)">
                  <TextInput placeholder="A short line that sits under your logo" />
                </Field>
              </div>

              <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
                <Eyebrow>Accent colour</Eyebrow>
                <p className="mt-1 text-[11px] text-brand-charcoal/50">
                  Used sparingly for divider lines and KPI accents.
                </p>
                <div className="mt-4 flex gap-3">
                  {SWATCHES.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      className={
                        i === 0
                          ? "h-9 w-9 cursor-pointer rounded-full border-2 border-brand-charcoal ring-2 ring-brand-charcoal/30 ring-offset-2"
                          : "h-9 w-9 cursor-pointer rounded-full border-2 border-white"
                      }
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            </form>

            <div className="rounded-lg border border-brand-sage/30 bg-white p-8">
              <Eyebrow>Live preview · Cover</Eyebrow>
              <div className="mt-4 aspect-[3/4] overflow-hidden rounded border border-brand-sage/30 bg-brand-cream">
                <div className="relative h-2/3 bg-brand-forest">
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(139,154,126,0.55), transparent 60%), radial-gradient(circle at 70% 70%, rgba(212,165,116,0.4), transparent 60%)",
                    }}
                  />
                  <div className="absolute left-6 top-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-brand-cream/95 text-[10px] text-brand-charcoal/45">
                      Logo
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-cream/90">
                      Your agency
                    </span>
                  </div>
                  <div className="absolute right-6 top-6 text-right">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-cream/85">
                      In partnership with
                    </span>
                    <p
                      className="font-serif text-sm text-brand-cream"
                      style={{ fontFamily: "var(--font-libre), serif" }}
                    >
                      LandBook
                    </p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-brand-charcoal/55">
                    Natural Capital Report
                  </p>
                  <p
                    className="mt-2 font-serif text-2xl font-bold leading-tight text-brand-charcoal"
                    style={{ fontFamily: "var(--font-libre), serif" }}
                  >
                    Property name
                  </p>
                  <div
                    className="mt-4 h-px w-12"
                    style={{ background: "#1B3A2F" }}
                  />
                  <p className="mt-3 text-[11px] text-brand-charcoal/55">
                    Region · area · prepared by …
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55"
                >
                  Show footer preview
                </button>
                <PillButton variant="primary">Save branding</PillButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
