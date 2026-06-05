"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/firebase/auth";
import { cn } from "@/lib/utils";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
    />
  </svg>
);

const inputClass =
  "w-full rounded-full border border-brand-sage/40 bg-white px-5 py-3.5 text-sm text-brand-charcoal outline-none transition placeholder:text-brand-charcoal/35 focus:border-brand-charcoal";

function friendlyError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account — try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email sign-up isn't enabled yet — use Google for now.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a moment.";
    default:
      return fallback || "Something went wrong. Please try again.";
  }
}

export default function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setLoading(true);
    setError(null);
    try {
      await fn();
      router.push("/agent");
    } catch (e) {
      const code = (e as { code?: string })?.code;
      const message = e instanceof Error ? e.message : "";
      setError(friendlyError(code, message));
      setLoading(false);
    }
  }

  const handleGoogle = () => run(signInWithGoogle);

  const handleEmail = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      mode === "signup"
        ? signUpWithEmail(email.trim(), password)
        : signInWithEmail(email.trim(), password)
    );
  };

  return (
    <div className="mt-10 space-y-4">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-full border border-brand-charcoal bg-brand-charcoal px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-brand-cream transition",
          "hover:bg-transparent hover:text-brand-charcoal",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
          <GoogleIcon />
        </span>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-charcoal/40">
        <span className="h-px flex-1 bg-brand-sage/40" />
        or
        <span className="h-px flex-1 bg-brand-sage/40" />
      </div>

      <form onSubmit={handleEmail} className="space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@agency.com"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "w-full rounded-full border border-brand-charcoal px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.15em] text-brand-charcoal transition",
            "hover:bg-brand-charcoal hover:text-brand-cream",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {loading
            ? "Working…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {error && (
        <p className="text-[11px] text-brand-terracotta" role="alert">
          {error}
        </p>
      )}

      <p className="text-[11px] text-brand-charcoal/55">
        {mode === "signup" ? "Already have an account? " : "New here? "}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signup" ? "signin" : "signup"));
            setError(null);
          }}
          className="text-brand-charcoal underline underline-offset-2"
        >
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
