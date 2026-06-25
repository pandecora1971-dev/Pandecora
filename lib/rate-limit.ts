/**
 * In-memory fixed-window rate limiter — no external dependencies.
 *
 * Keyed by an arbitrary string (IP + context, or user ID + context) so
 * different endpoints maintain independent buckets even when the numeric
 * limits happen to match.
 *
 * NOTE: State is process-local. In a multi-instance deployment (Vercel
 * serverless, PM2 cluster) each instance keeps its own counters. Replace
 * the Map with a shared store (e.g. Upstash Redis) before scaling
 * horizontally.
 */

// ─── Store ────────────────────────────────────────────────────────────────────

interface Entry {
  count: number;
  resetTime: number; // epoch ms — the moment this window expires
}

const store = new Map<string, Entry>();

/**
 * Purge expired entries every 60 s.
 *
 * unref() lets Node.js exit naturally even while the timer is pending —
 * important for test runners and short-lived serverless cold-starts.
 */
const _cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetTime <= now) store.delete(key);
  }
}, 60_000);

// The timer type differs between Node.js (object with .unref()) and browsers
// (number). Guard so this module is safe in both runtimes.
if (typeof (_cleanup as unknown as NodeJS.Timeout).unref === "function") {
  (_cleanup as unknown as NodeJS.Timeout).unref();
}

// ─── Result type ──────────────────────────────────────────────────────────────

export interface RateLimitResult {
  /** true → request is within quota and should be allowed. */
  success: boolean;
  /** How many more requests are allowed in the current window (0 when blocked). */
  remaining: number;
  /** Milliseconds until the current window resets (use for Retry-After headers). */
  resetIn: number;
}

// ─── Core fixed-window counter ────────────────────────────────────────────────

/**
 * Increment the counter for `key` and return whether the request is allowed.
 * A new window opens whenever the previous one expires.
 */
function checkLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // ── New or expired window → reset ─────────────────────────────────────────
  if (!entry || entry.resetTime <= now) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      remaining: limit - 1,
      resetIn: windowMs,
    };
  }

  // ── Limit not yet reached → increment and allow ───────────────────────────
  if (entry.count < limit) {
    entry.count++;
    return {
      success: true,
      remaining: limit - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  // ── Limit exceeded → reject without incrementing ──────────────────────────
  return {
    success: false,
    remaining: 0,
    resetIn: entry.resetTime - now,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rate-limits an unauthenticated request by client IP address.
 *
 * @param ip       The client IP extracted from x-forwarded-for / x-real-ip.
 * @param limit    Maximum requests allowed per window.
 * @param windowMs Window length in milliseconds.
 * @param context  Bucket namespace — separate contexts with the same IP and
 *                 identical limit/windowMs will not share a counter.
 *
 * @example
 * const rl = rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");
 * if (!rl.success) {
 *   return Response.json(
 *     { error: "Too many attempts" },
 *     { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
 *   );
 * }
 */
export function rateLimitByIP(
  ip: string,
  limit: number,
  windowMs: number,
  context = "default"
): RateLimitResult {
  return checkLimit(`ip:${context}:${ip}`, limit, windowMs);
}

/**
 * Rate-limits an authenticated request by the user's database ID.
 * Use for actions that require a valid session (form submissions, uploads).
 *
 * @example
 * const rl = rateLimitByUser(userId, LIMITS.FORM.max, LIMITS.FORM.windowMs, "report");
 * if (!rl.success) {
 *   return Response.json({ error: "Too many requests" }, { status: 429 });
 * }
 */
export function rateLimitByUser(
  userId: string,
  limit: number,
  windowMs: number,
  context = "default"
): RateLimitResult {
  return checkLimit(`user:${context}:${userId}`, limit, windowMs);
}

// ─── Preset limits ────────────────────────────────────────────────────────────
//
// Import these alongside the functions to avoid magic numbers at call sites.
//
//   import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
//   const rl = rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");

export const LIMITS = {
  /** 5 attempts per 15 minutes — login endpoint (IP-based). */
  LOGIN: { max: 5, windowMs: 15 * 60 * 1000 },
  /** 10 registrations per hour — signup endpoint (IP-based). */
  SIGNUP: { max: 10, windowMs: 60 * 60 * 1000 },
  /** 5 uploads per minute — file upload endpoint (IP or user). */
  UPLOAD: { max: 5, windowMs: 60 * 1_000 },
  /** 20 submissions per hour — incident report form (user-based). */
  FORM: { max: 20, windowMs: 60 * 60 * 1_000 },
} as const;

// ─── Test helper (non-production only) ───────────────────────────────────────

/** Wipes all counters. Only for use in tests — never call in application code. */
export function _resetStoreForTesting(): void {
  if (process.env.NODE_ENV === "production") return;
  store.clear();
}
