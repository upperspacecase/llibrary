"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== "/agent/signin") {
      router.replace("/agent/signin");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream text-brand-charcoal/55">
        <div className="text-center">
          <div className="mx-auto h-1.5 w-1.5 animate-pulse rounded-full bg-brand-terracotta" />
          <p className="mt-3 text-[11px] uppercase tracking-[0.2em]">
            Loading
          </p>
        </div>
      </div>
    );
  }

  // After auth loads: signin page renders for everyone; everything else
  // requires a user. While the redirect is in flight, render nothing.
  if (pathname === "/agent/signin") return <>{children}</>;
  if (!user) return null;

  return <>{children}</>;
}
