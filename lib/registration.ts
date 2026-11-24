import "server-only";
import crypto from "crypto";
import type { z } from "zod";
import { db } from "@/lib/db";
import { encrypt, hashForLookup } from "@/lib/encryption";
import { hashPassword } from "@/lib/auth";
import { isAcademic, signUpSchema } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";
import { audit } from "@/lib/audit";

export type RegistrationData = z.infer<typeof signUpSchema>;
export type RegistrationResult =
  | { ok: true; user: { id: string; emailVerified: false }; verificationEmailSent: boolean }
  | { ok: false; reason: "conflict" | "unavailable"; message: string };

/** Both signup entry points create an unverified account, never a session. */
export async function registerAccount(
  d: RegistrationData,
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<RegistrationResult> {
  // Public sign-up is retired: reporters submit without an account and staff
  // accounts come from scripts/provision-accounts.ts. Set PUBLIC_SIGNUP_ENABLED=true
  // only if self-registration is ever needed again.
  if (process.env.PUBLIC_SIGNUP_ENABLED !== "true") {
    return { ok: false, reason: "unavailable", message: "Sign-up is disabled. You can submit a report without an account." };
  }
  try {
    const emailHash = hashForLookup(d.email);
    if (await db.user.findUnique({ where: { emailHash }, select: { id: true } })) {
      return { ok: false, reason: "conflict", message: "Registration failed. If you already have an account, sign in or request a verification email." };
    }
    const encEmail = encrypt(d.email);
    const encPhone = encrypt(d.phone);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const user = await db.user.create({
      select: { id: true },
      data: {
        name: d.name,
        encryptedEmail: encEmail.ciphertext, emailIV: encEmail.iv, emailTag: encEmail.tag,
        encryptedPhone: encPhone.ciphertext, phoneIV: encPhone.iv, phoneTag: encPhone.tag,
        emailHash, hashedPassword: await hashPassword(d.password),
        role: "USER", emailVerified: false,
        teacherOrStudent: d.teacherOrStudent,
        division: d.division, district: d.district, upazila: d.upazila,
        specificAddress: d.specificAddress ?? null,
        institutionType: d.institutionType ?? null, universityType: d.universityType ?? null,
        institutionName: isAcademic(d.teacherOrStudent) ? d.institutionName ?? null : null,
        department: d.department ?? null, licenseNumber: d.licenseNumber ?? null,
        organizationName: d.organizationName ?? null, specialization: d.specialization ?? null,
        // Nested creation is atomic: an account cannot be left without its token.
        verificationTokens: { create: {
          tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
          expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        } },
      },
    });
    await audit({ action: "SIGNUP", userId: user.id, userName: d.name, details: "New account registered", ...meta });
    let verificationEmailSent = true;
    try {
      await sendVerificationEmail(d.email, d.name, rawToken);
    } catch {
      verificationEmailSent = false;
      console.error("[signup] Verification email delivery failed; check email configuration.");
    }
    return { ok: true, user: { id: user.id, emailVerified: false }, verificationEmailSent };
  } catch {
    console.error("[signup] Account creation failed; check database configuration.");
    return { ok: false, reason: "unavailable", message: "Registration is temporarily unavailable. Please try again later." };
  }
}
