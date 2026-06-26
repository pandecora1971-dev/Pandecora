"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginWithEmail, AUTH_COOKIE_NAME } from "@/lib/auth";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export interface LoginActionState {
  error: string;
  unverified?: boolean;
}

export async function loginAction(formData: FormData): Promise<LoginActionState> {
  // ── IP extraction ──────────────────────────────────────────────────────────
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  // ── IP-based rate limit ────────────────────────────────────────────────────
  // Shares the "login" counter with the /api/auth/login route so attempts
  // across both entry points are counted together.
  const rl = await rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");
  if (!rl.success) {
    return {
      error: `Too many login attempts. Please try again in ${Math.ceil(rl.resetIn / 60_000)} minute(s).`,
    };
  }

  // ── Schema validation ──────────────────────────────────────────────────────
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    // Never reveal which field failed — generic message prevents enumeration
    return { error: "Invalid email or password." };
  }

  // ── Authenticate ───────────────────────────────────────────────────────────
  const result = await loginWithEmail({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress: ip,
    userAgent: headersList.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    if (result.reason === "unverified_email") {
      return {
        error: result.message,
        unverified: true,
      };
    }
    return { error: result.message };
  }

  // ── Set session cookie ─────────────────────────────────────────────────────
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, result.session.token, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 60, // 30-minute rolling window
    secure: process.env.NODE_ENV === "production",
  });

  // ── Redirect based on role ─────────────────────────────────────────────────
  const isStaff = result.user.role === "ADMIN" || result.user.role === "MODERATOR";
  redirect(isStaff ? "/admin" : "/report");
}
