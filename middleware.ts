export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/session";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";
import { AUTH_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/session";
import { isStaff } from "@/lib/roles";

// ─── CSP ──────────────────────────────────────────────────────────────────────

const isDev     = process.env.NODE_ENV !== "production";
const GUEST_COOKIE = "pd_guest"; // keep in sync with lib/guest.ts
const isVercel  = !!process.env.VERCEL;

function buildCSP(nonce: string): string {
  // Vercel preview toolbar injects scripts / frames from vercel.live
  const extraScript  = isVercel ? " https://vercel.live" : "";
  const extraConnect = isVercel ? " https://vercel.live wss://ws-us3.pusher.com wss://*.pusher.com" : "";
  const extraFrame   = isVercel ? " https://vercel.live" : "";

  return [
    "default-src 'self'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'${extraScript}`
      : `script-src 'self' 'nonce-${nonce}'${extraScript}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://vercel.live",
    "font-src 'self'",
    isDev
      ? `connect-src 'self' ws: wss:${extraConnect}`
      : `connect-src 'self'${extraConnect}`,
    extraFrame ? `frame-src${extraFrame}` : "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function setSecurityHeaders(res: NextResponse, nonce: string): void {
  res.headers.set("Content-Security-Policy", buildCSP(nonce));
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  res.headers.delete("X-Powered-By");
  if (!isDev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function tooManyRequests(resetIn: number, nonce: string): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
    }
  );
  setSecurityHeaders(res, nonce);
  return res;
}

// ─── Request logger ────────────────────────────────────────────────────────────
// Logs method, path, IP and timestamp — never request bodies or query strings
// that might contain sensitive tokens/passwords.

function logRequest(req: NextRequest, ip: string): void {
  // Strip query strings from logged path — may contain tokens
  const path = req.nextUrl.pathname;
  const line = JSON.stringify({
    ts:     new Date().toISOString(),
    level:  "info",
    event:  "request",
    method: req.method,
    path,
    ip,
  });
  console.log(line);
}

// ─── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = clientIp(req);

  // Per-request nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads CSP from the request to apply the nonce to its own scripts.
  requestHeaders.set("Content-Security-Policy", buildCSP(nonce));
  const finish = (res: NextResponse) => { setSecurityHeaders(res, nonce); return res; };
  let sessionExpiry: Date | undefined;
  let issueGuestCookie = false;

  // ── Request logging (skip static assets) ─────────────────────────────────────
  if (!pathname.startsWith("/_next/") && !pathname.includes(".")) {
    logRequest(req, ip);
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────

  if (pathname.startsWith("/api/auth/")) {
    const segment = pathname.slice("/api/auth/".length).split("/")[0];
    if (segment === "login") {
      const rl = await rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "mw:login");
      if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
    } else if (segment === "signup") {
      const rl = await rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "mw:signup");
      if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
    }
  }

  if (pathname === "/api/upload") {
    const rl = await rateLimitByIP(ip, LIMITS.UPLOAD.max, LIMITS.UPLOAD.windowMs, "mw:upload");
    if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
  }

  // ── Auth protection ───────────────────────────────────────────────────────────

  const isReport   = pathname.startsWith("/report");
  const isAdminPath = pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname.startsWith("/signup");

  if (isReport || isAdminPath || isAuthPage) {
    const session = await auth.api.getSession({ headers: req.headers });

    // Guests may report without an account — they get a short-lived random
    // cookie that binds their evidence uploads to the report they submit.
    if (isReport && !session && !/^[0-9a-f]{64}$/.test(req.cookies.get(GUEST_COOKIE)?.value ?? "")) {
      issueGuestCookie = true;
    }

    if (isAdminPath && pathname !== "/admin/login") {
      if (!session || !isStaff(session.user.role)) {
        return finish(NextResponse.redirect(new URL("/admin/login", req.url)));
      }
    }

    if ((isAuthPage || pathname === "/admin/login") && session) {
      return finish(NextResponse.redirect(new URL(isStaff(session.user.role) ? "/admin" : "/report", req.url)));
    }
    sessionExpiry = session?.session.expiresAt;
  }

  // ── Forward nonce ─────────────────────────────────────────────────────────────
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (sessionExpiry) {
    res.cookies.set(AUTH_COOKIE_NAME, req.cookies.get(AUTH_COOKIE_NAME)!.value, {
      httpOnly: true, secure: !isDev, sameSite: "lax", path: "/",
      expires: sessionExpiry, maxAge: SESSION_DURATION_MS / 1000,
    });
  }
  if (issueGuestCookie) {
    res.cookies.set(GUEST_COOKIE, crypto.randomBytes(32).toString("hex"), {
      httpOnly: true, secure: !isDev, sameSite: "strict", path: "/",
      maxAge: 24 * 60 * 60,
    });
  }
  setSecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|uploads/|api/upload).*)"],
};
