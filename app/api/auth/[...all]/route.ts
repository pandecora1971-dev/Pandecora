import { type NextRequest, NextResponse } from "next/server";
import {
  loginWithEmail,
  destroySession,
  getSession,
  makeExpiredCookie,
  extractSessionToken,
} from "@/lib/auth";
import { registerAccount } from "@/lib/registration";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { loginSchema, signUpSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function err(message: string, status: number, extra?: Record<string, unknown>) {
  return json({ error: message, ...extra }, { status });
}

function clientIp(req: NextRequest): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    undefined
  );
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleGetSession(req: NextRequest) {
  const data = await getSession(req.headers);
  if (!data) return err("No active session", 401);
  return json({ user: data.user, expiresAt: data.session.expiresAt });
}

async function handleLogin(req: NextRequest) {
  const ip = clientIp(req) ?? "unknown";
  const rl = await rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");
  if (!rl.success) {
    return json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be JSON", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return err("Invalid email or password.", 400, { reason: "validation_error" });
  }

  const result = await loginWithEmail({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    if (result.reason === "locked") {
      return json(
        { error: result.message, reason: "locked", retryAfterMs: result.retryAfterMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil((result.retryAfterMs ?? 0) / 1000)) } }
      );
    }
    return err(result.message, result.reason === "unavailable" ? 503 : result.reason === "forbidden" ? 403 : 401, { reason: result.reason });
  }

  const isAdmin = (result.user.role === "ADMIN" || result.user.role === "SUPERADMIN");
  await audit({
    action:    "LOGIN",
    ...(isAdmin
      ? { adminId: result.user.id, adminName: result.user.name }
      : { userId:  result.user.id, userName:  result.user.name }),
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    details:   `${isAdmin ? "Admin" : "User"} logged in`,
  });

  const res = json({ user: result.user, expiresAt: result.session.expiresAt });
  res.headers.set("Set-Cookie", result.cookieHeader);
  return res;
}

async function handleLogout(req: NextRequest) {
  const token = extractSessionToken(req.headers.get("cookie"));
  if (token) {
    const session = await getSession(req.headers);
    if (session) {
      const isAdmin = (session.user.role === "ADMIN" || session.user.role === "SUPERADMIN");
      await audit({
        action:    "LOGOUT",
        ...(isAdmin
          ? { adminId: session.user.id, adminName: session.user.name }
          : { userId:  session.user.id, userName:  session.user.name }),
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent"),
        details:   `${isAdmin ? "Admin" : "User"} logged out`,
      });
    }
    await destroySession(token);
  }

  const res = json({ ok: true });
  res.headers.set("Set-Cookie", makeExpiredCookie());
  return res;
}

async function handleSignup(req: NextRequest) {
  const ip = clientIp(req) ?? "unknown";
  const rl = await rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "signup");
  if (!rl.success) {
    return json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Request body must be JSON", 400);
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Validation failed", reason: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await registerAccount(parsed.data, {
    ipAddress: clientIp(req), userAgent: req.headers.get("user-agent") ?? undefined,
  });
  if (!result.ok) return err(result.message, result.reason === "conflict" ? 409 : 503, { reason: result.reason });
  return json({
    user: result.user, verificationRequired: true,
    verificationEmailSent: result.verificationEmailSent, nextUrl: "/verify-email/pending",
  }, { status: 201 });
}


type Context = { params: Promise<{ all: string[] }> };

export async function GET(req: NextRequest, ctx: Context) {
  const { all } = await ctx.params;
  switch (all.join("/")) {
    case "session": return handleGetSession(req);
    default:        return err("Not found", 404);
  }
}

export async function POST(req: NextRequest, ctx: Context) {
  const { all } = await ctx.params;
  switch (all.join("/")) {
    case "login":  return handleLogin(req);
    case "logout": return handleLogout(req);
    case "signup": return handleSignup(req);
    default:       return err("Not found", 404);
  }
}
