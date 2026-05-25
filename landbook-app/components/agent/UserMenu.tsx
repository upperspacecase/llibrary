"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth";

function initials(name?: string | null, email?: string | null): string {
  const src = name?.trim() || email?.trim() || "";
  if (!src) return "—";
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return src.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/agent/signin");
    } catch {
      setSigningOut(false);
    }
  }

  const label = initials(user?.displayName, user?.email);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-forest text-[11px] font-semibold text-brand-cream transition hover:opacity-90"
        title={user?.email || "Account"}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-brand-sage/30 bg-white shadow-lg"
        >
          <div className="border-b border-brand-sage/25 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal/55">
              Signed in as
            </p>
            <p className="mt-1 truncate text-sm font-medium text-brand-charcoal">
              {user?.displayName || user?.email || "—"}
            </p>
            {user?.displayName && user?.email && (
              <p className="truncate text-[11px] text-brand-charcoal/55">
                {user.email}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full px-4 py-3 text-left text-sm text-brand-charcoal transition hover:bg-brand-cream/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
