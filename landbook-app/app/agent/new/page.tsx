import Link from "next/link";
import type { Metadata } from "next";
import { AgentHeader } from "@/components/agent/AgentHeader";
import {
  Eyebrow,
  SerifTitle,
  PillButton,
  Field,
  TextInput,
  Icon,
} from "@/components/agent/primitives";
import { Stepper } from "@/components/agent/Stepper";

export const metadata: Metadata = {
  title: "New LandBook · Agents",
};

export default function NewLandBookPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <AgentHeader active="books" />
      <div className="px-8 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-brand-charcoal/50">
            <Link href="/agent">My LandBooks</Link>
            <span>/</span>
            <span className="text-brand-charcoal">New LandBook</span>
          </div>

          <Stepper
            steps={[
              { n: "1", label: "Property", state: "active" },
              { n: "2", label: "Plan", state: "todo" },
              { n: "3", label: "Payment", state: "todo" },
              { n: "4", label: "Confirm", state: "todo" },
            ]}
          />

          <SerifTitle className="mt-8 text-3xl leading-tight">
            Tell us about the property.
          </SerifTitle>
          <p className="mt-2 max-w-2xl text-sm text-brand-charcoal/60">
            The address and boundary anchor every dataset in the report. You
            can refine these later.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_1fr]">
            <form className="space-y-6 rounded-lg border border-brand-sage/30 bg-white p-8">
              <Field
                label="Property name (internal)"
                hint="Only your team sees this"
              >
                <TextInput placeholder="A short name for this property" />
              </Field>
              <Field label="Address or parish">
                <TextInput
                  placeholder="Start typing an address…"
                  icon={
                    <span className="text-brand-charcoal/40">
                      <Icon.MapPin />
                    </span>
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Area (ha)">
                  <TextInput placeholder="—" />
                </Field>
                <Field label="Cadastral ref. (optional)">
                  <TextInput placeholder="—" />
                </Field>
              </div>

              <div className="border-t border-brand-sage/20 pt-6">
                <Eyebrow>Boundary</Eyebrow>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded border border-brand-charcoal bg-brand-charcoal px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-cream"
                  >
                    Draw on map
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded border border-brand-sage/40 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70"
                  >
                    Upload KML / GeoJSON
                  </button>
                </div>
              </div>

              <div className="border-t border-brand-sage/20 pt-6">
                <Eyebrow>Client / Seller</Eyebrow>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field label="Name">
                    <TextInput placeholder="Client or seller name" />
                  </Field>
                  <Field label="Email (for sharing)">
                    <TextInput placeholder="optional" />
                  </Field>
                </div>
              </div>
            </form>

            {/* Map placeholder — boundary not yet drawn */}
            <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-brand-sage/30 bg-brand-forest">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(139,154,126,0.55), transparent 60%), radial-gradient(circle at 70% 70%, rgba(212,165,116,0.35), transparent 60%)",
                }}
              />
              <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center text-brand-cream/85">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-cream/40 bg-brand-cream/10">
                  <Icon.MapPin />
                </div>
                <p
                  className="mt-4 max-w-xs font-serif text-lg leading-snug"
                  style={{ fontFamily: "var(--font-libre), serif" }}
                >
                  Search an address or draw the property boundary to preview
                  it on the map.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <button
              type="button"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60"
            >
              Save draft &amp; close
            </button>
            <PillButton variant="primary" icon={<Icon.ArrowRight />}>
              Continue to plan
            </PillButton>
          </div>
        </div>
      </div>
    </main>
  );
}
