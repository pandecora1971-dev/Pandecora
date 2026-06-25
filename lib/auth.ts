/**
 * Server-side authentication module.
 *
 * Better Auth's Prisma adapter cannot be used here: it queries the `email`
 * column directly, but our schema stores emails AES-256-GCM encrypted with
 * only an HMAC-SHA256 hash available for lookups. This module implements the
 * same API surface (auth.api.getSession, etc.) while working with our schema.
 *
 * Security properties:
 *  - Passwords hashed with argon2id (64 MiB / 3 iterations / parallelism 4)
 *  - Session tokens: crypto.randomBytes(32) → 256-bit entropy
 *  - Lockout: 5 failed attempts → 15-minute lock (in-memory; see NOTE below)
 *  - Timing-safe: dummy argon2 compare runs even when email is not found
 *  - Login failure message is always generic (no email enumeration)
 *  - Sessions are destroyed server-side on logout (not just cookie-cleared)
 *  - Rolling sessions: expiry extended on every validated request
 */

import "server-only";

import crypto from "crypto";
import argon2 from "argon2";
import { db } from "@/lib/db";
import { decrypt, encrypt, hashForLookup } from "@/lib/encryption";
import { validatePasswordStrength } from "@/lib/validators";
import type {
  InstitutionType,
  Role,
  Session,
  TeacherOrStudent,
  UniversityType,
} from "@prisma/client";

export { validatePasswordStrength };

// ─── Config ───────────────────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = "sip_session"; // sip = session cookie for pandecora

const SESSION_TOKEN_BYTES = 32;               // 256-bit session token
const SESSION_DURATION_MS = 30 * 60 * 1000;  // 30-minute inactivity window (rolling)
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;  // 15-minute lockout after 5 failures

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB — OWASP minimum for argon2id
  timeCost: 3,
  parallelism: 4,
};

// Pre-compute a dummy argon2id hash so we can run a constant-time comparison
// when the email is not found — preventing timing-based email enumeration.
// Starts computing at module load; awaited lazily on first use.
const _dummyHashReady: Promise<string> = argon2.hash(
  "sip-dummy:" + crypto.randomBytes(16).toString("hex"),
  ARGON2_OPTS
);

// ─── Password hashing ─────────────────────────────────────────────────────────

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTS);
}

/** Returns false instead of throwing on malformed hashes. */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

// ─── Brute-force / lockout tracking ──────────────────────────────────────────
//
// NOTE: This in-memory store resets on process restart and does NOT work
// across multiple Node.js instances (e.g. Vercel serverless, PM2 cluster).
// Replace with Redis (e.g. Upstash) or a DB table before horizontal scaling.

interface AttemptRecord {
  count: number;
  lockedUntil: number | null; // epoch ms, or null if not locked
}

const _attemptStore = new Map<string, AttemptRecord>();

function _getRecord(emailHash: string): AttemptRecord {
  const rec = _attemptStore.get(emailHash) ?? { count: 0, lockedUntil: null };
  // Auto-expire stale lock
  if (rec.lockedUntil !== null && rec.lockedUntil <= Date.now()) {
    return { count: 0, lockedUntil: null };
  }
  return rec;
}

export interface LockStatus {
  locked: boolean;
  retryAfterMs: number;
  attemptsRemaining: number;
}

export function checkLockStatus(emailHash: string): LockStatus {
  const rec = _getRecord(emailHash);
  if (rec.lockedUntil !== null) {
    return {
      locked: true,
      retryAfterMs: Math.max(0, rec.lockedUntil - Date.now()),
      attemptsRemaining: 0,
    };
  }
  return {
    locked: false,
    retryAfterMs: 0,
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - rec.count,
  };
}

export function recordFailedAttempt(emailHash: string): LockStatus {
  const rec = _getRecord(emailHash);
  rec.count += 1;

  if (rec.count >= MAX_LOGIN_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  _attemptStore.set(emailHash, rec);
  return checkLockStatus(emailHash);
}

export function clearLoginAttempts(emailHash: string): void {
  _attemptStore.delete(emailHash);
}

// ─── Session token & cookie helpers ──────────────────────────────────────────

export function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex"); // 64-char hex = 256-bit
}

/** Serialises a cookie string (avoids depending on a third-party cookie lib). */
function serialiseCookie(
  name: string,
  value: string,
  opts: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Lax" | "Strict" | "None";
    expires?: Date;
    maxAge?: number;
    path?: string;
  }
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  return parts.join("; ");
}

const isProduction = process.env.NODE_ENV === "production";

export function makeSessionCookie(token: string, expiresAt: Date): string {
  return serialiseCookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    expires: expiresAt,
    path: "/",
  });
}

/** Produces an expired Set-Cookie header that instructs the browser to delete the cookie. */
export function makeExpiredCookie(): string {
  return serialiseCookie(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "Lax",
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });
}

