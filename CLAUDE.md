# Secure Incident Platform — Claude Code Context

## What this project is
A cybersecurity incident reporting platform for educational institutions in Bangladesh. Users (teachers/students) submit encrypted incident reports. Admins manage submissions, users, and audit logs via a separate panel.

## Tech stack
- **Next.js 15.5** App Router, TypeScript, Tailwind CSS
- **Prisma** ORM + **PostgreSQL**
- **Custom auth** — no Better Auth adapter (emails are AES-256-GCM encrypted; only HMAC-SHA256 hash is queryable)
- **argon2id** for password hashing
- **AES-256-GCM** for all PII at rest (email, phone, incident descriptions, accused details)

## Brand / design system
- Primary red: `#e60000` — buttons, badges, active nav, accents
- Dark ink: `#25282b` — headings, sidebar, dark panels
- Body: `#7e7e7e`, Canvas: white
- Hover red: `#cc0000`
- Auth pages: split-screen (dark left brand panel + white right form)
- Cards: `rounded-2xl border border-gray-200 bg-white`
- Inputs: `border-gray-200 bg-gray-50 focus:border-[#e60000] focus:ring-[#e60000]/15`

## Critical rules — always follow these

### 1. lib/session.ts vs lib/auth.ts
- **`lib/session.ts`** — thin module, NO argon2. Use in: middleware, layouts, Server Components
- **`lib/auth.ts`** — has argon2id, `import "server-only"`. Use ONLY in: route handlers and server actions
- Never import `lib/auth.ts` in middleware — it breaks the build

### 2. Server action files
- `"use server"` files can only export **async functions** — never export constants, types, or objects from the same file

### 3. Logout
- Always use `window.location.href = "/"` for logout redirects (not `router.push` + `router.refresh`)
- Reason: App Router RSC cache doesn't clear reliably with client-side nav after cookie deletion

### 4. Radio buttons
- Always use controlled state (`useState` + `checked` + `onChange`) — never CSS `has-[:checked]` alone
- Reason: CSS approach appeared broken to users ("button does nothing")

### 5. webpack / next.config.ts
- `serverExternalPackages: ["argon2", "@prisma/client"]` is set
- `webpack alias: { argon2: false }` on client side prevents node:crypto errors

## Route structure
```
app/
  (public)/          — home page (/)
  (auth)/
    login/           — /login
    signup/          — /signup (step 1: personal info)
    signup/location/ — /signup/location (step 2: institution + location)
  (protected)/
    report/          — /report (auth-gated, incident submission form)
  (admin)/
    admin/           — /admin (dashboard, sidebar layout)
    admin/users/     — user management table + delete modal
    admin/users/[id] — user detail page (all info + submissions)
    admin/audit/     — audit log table
    admin/settings/  — system info
    admin/login/     — admin login page
```

## Key files
| File | Purpose |
|------|---------|
| `lib/session.ts` | Session validation, no argon2 — safe everywhere |
| `lib/auth.ts` | Full auth with argon2id — server only |
| `lib/encryption.ts` | AES-256-GCM encrypt/decrypt |
| `lib/validators.ts` | Zod schemas (signupStep1Schema, signupStep2Schema, loginSchema) |
| `lib/db.ts` | Prisma client singleton |
| `middleware.ts` | CSP nonce, rate limiting, auth redirects |
| `app/(admin)/admin/actions.ts` | All admin server actions (getStats, getSubmissions, getUsers, deleteUser, getUserDetail, getAuditLogs) |
| `app/api/auth/[...all]/route.ts` | Auth API: login, logout, signup, session |
| `app/(auth)/signup/_context.tsx` | SignupProvider — shares step 1 data to step 2 |

## Database — important schema notes
- `User.emailHash` — HMAC-SHA256, used for unique constraint and lookups (never query plaintext)
- `User.encryptedEmail/emailIV/emailTag` — AES-256-GCM, decrypt for display only
- All submission descriptions and accused details are encrypted the same way
- `AuditLog` records admin actions: VIEW, DOWNLOAD, DELETE, LOGIN

## Running the project
```bash
npm run dev        # dev server
npx prisma studio  # DB GUI
npx prisma db push # push schema changes
```

## Common fixes
- **Stale build errors** → `rm -rf .next && npm run dev`
- **node:crypto webpack error** → already fixed in next.config.ts
- **Port in use** → `lsof -ti:3000 | xargs kill` then `npm run dev`
