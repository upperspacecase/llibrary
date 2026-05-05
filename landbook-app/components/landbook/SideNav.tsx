"use client";

import { useEffect, useRef, useState } from "react";

const FEEDBACK_EMAIL = "hi@landlibrary.co";

function FeedbackModal({
  propertyName,
  onClose,
}: {
  propertyName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
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
        body: JSON.stringify({ name, email, subject, message, propertyName }),
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-brand-forest">Support &amp; Feedback</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-brand-forest"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
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
                className="px-4 py-2 text-sm bg-brand-forest text-white hover:bg-brand-forest/90"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-brand-sage mb-4">
              Sent directly to <span className="font-mono">{FEEDBACK_EMAIL}</span>.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  disabled={sending}
                  className="border border-brand-sage/40 px-3 py-2 focus:outline-none focus:border-brand-forest disabled:opacity-50"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Reply-to email (optional)"
                  disabled={sending}
                  className="border border-brand-sage/40 px-3 py-2 focus:outline-none focus:border-brand-forest disabled:opacity-50"
                />
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                disabled={sending}
                className="w-full border border-brand-sage/40 px-3 py-2 focus:outline-none focus:border-brand-forest disabled:opacity-50"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What would you like to share?"
                required
                rows={6}
                disabled={sending}
                className="w-full border border-brand-sage/40 px-3 py-2 focus:outline-none focus:border-brand-forest resize-none disabled:opacity-50"
              />
              {status === "error" && (
                <p className="text-xs text-brand-terracotta">{errorMsg}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-brand-forest disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 text-sm bg-brand-forest text-white hover:bg-brand-forest/90 disabled:opacity-50"
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

const NAV_ITEMS = [
  { id: "overview", icon: "description", label: "Overview" },
  { id: "region-ecosystem", icon: "location_on", label: "Region & Ecosystem" },
  { id: "land-water", icon: "terrain", label: "Land & Water" },
  { id: "biodiversity-habitat", icon: "forest", label: "Biodiversity & Habitat" },
  { id: "climate-seasons", icon: "thermostat", label: "Climate & Seasons" },
  { id: "value-benefits", icon: "eco", label: "Value & Benefits" },
  { id: "history-trends", icon: "trending_up", label: "History & Trends" },
  { id: "risks-resilience", icon: "shield", label: "Risks & Resilience" },
  { id: "future-scenarios", icon: "lightbulb", label: "Future Scenarios" },
  { id: "sources-methodology", icon: "science", label: "Sources & Methodology" },
];

export function SideNav({ propertyName }: { propertyName: string }) {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        // Pick the first visible section in document order
        for (const item of NAV_ITEMS) {
          if (visibleSections.has(item.id)) {
            setActiveId(item.id);
            break;
          }
        }
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside className="no-print hidden md:flex flex-col w-72 bg-[#E9E9E9] text-brand-forest text-sm font-medium border-r-[0.5px] border-brand-sage/40 shrink-0">
      <div className="fixed top-0 left-0 w-72 h-full flex flex-col py-8 overflow-y-auto">
        {/* Branding */}
        <div className="px-6 mb-8">
          <img
            src="/landbook-logo.png"
            alt="LandBook"
            className="h-8 mb-2"
          />
          <h2 className="text-xs font-bold tracking-widest text-brand-sage uppercase">
            {propertyName}
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`flex items-center w-full text-left px-6 py-2.5 transition-transform duration-200 hover:translate-x-1 ${
                  isActive
                    ? "bg-white text-brand-forest font-bold border-l-4 border-brand-forest"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-lg">
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Support & Feedback */}
        <div className="px-6 py-4 mt-auto">
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-forest transition-colors"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            Support &amp; Feedback
          </button>
        </div>
      </div>
      {feedbackOpen && (
        <FeedbackModal
          propertyName={propertyName}
          onClose={() => setFeedbackOpen(false)}
        />
      )}
    </aside>
  );
}
