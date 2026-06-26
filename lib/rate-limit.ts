/**
 * Rate limiter with two backends:
 *
 *   1. Upstash Redis (production, multi-instance)
 *      Enabled when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 *      Uses a sliding-window algorithm shared across all serverless instances,
 *      which is the only approach that correctly limits at 20k concurrent users
 *      on Vercel (each invocation is a separate process with no shared memory).
 *
 *   2. In-memory fixed-window (dev / local testing)
 *      Falls back automatically when Upstash env vars are absent. Accurate for
 *      single-process deployments; not suitable for production at scale.
 *
 * To enable Redis on Vercel:
 *   1. Create a free Upstash Redis database at console.upstash.com
 *   2. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to Vercel env vars
 */

// ─── Result type ──────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // ms until window resets (use for Retry-After headers)
}

// Type-only import — erased at compile time, zero runtime cost when Redis is not used.
import type { Ratelimit } from "@upstash/ratelimit";

// ─── Backend selection ────────────────────────────────────────────────────────

const useRedis =
  typeof process !== "undefined" &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// ─── Upstash Redis backend ────────────────────────────────────────────────────

let redisRatelimit: ((key: string, limit: number, windowMs: number) => Promise<RateLimitResult>) | null = null;

if (useRedis) {
  // Dynamic import so the packages are never bundled when Redis is not configured.
  // Both @upstash/redis and @upstash/ratelimit are lightweight HTTP-only clients
  // that work in Edge and Node.js serverless runtimes.
  const initRedis = async () => {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const cache = new Map<string, Ratelimit>();

    return async (key: string, limit: number, windowMs: number): Promise<RateLimitResult> => {
      const bucketKey = `${limit}:${windowMs}`;
      if (!cache.has(bucketKey)) {
        cache.set(
          bucketKey,
          new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
            prefix:  "@ratelimit",
          })
        );
      }
      const rl = cache.get(bucketKey)!;
      const result = await rl.limit(key);
      return {
        success:   result.success,
        remaining: result.remaining,
        resetIn:   result.reset - Date.now(),
      };
    };
  };

  // Eagerly initialise to avoid cold-start latency on the first rate-limited request.
  initRedis().then((fn) => { redisRatelimit = fn; }).catch(() => {
    console.warn("[rate-limit] Upstash Redis init failed — falling back to in-memory limiter");
  });
}

// ─── In-memory backend (dev / single-process fallback) ───────────────────────

interface Entry {
  count: number;
  resetTime: number;
}

const store = new Map<string, Entry>();

// Purge expired entries every 60 s. unref() allows Node to exit naturally.
const _cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetTime <= now) store.delete(key);
  }
}, 60_000);

if (typeof (_cleanup as unknown as NodeJS.Timeout).unref === "function") {
  (_cleanup as unknown as NodeJS.Timeout).unref();
}

function checkInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetTime <= now) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count < limit) {
    entry.count++;
    return { success: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
  }

  return { success: false, remaining: 0, resetIn: entry.resetTime - now };
}

// ─── Unified check ────────────────────────────────────────────────────────────

async function checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (redisRatelimit) {
    try {
      return await redisRatelimit(key, limit, windowMs);
    } catch {
      // Redis call failed — degrade gracefully to in-memory
    }
  }
  return checkInMemory(key, limit, windowMs);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function rateLimitByIP(
  ip: string,
  limit: number,
  windowMs: number,
  context = "default"
): Promise<RateLimitResult> {
  return checkLimit(`ip:${context}:${ip}`, limit, windowMs);
}

export async function rateLimitByUser(
  userId: string,
  limit: number,
  windowMs: number,
  context = "default"
): Promise<RateLimitResult> {
  return checkLimit(`user:${context}:${userId}`, limit, windowMs);
}

// ─── Preset limits ────────────────────────────────────────────────────────────

export const LIMITS = {
  LOGIN:  { max: 5,  windowMs: 15 * 60 * 1000 },
  SIGNUP: { max: 10, windowMs: 60 * 60 * 1000 },
  UPLOAD: { max: 5,  windowMs: 60 * 1_000 },
  FORM:   { max: 20, windowMs: 60 * 60 * 1_000 },
} as const;

// ─── Test helper ──────────────────────────────────────────────────────────────

export function _resetStoreForTesting(): void {
  if (process.env.NODE_ENV === "production") return;
  store.clear();
}
