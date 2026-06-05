"use client";

import { useState } from "react";

const FEEDBACK_EMAIL = "hi@landlibrary.co";

export function FeedbackModal({
  source,
  onClose,
}: {
  source: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, propertyName: source }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to send");
    }
  }

  const sending = status === "sending";
  const inputClass =
    "border border-brand-sage/40 px-3 py-2 focus:outline-none focus:border-brand-forest disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl text-brand-forest">
            Support &amp; Feedback
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-brand-charcoal/50 hover:text-brand-forest"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {status === "sent" ? (
          <div className="space-y-4 text-sm">
            <p className="text-brand-forest">
              Thanks — your message is on its way to{" "}
              <span className="font-mono">{FEEDBACK_EMAIL}</span>.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-brand-forest px-4 py-2 text-sm text-white hover:bg-brand-forest/90"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-brand-sage">
              Sent directly to{" "}
              <span className="font-mono">{FEEDBACK_EMAIL}</span>.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  disabled={sending}
                  className={inputClass}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Reply-to email (optional)"
                  disabled={sending}
                  className={inputClass}
                />
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                disabled={sending}
                className={`w-full ${inputClass}`}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like to share?"
                required
                rows={6}
                disabled={sending}
                className={`w-full resize-none ${inputClass}`}
              />
              {status === "error" && (
                <p className="text-xs text-brand-terracotta">{errorMsg}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 text-sm text-brand-charcoal/60 hover:text-brand-forest disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="bg-brand-forest px-4 py-2 text-sm text-white hover:bg-brand-forest/90 disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
