"use client";

import { useRef, useState, useTransition } from "react";
import { Eyebrow, PillButton } from "@/components/agent/primitives";
import type { AgentSettings } from "@/lib/types";
import { saveBrandingAction, saveLogoAction } from "./actions";

const SWATCHES = [
  "#1B3A2F",
  "#8B9A7E",
  "#C4705A",
  "#D4A574",
  "#2C2C2C",
  "#7A5B4A",
];

interface Props {
  ownerId: string;
  initial: AgentSettings;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function BrandingClient({ ownerId, initial }: Props) {
  const [agencyName, setAgencyName] = useState(initial.agencyName || "");
  const [leadAgent, setLeadAgent] = useState(initial.leadAgent || "");
  const [license, setLicense] = useState(initial.license || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [publicEmail, setPublicEmail] = useState(initial.publicEmail || "");
  const [tagline, setTagline] = useState(initial.tagline || "");
  const [accentColor, setAccentColor] = useState(
    initial.accentColor || SWATCHES[0]
  );
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || "");
  const [logoProgress, setLogoProgress] = useState<number | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  function chooseLogo() {
    fileRef.current?.click();
  }

  async function uploadLogo(file: File) {
    setLogoError(null);
    setLogoProgress(0);
    const path = `logos/${Date.now()}-${safeFilename(file.name)}`;
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
      const saveRes = await saveLogoAction({ downloadUrl: url });
      if (!saveRes.ok) {
        throw new Error(saveRes.error || "Save failed");
      }
      setLogoUrl(url);
      setLogoProgress(null);
    } catch (e) {
      setLogoError((e as Error).message);
      setLogoProgress(null);
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveBrandingAction({
        agencyName,
        leadAgent,
        license,
        phone,
        publicEmail,
        tagline,
        accentColor,
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(res.error || "Failed to save");
      }
    });
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.1fr]">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
          <Eyebrow>Logo</Eyebrow>
          <div className="mt-4 flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-dashed border-brand-sage/45 bg-brand-cream/50 text-[11px] text-brand-charcoal/45">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Agency logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                "No logo"
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-charcoal">
                Upload your logo
              </p>
              <p className="text-[11px] text-brand-charcoal/50">
                SVG or PNG. Transparent background works best.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) uploadLogo(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={chooseLogo}
                  className="rounded border border-brand-sage/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal/70 hover:border-brand-charcoal"
                >
                  {logoUrl ? "Replace" : "Choose file"}
                </button>
                {logoProgress !== null && (
                  <span className="text-[11px] text-brand-charcoal/55">
                    Uploading {logoProgress}%
                  </span>
                )}
              </div>
              {logoError && (
                <p className="mt-2 text-[11px] text-brand-terracotta">
                  {logoError}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-brand-sage/30 bg-white p-6">
          <Eyebrow>Agent / Agency details</Eyebrow>

          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
              Agency name
            </span>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Your agency name"
              className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                Lead agent
              </span>
              <input
                value={leadAgent}
                onChange={(e) => setLeadAgent(e.target.value)}
                placeholder="Full name"
                className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                License #
              </span>
              <input
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="optional"
                className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                Phone
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+…"
                className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                Public email
              </span>
              <input
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                placeholder="hello@…"
                className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
              Tagline (cover footer)
            </span>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short line that sits under your logo"
              className="mt-2 w-full border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
            />
          </label>
        </div>

        <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
          <Eyebrow>Accent colour</Eyebrow>
          <p className="mt-1 text-[11px] text-brand-charcoal/50">
            Used sparingly for divider lines and KPI accents.
          </p>
          <div className="mt-4 flex gap-3">
            {SWATCHES.map((c) => {
              const active = c.toLowerCase() === accentColor.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccentColor(c)}
                  className={
                    active
                      ? "h-9 w-9 cursor-pointer rounded-full border-2 border-brand-charcoal ring-2 ring-brand-charcoal/30 ring-offset-2"
                      : "h-9 w-9 cursor-pointer rounded-full border-2 border-white"
                  }
                  style={{ background: c }}
                  aria-label={c}
                />
              );
            })}
          </div>
        </div>

        <button type="submit" className="hidden" aria-hidden />
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
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-brand-cream/95 text-[10px] text-brand-charcoal/45">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  "Logo"
                )}
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-cream/90">
                {agencyName || "Your agency"}
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
              style={{ background: accentColor }}
            />
            <p className="mt-3 text-[11px] text-brand-charcoal/55">
              {tagline || "Region · area · prepared by …"}
            </p>
            {leadAgent && (
              <p className="mt-1 text-[11px] text-brand-charcoal/55">
                Lead agent: {leadAgent}
                {license ? ` · Lic. ${license}` : ""}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-[11px] text-brand-charcoal/55">
            {saved && (
              <span className="font-semibold uppercase tracking-[0.15em] text-brand-forest">
                Saved
              </span>
            )}
            {error && (
              <span className="font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                {error}
              </span>
            )}
          </div>
          <PillButton variant="primary" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save branding"}
          </PillButton>
        </div>
      </div>
    </div>
  );
}
