"use server";

import crypto from "crypto";
import { headers, cookies } from "next/headers";
import { db } from "@/lib/db";
import { hashForLookup } from "@/lib/encryption";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_MS = 24 * 60 * 60_000;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export type VerifyResult =
  | { success: true }
  | { success: false; error: string; expired?: boolean };

export type ResendResult =
  | { success: true }
  | { success: false; error: string };

// ─── verifyEmail ──────────────────────────────────────────────────────────────

export async function verifyEmail(rawToken: string): Promise<VerifyResult> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length > 200) {
    return { success: false, error: "Invalid verification link." };
  }

  const tokenHash = hashToken(rawToken);

  const record = await db.emailVerificationToken.findUnique({
    where:   { tokenHash },
    include: { user: { select: { id: true, emailVerified: true } } },
  });

  if (!record) {
    return { success: false, error: "This verification link is invalid or has already been used." };
  }

  if (record.expiresAt < new Date()) {
    // Clean up the expired token
    await db.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return { success: false, error: "This verification link has expired.", expired: true };
  }

  if (record.user.emailVerified) {
    // Already verified — delete token and treat as success
    await db.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    return { success: true };
  }

  // Mark verified + delete token atomically
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data:  { emailVerified: true, emailVerifiedAt: new Date() },
    }),
    db.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return { success: true };
}

// ─── resendVerification ───────────────────────────────────────────────────────

export async function resendVerification(formData: FormData): Promise<ResendResult> {
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  // Rate limit: 3 resend attempts per hour per IP
  const rl = rateLimitByIP(ip, 3, 60 * 60_000, "verify-resend");
  if (!rl.success) {
    return { success: false, error: "Too many resend attempts. Please try again later." };
  }

  const emailRaw = formData.get("email");
  if (typeof emailRaw !== "string" || !emailRaw.trim()) {
    return { success: false, error: "Please enter your email address." };
  }

  const email     = emailRaw.trim().toLowerCase();
  const emailHash = hashForLookup(email);

  const user = await db.user.findUnique({
    where:  { emailHash },
    select: { id: true, name: true, emailVerified: true,
              encryptedEmail: true, emailIV: true, emailTag: true },
  });

  // Always return success — never reveal whether the email is registered
  if (!user || user.emailVerified) {
    return { success: true };
  }

  // Delete any existing tokens for this user (enforce one active token at a time)
  await db.emailVerificationToken.deleteMany({ where: { userId: user.id } });

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  await db.emailVerificationToken.create({
    data: {
      userId:    user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
    },
  });

  try {
    await sendVerificationEmail(email, user.name, rawToken);
  } catch {
    // Best-effort
  }

  // Clear the pending cookie now that we have a fresh email
  const cookieStore = await cookies();
  cookieStore.delete(`${AUTH_COOKIE_NAME}_pending`);

  return { success: true };
}
