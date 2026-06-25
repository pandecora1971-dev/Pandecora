"use client";

/**
 * Client-side auth helpers.
 *
 * All network calls hit the /api/auth/* route handler.
 * No server-only code imported here — safe to bundle for the browser.
 */

import { useCallback, useEffect, useState } from "react";
import type { SafeUser } from "@/lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientSession {
  user: SafeUser;
  expiresAt: string; // ISO-8601 string from JSON
}

export interface UseSessionResult {
  session: ClientSession | null;
  user: SafeUser | null;
  loading: boolean;
  /** Re-fetches the session from the server. */
  refresh: () => Promise<void>;
}

export interface AuthError {
  error: string;
  reason?: string;
  retryAfterMs?: number;
}

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: string; retryAfterMs?: number };

// ─── useSession hook ──────────────────────────────────────────────────────────

/**
 * Fetches and caches the current session. Refetches when the window regains
 * focus (the user returns from another tab) to keep expiry in sync.
 */
export function useSession(): UseSessionResult {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as ClientSession;
        setSession(data);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();

    // Revalidate when the user returns to the tab
    const handleFocus = () => void fetchSession();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchSession]);

  return {
    session,
    user: session?.user ?? null,
    loading,
    refresh: fetchSession,
  };
}

// ─── signIn ───────────────────────────────────────────────────────────────────

export async function signIn(credentials: {
  email: string;
  password: string;
}): Promise<AuthResult<ClientSession>> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(credentials),
  });

  const body = (await res.json()) as ClientSession | AuthError;

  if (!res.ok) {
    const err = body as AuthError;
    return {
      ok: false,
      error: err.error ?? "Sign in failed. Please try again.",
      reason: err.reason,
      retryAfterMs: err.retryAfterMs,
    };
  }

  return { ok: true, data: body as ClientSession };
}

// ─── signOut ──────────────────────────────────────────────────────────────────

/**
 * Destroys the session server-side, then clears it locally.
 * Optionally redirects to a URL after sign-out.
 */
export async function signOut(options?: { redirectTo?: string }): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => undefined); // Best-effort — proceed to redirect regardless

  if (options?.redirectTo) {
    window.location.href = options.redirectTo;
  }
}

// ─── signUp ───────────────────────────────────────────────────────────────────

export interface SignUpPayload {
  // Step 1
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  teacherOrStudent: "TEACHER" | "STUDENT";
  // Step 2
  division: string;
  district: string;
  upazila: string;
  specificAddress?: string;
  institutionType: "UNIVERSITY" | "SCHOOL" | "COLLEGE" | "MADRASA" | "OTHERS";
  universityType?: "PUBLIC" | "PRIVATE" | "OTHERS";
  institutionName: string;
  department?: string;
}

export async function signUp(
  payload: SignUpPayload
): Promise<AuthResult<ClientSession>> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as ClientSession | AuthError;

  if (!res.ok) {
    const err = body as AuthError;
    return {
      ok: false,
      error: err.error ?? "Registration failed. Please try again.",
      reason: err.reason,
    };
  }

  return { ok: true, data: body as ClientSession };
}

// ─── Convenience re-export of password rules ──────────────────────────────────
// Import from here so UI components have a single auth-related import.

export { validatePasswordStrength } from "@/lib/validators";
export type { PasswordStrengthResult } from "@/lib/validators";
