import "server-only";
import crypto from "crypto";
import { hashForLookup } from "@/lib/encryption";

// httpOnly cookie that ties a guest's uploads to the report they submit.
// It identifies a browser for ~1 day, never a person.
export const GUEST_COOKIE_NAME = "pd_guest";
export const GUEST_COOKIE_MAX_AGE = 24 * 60 * 60; // seconds
const GUEST_ID_PATTERN = /^[0-9a-f]{64}$/;

export function newGuestId(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function isValidGuestId(value: string | undefined): value is string {
  return !!value && GUEST_ID_PATTERN.test(value);
}

/** Principal used when signing/verifying upload metadata for guests. */
export function guestPrincipal(guestId: string): string {
  return `guest:${guestId}`;
}

// Crockford base32 — no I, L, O, U to avoid misreading
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomChunk(len: number): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

/** 50 bits of entropy, formatted PD-XXXXX-XXXXX. */
export function generateTrackingCode(): string {
  return `PD-${randomChunk(5)}-${randomChunk(5)}`;
}

export function hashTrackingCode(code: string): string {
  return hashForLookup(`tracking:${code.trim().toUpperCase()}`);
}
