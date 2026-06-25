import { type NextRequest, NextResponse } from "next/server";
import {
  loginWithEmail,
  createSession,
  destroySession,
  getSession,
  makeSessionCookie,
  makeExpiredCookie,
  extractSessionToken,
  validatePasswordStrength,
  hashPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, hashForLookup } from "@/lib/encryption";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { loginSchema, signUpSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import type { InstitutionType, TeacherOrStudent, UniversityType } from "@prisma/client";

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
  const rl = rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "login");
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
    return err(result.message, 401, { reason: "invalid_credentials" });
  }

  const isAdmin = result.user.role === "ADMIN";
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
      const isAdmin = session.user.role === "ADMIN";
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
  const rl = rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "signup");
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

  const d = parsed.data;

  const pwCheck = validatePasswordStrength(d.password);
  if (!pwCheck.valid) {
    return json(
      { error: "Password does not meet requirements", reason: "weak_password", errors: pwCheck.errors },
      { status: 400 }
    );
  }

  const emailHash = hashForLookup(d.email);
  const existing  = await db.user.findUnique({ where: { emailHash }, select: { id: true } });
  if (existing) {
    return err("Registration failed. Please check your details and try again.", 409, { reason: "conflict" });
  }

  const encEmail = encrypt(d.email);
  const encPhone = encrypt(d.phone);
  const hashedPassword = await hashPassword(d.password);

  let user: Awaited<ReturnType<typeof db.user.create>>;
  try {
    user = await db.user.create({
      data: {
        name: d.name,
        encryptedEmail: encEmail.ciphertext,
        emailIV:        encEmail.iv,
        emailTag:       encEmail.tag,
        emailHash,
        encryptedPhone: encPhone.ciphertext,
        phoneIV:        encPhone.iv,
        phoneTag:       encPhone.tag,
        hashedPassword,
        role:             "USER",
        teacherOrStudent: d.teacherOrStudent as TeacherOrStudent,
        division:         d.division,
        district:         d.district,
        upazila:          d.upazila,
        specificAddress:  d.specificAddress ?? null,
        institutionType:  d.institutionType as InstitutionType,
        universityType:   (d.universityType ?? null) as UniversityType | null,
        institutionName:  d.institutionName,
        department:       d.department ?? null,
      },
    });
  } catch {
    return err("Registration failed. Please try again later.", 500);
  }

  await audit({
    action:    "SIGNUP",
    userId:    user.id,
    userName:  user.name,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    details:   "User registered",
  });

  const session = await createSession(user.id, {
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  const safeUser = {
    id:               user.id,
    name:             user.name,
    email:            d.email,
    role:             user.role,
    teacherOrStudent: user.teacherOrStudent,
    division:         user.division,
    district:         user.district,
    upazila:          user.upazila,
    specificAddress:  user.specificAddress,
    institutionType:  user.institutionType,
    universityType:   user.universityType,
    institutionName:  user.institutionName,
    department:       user.department,
    createdAt:        user.createdAt,
    updatedAt:        user.updatedAt,
  };

  const res = json({ user: safeUser, expiresAt: session.expiresAt }, { status: 201 });
  res.headers.set("Set-Cookie", makeSessionCookie(session.token, session.expiresAt));
  return res;
}

// ─── Router ───────────────────────────────────────────────────────────────────

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
