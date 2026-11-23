"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginWithEmail } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";

export async function adminLoginAction(formData: FormData): Promise<{ error: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Invalid credentials." };

  const h = await headers();
  const ipAddress = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent") ?? null;

  const limit = await rateLimitByIP(ipAddress ?? "unknown", LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");
  if (!limit.success) return { error: "Too many login attempts. Please try again later." };

  const result = await loginWithEmail({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress: ipAddress ?? undefined,
    userAgent: userAgent ?? undefined,
    allowedRoles: ["SUPERADMIN", "ADMIN", "MODERATOR"],
  });

  if (!result.ok) return { error: result.message };
  if ((result.user.role !== "ADMIN" && result.user.role !== "SUPERADMIN") && result.user.role !== "MODERATOR") {
    return { error: "Access denied. Staff accounts only." };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, result.session.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  // Log staff login
  await db.auditLog
    .create({
      data: {
        adminId:   result.user.id,
        adminName: result.user.name,
        action:    "LOGIN",
        ipAddress,
        userAgent,
        details:   `${result.user.role} logged in`,
      },
    })
    .catch(() => undefined);

  redirect("/admin");
}
