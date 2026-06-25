"use server";

import crypto from "crypto";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { encrypt, hashForLookup } from "@/lib/encryption";
import { AUTH_COOKIE_NAME, hashPassword } from "@/lib/auth";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { signUpSchema, isAcademic } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import type { InstitutionType, TeacherOrStudent, UniversityType } from "@prisma/client";

const TOKEN_BYTES        = 32;               // 256-bit raw token
const TOKEN_EXPIRY_MS    = 24 * 60 * 60_000; // 24 hours

export interface SignupActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function signupAction(
  step1Data: unknown,
  formData: FormData
): Promise<SignupActionState> {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const rl = rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "signup");
  if (!rl.success) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  // ── Combine step 1 + step 2 + step 3 (if professional) ───────────────────
  const raw = {
    ...(typeof step1Data === "object" && step1Data !== null ? step1Data : {}),
    division:         formData.get("division"),
    district:         formData.get("district"),
    upazila:          formData.get("upazila"),
    specificAddress:  formData.get("specificAddress") || undefined,
    institutionType:  formData.get("institutionType")  || undefined,
    universityType:   formData.get("universityType")   || undefined,
    institutionName:  formData.get("institutionName")  || undefined,
    department:       formData.get("department")       || undefined,
    licenseNumber:    formData.get("licenseNumber")    || undefined,
    organizationName: formData.get("organizationName") || undefined,
    specialization:   formData.get("specialization")   || undefined,
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const d = parsed.data;

  // ── Email uniqueness ───────────────────────────────────────────────────────
  const emailHash = hashForLookup(d.email);
  const existing  = await db.user.findUnique({ where: { emailHash }, select: { id: true } });
  if (existing) {
    return { error: "This email is already registered. Please log in instead." };
  }

  // ── Encrypt PII + hash password ────────────────────────────────────────────
  const encEmail     = encrypt(d.email);
  const encPhone     = encrypt(d.phone);
  const hashedPassword = await hashPassword(d.password);

  // ── Create user ────────────────────────────────────────────────────────────
  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        name:            d.name,
        encryptedEmail:  encEmail.ciphertext,
        emailIV:         encEmail.iv,
        emailTag:        encEmail.tag,
        emailHash,
        encryptedPhone:  encPhone.ciphertext,
        phoneIV:         encPhone.iv,
        phoneTag:        encPhone.tag,
        hashedPassword,
        role:            "USER",
        teacherOrStudent: d.teacherOrStudent as TeacherOrStudent,
        division:         d.division,
        district:         d.district,
        upazila:          d.upazila,
        specificAddress:  d.specificAddress  ?? null,
        // Academic fields
        institutionType:  (d.institutionType ?? null) as InstitutionType | null,
        universityType:   (d.universityType  ?? null) as UniversityType  | null,
        institutionName:  isAcademic(d.teacherOrStudent) ? (d.institutionName ?? null) : null,
        department:       d.department ?? null,
        // Professional fields
        licenseNumber:    d.licenseNumber    ?? null,
        organizationName: d.organizationName ?? null,
        specialization:   d.specialization   ?? null,
        // emailVerified defaults to false in the schema
      },
    });
    userId = user.id;
  } catch {
    return { error: "Registration failed. Please try again later." };
  }

  await audit({
    action:    "SIGNUP",
    userId,
    userName:  d.name,
    details:   `New account registered`,
    ipAddress: ip,
    userAgent: headersList.get("user-agent") ?? undefined,
  });

  // ── Generate + store verification token ────────────────────────────────────
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);

  try {
    await db.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
    });
  } catch {
    // Token creation failed — user can request resend from pending page
  }

  // ── Send verification email (best-effort) ───────────────────────────────────
  try {
    await sendVerificationEmail(d.email, d.name, rawToken);
  } catch {
    // Email sending failed — user can request resend from pending page
  }

  // ── Store a short-lived cookie so the pending page can prefill the email ──
  const cookieStore = await cookies();
  cookieStore.set(`${AUTH_COOKIE_NAME}_pending`, d.email, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
    secure: process.env.NODE_ENV === "production",
  });

  // ── Do NOT create a session — redirect to pending verification page ─────────
  redirect("/verify-email/pending");
}
