"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "./client";

const SESSION_COOKIE = "__session";

function setSessionCookie(token: string) {
  const maxAge = 60 * 60; // 1 hour — matches Firebase ID token lifetime
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  setSessionCookie(token);
  return result;
}

export async function signUpWithEmail(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const token = await result.user.getIdToken();
  setSessionCookie(token);
  return result;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const token = await result.user.getIdToken();
  setSessionCookie(token);
  return result;
}

export async function signOut() {
  clearSessionCookie();
  return firebaseSignOut(auth);
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    const unsubToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setSessionCookie(token);
      } else {
        clearSessionCookie();
      }
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  return {
    user,
    loading,
    signIn: signInWithGoogle,
    signOut,
  };
}
