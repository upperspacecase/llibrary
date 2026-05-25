"use client";

import { useState, useTransition } from "react";
import {
  Eyebrow,
  PillButton,
  Field,
  TextInput,
  Icon,
} from "@/components/agent/primitives";
import { addRecipientAction } from "./actions";
import type { LandbookShare } from "@/lib/types";

interface Props {
  landbookId: string;
  share: LandbookShare;
  publicBaseUrl: string;
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

function activityLabel(kind: LandbookShare["activity"][number]["kind"]): string {
  switch (kind) {
    case "created":
      return "Share link created";
    case "recipient_added":
      return "Recipient added";
    case "viewed":
      return "Viewed";
    case "downloaded":
      return "PDF downloaded";
    case "expires_updated":
      return "Expiry updated";
  }
}

export default function ShareClient({ landbookId, share, publicBaseUrl }: Props) {
  const publicUrl = `${publicBaseUrl}/share/${share.token}`;
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(share.recipients.length === 0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copy failed — your browser blocked clipboard access.");
    }
  }

  function addRecipient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addRecipientAction(landbookId, { name, email, role });
      if (res.ok) {
        setName("");
        setEmail("");
        setRole("");
        setShowForm(false);
      } else {
        setError(res.error || "Could not add recipient");
      }
    });
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
            <Eyebrow>Public link</Eyebrow>
            <div className="mt-3 flex items-center gap-2 rounded border border-brand-sage/40 bg-brand-cream/50 px-4 py-3">
              <span className="text-brand-charcoal/40">
                <Icon.Share />
              </span>
              <code className="flex-1 truncate text-[12px] text-brand-charcoal/80">
                {publicUrl}
              </code>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal"
              >
                <Icon.Copy /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Link expires">
                <TextInput
                  placeholder="Never"
                  defaultValue={
                    share.expiresAt
                      ? formatWhen(share.expiresAt)
                      : undefined
                  }
                />
              </Field>
              <Field label="Buyer email gate">
                <TextInput
                  placeholder={share.emailGate ? "On" : "Off"}
                  suffix={
                    <span className="text-[10px] uppercase tracking-[0.1em] text-brand-charcoal/45">
                      {share.emailGate ? "On" : "Off"}
                    </span>
                  }
                />
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded bg-brand-cream/60 px-4 py-3 text-[11px] text-brand-charcoal/65">
              <span className="text-brand-charcoal/55">
                <Icon.Eye />
              </span>
              <span>
                You&rsquo;ll get notified for every view, scroll-to-end, and
                download.
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-brand-sage/30 bg-white p-6">
            <Eyebrow>Send directly</Eyebrow>

            {share.recipients.length === 0 ? (
              <div className="mt-3 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 py-10 text-center text-[12px] text-brand-charcoal/55">
                You haven&rsquo;t added any recipients yet.
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-brand-sage/25 rounded border border-brand-sage/30">
                {share.recipients.map((r, i) => (
                  <li
                    key={`${r.email}-${i}`}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-charcoal">
                        {r.name}
                      </p>
                      <p className="truncate text-[11px] text-brand-charcoal/55">
                        {r.email}
                        {r.role ? ` · ${r.role}` : ""}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.1em] text-brand-charcoal/50">
                      {r.sentAt ? `Added ${formatWhen(r.sentAt)}` : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {showForm ? (
              <form onSubmit={addRecipient} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                      Name
                    </span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      className="mt-2 flex w-full items-center border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@…"
                      className="mt-2 flex w-full items-center border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/60">
                    Role (optional)
                  </span>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Buyer, lawyer, …"
                    className="mt-2 flex w-full items-center border border-brand-sage/40 bg-white px-4 py-3 text-sm text-brand-charcoal outline-none placeholder:text-brand-charcoal/35 focus:border-brand-charcoal"
                  />
                </label>
                <div className="flex items-center gap-3">
                  <PillButton type="submit" variant="primary" disabled={pending}>
                    {pending ? "Saving…" : "Add recipient"}
                  </PillButton>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setError(null);
                    }}
                    className="text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55"
                  >
                    Cancel
                  </button>
                </div>
                {error && (
                  <p className="text-[11px] text-brand-terracotta">{error}</p>
                )}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-3 w-full rounded border border-dashed border-brand-sage/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55 hover:border-brand-charcoal hover:text-brand-charcoal"
              >
                + Add recipient
              </button>
            )}

            <div className="mt-5 flex justify-between gap-3">
              <PillButton variant="ghost" icon={<Icon.Download />} disabled>
                Download PDF
              </PillButton>
              <PillButton variant="primary" icon={<Icon.Mail />} disabled>
                Send invitations
              </PillButton>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border border-brand-sage/30 bg-white p-6">
          <Eyebrow>Activity</Eyebrow>
          {share.activity.length === 0 ? (
            <div className="mt-4 rounded border border-dashed border-brand-sage/40 bg-brand-cream/40 py-10 text-center text-[12px] text-brand-charcoal/55">
              No activity yet. Views, downloads and publish events will land
              here.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...share.activity]
                .sort((a, b) => (a.at < b.at ? 1 : -1))
                .map((a, i) => (
                  <li
                    key={`${a.at}-${i}`}
                    className="flex items-start justify-between gap-3 border-b border-brand-sage/15 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-brand-charcoal">
                        {activityLabel(a.kind)}
                      </p>
                      {a.meta && (a.meta.email || a.meta.name) && (
                        <p className="truncate text-[11px] text-brand-charcoal/55">
                          {(a.meta.name as string) || ""}
                          {a.meta.name && a.meta.email ? " · " : ""}
                          {(a.meta.email as string) || ""}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-brand-charcoal/45">
                      {formatWhen(a.at)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  );
}
