"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/lib/session";
import { registerAccount } from "@/lib/registration";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { signUpSchema } from "@/lib/validators";


export interface SignupActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
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

  const rl = await rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "signup");
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
  const result = await registerAccount(d, { ipAddress: ip, userAgent: headersList.get("user-agent") ?? undefined });
  if (!result.ok) return { error: result.message };

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