/** Parses the session token from a raw Cookie header string. */
export function extractSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const pattern = new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`);
  const match = cookieHeader.match(pattern);
  return match ? decodeURIComponent(match[1]!) : null;
}

// ─── Safe user type (no PII ciphertext, no password hash) ────────────────────

export interface SafeUser {
  id: string;
  name: string;
  email: string;           // decrypted on the server, safe to send to client
  emailVerified: boolean;
  role: Role;
  teacherOrStudent: TeacherOrStudent;
  division: string;
  district: string;
  upazila: string;
  specificAddress: string | null;
  institutionType: InstitutionType | null;
  universityType: UniversityType | null;
  institutionName: string | null;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  session: Session;
  user: SafeUser;
}

function toSafeUser(row: {
  id: string;
  name: string;
  encryptedEmail: string;
  emailIV: string;
  emailTag: string;
  emailVerified: boolean;
  role: Role;
  teacherOrStudent: TeacherOrStudent;
  division: string;
  district: string;
  upazila: string;
  specificAddress: string | null;
  institutionType: InstitutionType | null;
  universityType: UniversityType | null;
  institutionName: string | null;
  department: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: decrypt(row.encryptedEmail, row.emailIV, row.emailTag),
    emailVerified: row.emailVerified,
    role: row.role,
    teacherOrStudent: row.teacherOrStudent,
    division: row.division,
    district: row.district,
    upazila: row.upazila,
    specificAddress: row.specificAddress,
    institutionType: row.institutionType,
    universityType: row.universityType,
    institutionName: row.institutionName,
    department: row.department,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Prisma select — intentionally excludes hashedPassword and all cipher fields
const USER_SELECT = {
  id: true,
  name: true,
  encryptedEmail: true,
  emailIV: true,
  emailTag: true,
  emailVerified: true,
  role: true,
  teacherOrStudent: true,
  division: true,
  district: true,
  upazila: true,
  specificAddress: true,
  institutionType: true,
  universityType: true,
  institutionName: true,
  department: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Session CRUD ─────────────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string } = {}
): Promise<Session> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  return db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}

/**
 * Validates a session token and returns the attached user.
 * Extends the expiry on every call (rolling session).
 * Cleans up expired sessions on lookup.
 */
export async function validateSession(token: string): Promise<SessionData | null> {
  const row = await db.session.findUnique({
    where: { token },
    include: { user: { select: USER_SELECT } },
  });

  if (!row) return null;

  if (row.expiresAt < new Date()) {
    // Expired — purge and reject
    await db.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  // Roll the window — extend expiry on every active request
  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  await db.session
    .update({ where: { id: row.id }, data: { expiresAt: newExpiry } })
    .catch(() => undefined);

  return {
    session: { ...row, expiresAt: newExpiry },
    user: toSafeUser(row.user),
  };
}

/**
 * Destroys a session server-side by token.
 * Called on logout — ensures the session cannot be reused even if the cookie
 * is somehow retained by the client or an attacker.
 */
export async function destroySession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } });
}

/**
 * Reads the session from a Headers object.
 * Use in Server Components, Route Handlers, and middleware.
 */
export async function getSession(headers: Headers): Promise<SessionData | null> {
  const token = extractSessionToken(headers.get("cookie"));
  if (!token) return null;
  return validateSession(token);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export type LoginSuccess = {
  ok: true;
  user: SafeUser;
  session: Session;
  cookieHeader: string;
};

export type LoginFailure = {
  ok: false;
  reason: "invalid_credentials" | "locked" | "unverified_email";
  message: string;
  retryAfterMs?: number;
};

export type LoginResult = LoginSuccess | LoginFailure;

export interface LoginParams {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function loginWithEmail(params: LoginParams): Promise<LoginResult> {
  const { email, password, ipAddress, userAgent } = params;
  const emailHash = hashForLookup(email);

  // ── 1. Lockout check (before any DB query) ──────────────────────────────────
  const lockStatus = checkLockStatus(emailHash);
  if (lockStatus.locked) {
    return {
      ok: false,
      reason: "locked",
      // Generic message — doesn't confirm the email is registered
      message: "Too many failed attempts. Please try again later.",
      retryAfterMs: lockStatus.retryAfterMs,
    };
  }

  // ── 2. Find user by email hash ──────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { emailHash },
    select: { ...USER_SELECT, hashedPassword: true },
  });

  // ── 3. Constant-time path for unknown email ─────────────────────────────────
  // Run a real argon2 verify against the dummy hash so the response time is
  // indistinguishable from a wrong-password attempt on a real account.
  if (!user) {
    const dummyHash = await _dummyHashReady;
    await argon2.verify(dummyHash, password).catch(() => undefined);
    return {
      ok: false,
      reason: "invalid_credentials",
      message: "Invalid email or password.",
    };
  }

  // ── 4. Verify password ──────────────────────────────────────────────────────
  const valid = await verifyPassword(password, user.hashedPassword);
  if (!valid) {
    recordFailedAttempt(emailHash);
    return {
      ok: false,
      reason: "invalid_credentials",
      message: "Invalid email or password.",
    };
  }

  // ── 5. Email verification check ────────────────────────────────────────────
  if (!user.emailVerified) {
    return {
      ok: false,
      reason: "unverified_email",
      message: "Please verify your email address before logging in. Check your inbox for the verification link.",
    };
  }

  // ── 6. Success — clear failures, create session ─────────────────────────────
  clearLoginAttempts(emailHash);
  const session = await createSession(user.id, { ipAddress, userAgent });
  const cookieHeader = makeSessionCookie(session.token, session.expiresAt);

  // Remove hashedPassword before returning (toSafeUser also strips cipher fields)
  const { hashedPassword: _pw, ...safeRow } = user;
  return {
    ok: true,
    user: toSafeUser(safeRow),
    session,
    cookieHeader,
  };
}

// ─── auth object — compatible with middleware.ts usage ────────────────────────

export const auth = {
  api: {
    /**
     * Compatible with middleware.ts:
     *   const session = await auth.api.getSession({ headers: req.headers });
     */
    getSession: ({ headers }: { headers: Headers }) => getSession(headers),
  },
} as const;
