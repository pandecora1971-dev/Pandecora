export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/session";
import { rateLimitByIP, LIMITS } from "@/lib/rate-limit";

// ─── CSP ──────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";

function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    isDev
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
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

  // ── Request logging (skip static assets) ─────────────────────────────────────
  if (!pathname.startsWith("/_next/") && !pathname.includes(".")) {
    logRequest(req, ip);
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────

  if (pathname.startsWith("/api/auth/")) {
    const segment = pathname.slice("/api/auth/".length).split("/")[0];
    if (segment === "login") {
      const rl = rateLimitByIP(ip, LIMITS.LOGIN.max, LIMITS.LOGIN.windowMs, "mw:login");
      if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
    } else if (segment === "signup") {
      const rl = rateLimitByIP(ip, LIMITS.SIGNUP.max, LIMITS.SIGNUP.windowMs, "mw:signup");
      if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
    }
  }

  if (pathname === "/api/upload") {
    const rl = rateLimitByIP(ip, LIMITS.UPLOAD.max, LIMITS.UPLOAD.windowMs, "mw:upload");
    if (!rl.success) return tooManyRequests(rl.resetIn, nonce);
  }

  // ── Auth protection ───────────────────────────────────────────────────────────

  const isReport   = pathname.startsWith("/report");
  const isAdminPath = pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname.startsWith("/signup");

  if (isReport || isAdminPath || isAuthPage) {
    const session = await auth.api.getSession({ headers: req.headers });

    if (isReport && !session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isAdminPath && pathname !== "/admin/login") {
      const isStaff =
        session?.user.role === "ADMIN" || session?.user.role === "MODERATOR";
      if (!isStaff) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    if (isAuthPage && session) {
      return NextResponse.redirect(new URL("/report", req.url));
    }
  }

  // ── Forward nonce ─────────────────────────────────────────────────────────────
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  setSecurityHeaders(res, nonce);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|uploads/|api/upload).*)"],
};
