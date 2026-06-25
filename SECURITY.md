# Secure Incident Platform — Full Build & Security Reference

> Internal documentation. Covers everything built, every architectural decision made, and every security control in place.

---

## Table of Contents

1. [What We Built](#1-what-we-built)
2. [Tech Stack](#2-tech-stack)
3. [Application Architecture](#3-application-architecture)
4. [Database Schema Design](#4-database-schema-design)
5. [Role System](#5-role-system)
6. [Security Layers — Deep Dive](#6-security-layers--deep-dive)
   - 6.1 [PII Encryption at Rest](#61-pii-encryption-at-rest)
   - 6.2 [Email Hashing for Lookups](#62-email-hashing-for-lookups)
   - 6.3 [Password Hashing (argon2id)](#63-password-hashing-argon2id)
   - 6.4 [Session Management](#64-session-management)
   - 6.5 [Brute-Force & Account Lockout](#65-brute-force--account-lockout)
   - 6.6 [Timing Attack Prevention](#66-timing-attack-prevention)
   - 6.7 [Email Verification](#67-email-verification)
   - 6.8 [Rate Limiting](#68-rate-limiting)
   - 6.9 [HTTP Security Headers](#69-http-security-headers)
   - 6.10 [Content Security Policy with Per-Request Nonce](#610-content-security-policy-with-per-request-nonce)
   - 6.11 [Role-Based Access Control (RBAC)](#611-role-based-access-control-rbac)
   - 6.12 [Double-Gate Authorization Pattern](#612-double-gate-authorization-pattern)
   - 6.13 [File Upload Security](#613-file-upload-security)
   - 6.14 [Input Validation (Zod)](#614-input-validation-zod)
   - 6.15 [Honeypot Fields](#615-honeypot-fields)
   - 6.16 [Audit Logging](#616-audit-logging)
   - 6.17 [Structured Server-Side Logging](#617-structured-server-side-logging)
   - 6.18 [Error Boundaries & Safe Error Exposure](#618-error-boundaries--safe-error-exposure)
   - 6.19 [Database Safety (Prisma ORM)](#619-database-safety-prisma-orm)
   - 6.20 [Encryption Self-Test on Startup](#620-encryption-self-test-on-startup)
7. [Test Accounts](#7-test-accounts)
8. [Environment Variables Required](#8-environment-variables-required)

---

## 1. What We Built

A **secure, anonymous incident reporting platform** for educational institutions in Bangladesh. Users (teachers and students) can submit reports of harassment, blackmail, corruption, discrimination, academic malpractice, theft, and other policy violations — entirely anonymously from the perspective of anyone without administrative access.

### Features built end-to-end

**Public / User-facing**
- Multi-step signup (personal info → location + institution) with live validation
- Email verification (token-based, SHA-256 hashed, time-limited)
- Login with brute-force protection and account lockout
- Incident report submission with category, urgency level, free-text description, evidence file uploads, URLs, and accused party details
- Draft saving (reports persist until explicitly submitted)
- File upload: images, PDFs, text files (up to 20 MB), and video evidence (up to 2 GB)
- User dashboard showing all submitted reports and their status
- Contact form for general inquiries

**Admin / Staff Panel** (`/admin`)
- Dashboard with live submission and user statistics
- User list with search and filtering
- Submission detail view with status management
- Contact message inbox
- Audit log (full trail of all staff actions)
- Team management (promote/revoke Moderator role)
- Role-aware sidebar navigation (Moderators see a subset of Admin items)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, React 19) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL via Prisma ORM |
| Password hashing | argon2id (native Node.js module) |
| Encryption | Node.js `crypto` — authenticated symmetric encryption |
| Session | Custom implementation (no third-party auth library) |
| File upload | Busboy (streaming multipart parser) |
| Validation | Zod |
| Styling | Tailwind CSS |
| Email | Resend (transactional) |
| Deployment | Docker / standalone Next.js output |

---

## 3. Application Architecture

```
app/
├── (auth)/          — login, signup, email verification pages
├── (user)/          — /report dashboard (authenticated users)
├── (admin)/admin/   — staff panel (ADMIN + MODERATOR)
│   ├── login/       — separate admin login
│   ├── dashboard/
│   ├── users/
│   ├── submissions/ — per-submission detail + status
│   ├── messages/    — contact inbox
│   ├── audit/       — audit log (ADMIN only)
│   ├── team/        — promote/revoke Moderators (ADMIN only)
│   └── settings/
├── api/
│   ├── auth/        — login, signup, logout, verify-email API routes
│   ├── upload/      — file upload endpoint
│   └── health/      — health check
lib/
├── auth.ts          — full auth (argon2id, session creation, login)
├── session.ts       — lightweight session reader (no argon2, safe in middleware)
├── encryption.ts    — all encryption/decryption, key management
├── rate-limit.ts    — fixed-window in-memory rate limiter
├── roles.ts         — permission helpers (isStaff, canDelete, etc.)
├── logger.ts        — structured JSON server-side logger
├── validators.ts    — Zod schemas for all forms and API inputs
├── audit.ts         — audit log writer
└── db.ts            — Prisma client singleton
middleware.ts        — security headers, rate limiting, auth routing (Edge-adjacent)
```

### Key architectural decision: `lib/auth.ts` vs `lib/session.ts`

`lib/auth.ts` imports `argon2` which is a native Node.js addon. The Next.js middleware runs in an Edge-like environment where native addons are unavailable. To avoid this conflict:

- `lib/session.ts` — reads and validates sessions from the cookie. No argon2 dependency. Used by middleware and all server components.
- `lib/auth.ts` — handles login (argon2id verification), signup (argon2id hashing), and session creation. Used only in API routes and server actions inside the full Node.js runtime.

---

## 4. Database Schema Design

Every sensitive or personally identifiable field is **encrypted before it reaches the database**. Non-sensitive metadata (enums, timestamps, counts) is stored as plaintext for query efficiency.

### User model — PII handling

```
encryptedEmail  — ciphertext (base64)
emailIV         — fresh random IV per encryption
emailTag        — GCM authentication tag
emailHash       — HMAC-SHA256 keyed hash — the ONLY thing used for lookups
```

The email address itself is **never stored in plaintext** and **never queried directly**. All `findUnique` calls use `emailHash`.

Phone number, submission descriptions, accused names, accused details, file names, and evidence URLs follow the same pattern: ciphertext + IV + auth tag stored as three separate columns.

### Submission model

```
encryptedDescription / descriptionIV / descriptionTag
encryptedAccusedName / accusedNameIV / accusedNameTag
encryptedAccusedDetails / accusedDetailsIV / accusedDetailsTag
```

Category and urgency level are stored as Prisma enums (plaintext) — they are not PII and need to be filterable.

### Session model

Stores the raw session token in the database. The token is a 256-bit random value. On logout the row is deleted server-side, making the token permanently invalid.

---

## 5. Role System

Three roles defined in the Prisma schema:

| Role | Access |
|---|---|
| `USER` | Can submit reports, view own submissions, download own files |
| `MODERATOR` | Everything USER can do, plus: staff panel, view all submissions, change status |
| `ADMIN` | Everything MODERATOR can do, plus: delete records, view audit log, manage team, settings |

Permission helpers in `lib/roles.ts`:

```ts
isAdmin(role)       // → true only for ADMIN
isStaff(role)       // → true for ADMIN or MODERATOR
canDelete(role)     // → true only for ADMIN
canViewAudit(role)  // → true only for ADMIN
canManageTeam(role) // → true only for ADMIN
```

These helpers are called server-side in both middleware and server actions — never in client components.

---

## 6. Security Layers — Deep Dive

### 6.1 PII Encryption at Rest

**File:** `lib/encryption.ts`

All personally identifiable information is encrypted with a 256-bit authenticated symmetric cipher before being written to the database or disk.

**How it works:**
- A 256-bit key is loaded from the `ENCRYPTION_KEY` environment variable at startup.
- For every encryption call, a fresh **random 128-bit IV** (initialization vector) is generated with `crypto.randomBytes(16)`. IVs are **never reused**.
- The encryption produces three outputs: `ciphertext`, `iv`, and an `authTag`.
- All three are stored in separate database columns.
- On decryption, the auth tag is verified first. If the tag doesn't match (wrong key, tampered data), decryption fails immediately with no partial output.

**What is encrypted:**
- User email addresses
- User phone numbers
- Submission descriptions
- Accused person names and details
- Evidence URLs (stored as links)
- Uploaded file names
- Uploaded file content (streamed through a cipher during the upload itself)

**What is NOT encrypted (intentional):**
- Submission category (enum — needed for filtering)
- Urgency level (enum — needed for sorting/dashboards)
- Timestamps (needed for ordering)
- User name (displayed in admin panel — not considered sensitive PII for this use case)

**File encryption:**
Evidence files are encrypted **at stream time** during upload using a streaming cipher. The file is never written to disk in plaintext — ciphertext goes directly to the output file as chunks arrive. On decryption, the GCM auth tag is verified after the stream ends, and the output is only renamed to its final path after successful verification (preventing partial plaintext from being exposed on failure).

---

### 6.2 Email Hashing for Lookups

**File:** `lib/encryption.ts` → `hashForLookup()`

Because email addresses are stored encrypted, a plain `WHERE email = ?` query is impossible — the database only holds ciphertext. The solution is a **keyed HMAC-SHA256 hash** stored in a separate `emailHash` column.

**Why HMAC instead of plain SHA-256:**
- Plain `SHA-256(email)` would be vulnerable to offline rainbow-table attacks — an attacker with the DB dump could precompute hashes for all known email addresses.
- `HMAC-SHA256(email, pepper)` requires knowledge of the `HASH_PEPPER` secret. Without it, the hash column is useless to an attacker.
- HMAC also prevents length-extension attacks that are possible with plain SHA-256.

**Normalisation:**
Input is trimmed and lowercased before hashing so `User@Email.com`, `user@email.com`, and ` user@email.com ` all produce the same hash — preventing duplicate accounts from casing differences.

```ts
export function hashForLookup(value: string): string {
  return crypto
    .createHmac("sha256", pepper)
    .update(value.trim().toLowerCase())
    .digest("hex");
}
```

---

### 6.3 Password Hashing (argon2id)

**File:** `lib/auth.ts`

Passwords are hashed with **argon2id** — the winner of the Password Hashing Competition and the algorithm recommended by OWASP for new applications.

**Parameters used:**

```ts
{
  type:        argon2.argon2id,
  memoryCost:  65536,   // 64 MiB — OWASP minimum
  timeCost:    3,       // 3 iterations
  parallelism: 4,
}
```

These parameters make offline brute-force attacks extremely expensive. Each hash attempt requires 64 MiB of memory and multiple CPU iterations.

**The raw password is never stored, logged, or transmitted** after the hashing step. The `USER_SELECT` Prisma select used everywhere explicitly excludes `hashedPassword`.

---

### 6.4 Session Management

**File:** `lib/auth.ts`

- Session tokens are `crypto.randomBytes(32)` — 256 bits of cryptographic randomness, encoded as 64-character hex strings.
- Sessions are stored in the `Session` table with: `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`.
- **Rolling sessions:** every validated request extends `expiresAt` by 30 minutes. Active users are never logged out mid-session; idle sessions expire.
- **Server-side logout:** on logout, the session row is deleted from the database with `db.session.deleteMany({ where: { token } })`. Even if the cookie persists on the client, the token is permanently invalid.
- **Expired session cleanup:** when a token is found but expired, the row is deleted before returning null.
- **Cookie flags:**
  - `HttpOnly` — inaccessible to JavaScript (XSS cannot steal it)
  - `Secure` — only sent over HTTPS in production
  - `SameSite=Lax` — blocks cross-site request forgery in most cases

---

### 6.5 Brute-Force & Account Lockout

**File:** `lib/auth.ts`

After **5 consecutive failed login attempts** for the same email hash, the account is locked for **15 minutes**. The lockout response message is generic ("Too many failed attempts. Please try again later.") — it does not confirm whether the email is registered.

The failure count is tracked by `emailHash` (not plaintext email), so the attacker learns nothing from the lockout mechanism about what emails exist.

Successful login clears the failure counter immediately.

> **Note:** The current implementation is in-memory (a `Map`). This resets on process restart and does not work across multiple server instances. For horizontal scaling, replace with Redis (e.g. Upstash).

---

### 6.6 Timing Attack Prevention

**File:** `lib/auth.ts`

When an email address is not found in the database, the server still runs a full argon2id verification against a pre-computed dummy hash. This makes the response time indistinguishable from a "wrong password" failure on a real account.

Without this, an attacker could enumerate which emails are registered by measuring response time — a registered email takes ~200ms (argon2 verify), while an unregistered one would return in <1ms (just a DB miss).

```ts
// Pre-computed at module load, awaited lazily
const _dummyHashReady: Promise<string> = argon2.hash(
  "sip-dummy:" + crypto.randomBytes(16).toString("hex"),
  ARGON2_OPTS
);

// In loginWithEmail(), when email is not found:
const dummyHash = await _dummyHashReady;
await argon2.verify(dummyHash, password).catch(() => undefined);
// then return generic "Invalid email or password" — same as wrong password
```

The error message is always identical: **"Invalid email or password."** — never "email not found" or "wrong password". This is the standard defense against **email enumeration attacks**.

---

### 6.7 Email Verification

**File:** `prisma/schema.prisma` (model `EmailVerificationToken`), `lib/email.ts`

New accounts start with `emailVerified: false`. Login is rejected for unverified accounts with a clear message directing the user to their inbox.

**Token design:**
- A `crypto.randomBytes(32)` token is generated and sent in the verification link.
- Only the **SHA-256 hash** of the token (`tokenHash`) is stored in the database.
- The raw token is never stored anywhere — only transmitted once via email.
- Tokens expire (configurable TTL).
- On verification, the raw token from the URL is hashed and looked up. If found and not expired, `emailVerified` is set to `true` and `emailVerifiedAt` is stamped. The token row is deleted immediately after use (single-use tokens).

---

### 6.8 Rate Limiting

**Files:** `lib/rate-limit.ts`, `middleware.ts`, `app/api/upload/route.ts`

A fixed-window in-memory rate limiter with separate buckets per endpoint and per identity.

**Limits enforced:**

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `/api/auth/login` | 5 requests | 15 minutes | IP address |
| `/api/auth/signup` | 10 requests | 1 hour | IP address |
| `/api/upload` (IP gate) | 60 requests | 1 hour | IP address |
| `/api/upload` (user gate) | 20 requests | 1 hour | User ID |
| Incident report form | 20 submissions | 1 hour | User ID |

The upload endpoint has **two independent rate limiters** — IP-level (pre-auth, lightweight) and user-level (post-auth, stricter). This prevents both unauthenticated flooding and abuse by authenticated users.

Rate-limited responses return HTTP 429 with a `Retry-After` header containing the exact seconds until the window resets.

---

### 6.9 HTTP Security Headers

**File:** `middleware.ts` → `setSecurityHeaders()`

Every response (except static assets) receives the following security headers:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Blocks clickjacking — no iframes allowed at all |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer data sent to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Disables browser APIs the app does not use |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates the browsing context from cross-origin windows |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Enables cross-origin isolation (required for SharedArrayBuffer) |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin resource loading |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years, including subdomains, eligible for HSTS preload list |
| `X-Powered-By` | (deleted) | Hides the technology fingerprint |

Additionally, `next.config.ts` is set with `poweredByHeader: false` to suppress the Next.js header before middleware even runs.

---

### 6.10 Content Security Policy with Per-Request Nonce

**File:** `middleware.ts` → `buildCSP()`

A **Content Security Policy** is applied to every page with a **cryptographically random nonce** generated per request. This is the most effective defense against XSS — even if an attacker injects a `<script>` tag, it will not execute without a valid nonce.

```
default-src 'self'
script-src  'self' 'nonce-{random}' [+ 'unsafe-eval' in dev]
style-src   'self' 'unsafe-inline'
img-src     'self' blob: data:
font-src    'self'
connect-src 'self' [+ ws: wss: in dev for HMR]
frame-src   'none'
frame-ancestors 'none'
form-action 'self'
base-uri    'self'
upgrade-insecure-requests
```

**Notable directives:**
- `frame-src 'none'` + `frame-ancestors 'none'` — no iframes in or out (double-enforced with `X-Frame-Options: DENY`)
- `form-action 'self'` — forms can only submit to the same origin, blocking cross-site form hijacking
- `base-uri 'self'` — prevents attackers from changing the base URL for relative links
- `upgrade-insecure-requests` — the browser upgrades HTTP sub-resources to HTTPS automatically

The nonce is generated in middleware, placed in the `x-nonce` request header, read by server components, and injected into `<script>` tags. This means every inline script tag has a unique, unguessable nonce that an attacker cannot know in advance.

---

### 6.11 Role-Based Access Control (RBAC)

**Files:** `lib/roles.ts`, all admin `page.tsx` files, all admin `actions.ts` files

Authorization is enforced in three places:

**1. Middleware (first gate):**
```ts
const isStaff =
  session?.user.role === "ADMIN" || session?.user.role === "MODERATOR";
if (!isStaff) {
  return NextResponse.redirect(new URL("/admin/login", req.url));
}
```
Blocks all non-staff at the routing level before any page renders.

**2. Page server components (second gate):**
```ts
// Admin-only page:
if (!session || session.user.role !== "ADMIN") redirect("/admin");

// Staff page:
if (!session || !isStaff(session.user.role)) redirect("/admin/login");
```
Even if middleware is bypassed, the page itself re-checks.

**3. Server actions (third gate — most critical):**
```ts
// getStaffSession — MODERATOR or ADMIN required
async function getStaffSession() {
  const session = await validateFromHeaders();
  if (!session || !isStaff(session.user.role))
    throw new Error("Unauthorized");
  return session;
}

// getAdminSession — ADMIN only
async function getAdminSession() {
  const session = await validateFromHeaders();
  if (!session || session.user.role !== "ADMIN")
    throw new Error("Unauthorized");
  return session;
}
```

This means a Moderator **cannot** call delete or audit actions even by constructing a direct POST request to the server action — the action itself verifies the role before doing anything.

**UI hiding is cosmetic only.** A Moderator's sidebar does not show the Audit Log or Team pages, but even if they navigate to `/admin/audit` directly, the page-level check redirects them away. Even if they somehow get the page, the server action rejects the call.

---

### 6.12 Double-Gate Authorization Pattern

Every admin route is protected by **two independent authorization checks**:

```
Browser request
    │
    ▼
middleware.ts       ← Gate 1: isStaff check, redirect if not
    │
    ▼
page.tsx            ← Gate 2: role check, redirect or 403
    │
    ▼
server action       ← Gate 3: role check inside the mutation itself
    │
    ▼
Database query      ← Parameterized via Prisma (no raw SQL)
```

An attacker who bypasses the middleware (e.g. misconfigured proxy) still hits the page check. An attacker who bypasses both UI gates by calling the server action directly still gets rejected at the action level.

---

### 6.13 File Upload Security

**File:** `app/api/upload/route.ts`

The upload endpoint is the most complex attack surface in the application. The following controls are layered:

**1. Authentication required**
All uploads require a valid session. Unauthenticated requests receive 401 immediately.

**2. Dual rate limiting**
60 req/hour by IP (pre-auth) and 20 req/hour by user ID (post-auth).

**3. Storage quota**
Each user has a 5 GB quota. The used bytes are computed before processing begins. If adding the incoming files would exceed the quota, the upload is rejected.

**4. MIME type allowlist**
Only 11 types accepted:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Documents: `application/pdf`, `text/plain`
- Videos: `video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/webm`, `video/mpeg`

**5. File extension blocklist**
Scans all dot-separated segments of the filename (catches `evil.php.jpg`):
Blocked: `.exe`, `.bat`, `.sh`, `.php`, `.js`, `.ts`, `.py`, `.rb`, `.asp`, `.jsp`, `.dll`, `.ps1`, `.vbs`, `.jar`, `.sql`, `.env`, `.htaccess`, and 30+ more.

**6. Magic byte validation**
The first 12 bytes of every file are read and compared against known file signatures before any data is written to disk:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- PDF: `25 50 44 46` (`%PDF`)
- WebP: `RIFF....WEBP`
- MP4: `ftyp` at offset 4
- WebM: `1A 45 DF A3`
- etc.

A file renamed `malware.pdf` that is actually an executable will fail the magic byte check because its header bytes do not match `%PDF`.

**7. Size limits**
- Regular files (images, documents): 20 MB
- Video files: 2 GB
- Enforced per-file and also against remaining quota in-flight

**8. At-rest encryption — streamed**
Files are encrypted as they stream in. The cipher is a streaming transform piped between Busboy's stream and the disk write stream. The plaintext never touches disk. The IV and auth tag are stored in the database record.

**9. File permissions**
After writing, `chmod 600` restricts the file to owner read/write only.

**10. Filename sanitisation**
Path separators (`/`, `\`), path traversal sequences (`..`), control characters (null byte, `\x00-\x1f`), and Windows-reserved characters are stripped or replaced. The result is capped at 200 characters. The sanitised name is then encrypted before storage.

**11. Abort handling**
If the client disconnects during upload, partially-written encrypted files are deleted immediately.

**12. Upload timeout**
Each file upload has a 10-minute deadline. Stalled connections are terminated and the partial file is deleted.

---

### 6.14 Input Validation (Zod)

**File:** `lib/validators.ts`

Every form submission is validated with a Zod schema on the server side. Client-side validation is for UX only — server validation is the authoritative gate.

**Security-specific checks applied to every string field:**
- Null byte rejection (`\0`)
- Script tag rejection (`<script...>`)
- SQL keyword rejection (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `EXEC`)
- Path traversal rejection (`../`)
- HTML angle bracket stripping (`<`, `>` → removed)

**Email field:**
- All security checks above
- Trimmed and lowercased before validation and storage
- Must pass RFC-5321 format check

**Password field:**
- Minimum 8, maximum 128 characters (max prevents DoS via argon2 on huge inputs)
- Must contain: uppercase, lowercase, digit, special character
- Security checks applied but **no transform** — the raw password sent to argon2 must be byte-identical between signup and login

**Bangladesh phone:**
- Strips non-digits first, then validates `01[3-9]XXXXXXXX` format

**URLs:**
- Max 2000 chars
- Auto-prepends `https://` if no protocol
- Parsed with `new URL()` to verify format
- Max 10 per field

**Geography validation:**
- Division must be one of the 8 Bangladesh divisions (enum)
- District must belong to the selected division (cross-field validation)

---

### 6.15 Honeypot Fields

All auth forms (signup, login) include a hidden input field with a name that looks attractive to bots (`website`, `url`, etc.) but is never filled in by real users. If this field contains any value when the form is submitted, the request is silently rejected.

The honeypot field is hidden via CSS (`display: none` / `visibility: hidden`), never via the `hidden` HTML attribute (bots ignore CSS, not `hidden`).

---

### 6.16 Audit Logging

**File:** `lib/audit.ts`, `prisma/schema.prisma` (model `AuditLog`)

Every significant admin action is recorded in the `AuditLog` table:

| Action | Trigger |
|---|---|
| `LOGIN` | Admin/Moderator logs into staff panel |
| `LOGOUT` | Admin/Moderator logs out of staff panel |
| `VIEW` | Admin views a submission or user detail |
| `DOWNLOAD` | Admin downloads an evidence file |
| `STATUS_CHANGE` | Submission status updated |
| `DELETE` | Any record deleted (user, submission, message) |
| `SIGNUP` | New user account created |
| `SUBMIT_REPORT` | Incident report submitted |
| `SAVE_DRAFT` | Report saved as draft |

Each log entry records: `adminId`, `adminName`, `userId`, `userName`, `action`, `targetId`, `targetType`, `ipAddress`, `userAgent`, `details`, `createdAt`.

The audit log is **immutable** — entries can only be inserted, never updated or deleted. Only ADMIN-role users can view the audit log page.

---

### 6.17 Structured Server-Side Logging

**File:** `lib/logger.ts`

All server-side events are logged as **JSON lines to stdout/stderr**. This format is directly ingestible by log aggregators (Datadog, Loki, CloudWatch, etc.).

```json
{"ts":"2026-05-17T03:57:59.862Z","level":"info","event":"request","method":"GET","path":"/report","ip":"::1"}
```

**What is logged:**
- Inbound requests: method, path (no query strings), IP
- Upload events: file received, stored, rejected, aborted
- Rate limit hits
- Auth events (via audit log)
- Unhandled server errors (full stack trace, server-side only)

**What is never logged:**
- Query strings (may contain tokens or passwords)
- Request/response bodies (contain PII)
- Session tokens
- Passwords (at any point in the flow)
- Encryption keys or IVs

The `logServerError()` function logs the full error and stack server-side, then returns a generic string safe to send to the client. Internal error details are never surfaced to the browser.

---

### 6.18 Error Boundaries & Safe Error Exposure

**Files:** `app/error.tsx`, `app/global-error.tsx`

Two React error boundaries catch rendering failures:

- `app/error.tsx` — catches errors in the route segment and below (has access to the app layout)
- `app/global-error.tsx` — catches errors including the root layout (must include its own `<html>/<body>`)

**What users see:**
- "Something went wrong" + a generic description
- The `error.digest` (a Next.js-generated hash — correlates to server log entries but reveals no internal details)
- A "Try again" button

**What users never see:**
- Stack traces
- Database error messages
- Internal file paths
- Encryption-related messages

In development, `error.digest` and `error.message` are logged to the browser console to aid debugging. In production, only the digest is shown (and only to admin correlation purposes).

---

### 6.19 Database Safety (Prisma ORM)

**File:** `lib/db.ts`

All database queries go through Prisma's typed API. Prisma **always uses parameterized queries** internally — there is no mechanism to accidentally write raw SQL concatenation. This eliminates SQL injection by construction.

No raw SQL (`$queryRawUnsafe`, `$executeRawUnsafe`) is used anywhere in the codebase.

Prisma logs are configured per environment:
- Development: `["query", "error", "warn"]`
- Production: `["error"]` only

---

### 6.20 Encryption Self-Test on Startup

**File:** `lib/encryption.ts`

When the `ENCRYPTION_KEY` environment variable is present, the encryption module runs a self-test on import (before any request is handled):

1. Encrypts a known probe string
2. Verifies that two encrypt calls produce **different IVs** (IV uniqueness sanity check — catches broken RNG)
3. Decrypts the result and verifies it matches the original
4. Tampers with the auth tag and verifies the tamper is **rejected**

If any of these checks fail, the module throws immediately and the process does not start. This is a fail-fast mechanism — a misconfigured key or broken crypto implementation will never silently corrupt data.

---

## 7. Test Accounts

Three pre-verified accounts exist for development (created by `scripts/seed-users.ts`). All have `emailVerified: true` set directly in the database — email verification is not bypassed in code, these accounts simply were "already verified" at seed time.

| Role | Email | Password |
|---|---|---|
| USER | `user@test.bd` | `Test@1234` |
| MODERATOR | `moderator@test.bd` | `Test@1234` |
| ADMIN | `admin@test.bd` | (set via `lib/seed.ts` at first run) |

Run seeds with:
```bash
npm run seed          # creates/verifies the main admin account
npx tsx scripts/seed-users.ts  # creates the test user + moderator + 15 sample users
```

---

## 8. Environment Variables Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ENCRYPTION_KEY` | 64-character hex string (32 bytes) — generate with `openssl rand -hex 32` |
| `HASH_PEPPER` | 64-character hex string — generate with `openssl rand -hex 32` |
| `RESEND_API_KEY` | Resend API key for transactional email (verification, etc.) |
| `NEXT_PUBLIC_APP_URL` | Public base URL (`https://yourdomain.com`) |
| `ADMIN_EMAIL` | Email address for the initial admin account |
| `ADMIN_PASSWORD` | Password for the initial admin account |
| `ADMIN_NAME` | Display name for the initial admin account |
| `NODE_ENV` | `development` or `production` |

> Never commit `.env` or `.env.local` to version control. Rotate `ENCRYPTION_KEY` and `HASH_PEPPER` requires re-encrypting all data in the database — treat them as permanent secrets.
