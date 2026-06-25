# > Pandecora

> **Domain:** `pandecora.com` — this is the project name and the domain that must be purchased and configured before going live.

A full-stack web application for submitting and managing confidential incident reports. All personally identifiable information is encrypted at the application layer before reaching the database. Only authorised administrators can view submissions.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [🚀 Handoff Guide — Taking This Live (Read This First)](#-handoff-guide--taking-this-live-read-this-first)
- [Environment Variables — Full Reference](#environment-variables--full-reference)
- [Getting Started — Local Development](#getting-started--local-development)
- [Running with Docker](#running-with-docker)
- [Database Management](#database-management)
- [Security Model](#security-model)
- [File Storage](#file-storage)
- [Email](#email)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Overview

Pandecora allows registered users to submit incident reports — with supporting evidence in the form of images, documents, videos, and URLs — against one or more named individuals. Every free-text field and file is encrypted before storage. Administrators review submissions through a protected dashboard with full audit logging of all sensitive actions.

The platform is bilingual: **Bangla is the primary language** across all user-facing pages; English appears as secondary context.

---

## Features

- Multi-step registration with profession-specific fields (Teacher, Student, Doctor, Engineer, Lawyer, Journalist, Agriculturist, Others) and full Bangladesh location hierarchy (Division → District → Upazila).
- Email verification gate before account activation.
- 3-section incident report form: incident details + evidence, accused information + evidence, and optional additional responsible parties (unlimited entries).
- Evidence uploads: images, documents (PDF, TXT), and video files up to 2 GB. All files encrypted at rest.
- Save as draft at any point; submit when ready.
- Admin dashboard: filter and review submissions by category, urgency, status; manage users by profession and location.
- Role-based access control: USER, MODERATOR, ADMIN.
- Immutable audit log for every admin action.
- Public contact form with server-side validation.
- Anti-scraping protection: `robots.txt`, HTTP headers, and metadata directives block all known AI crawlers and data harvesting bots.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Components | Radix UI |
| Validation | Zod |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Password hashing | Argon2id |
| Encryption | Node.js `crypto` — AES-256-GCM |
| File parsing | busboy |
| Email | Resend |
| Storage | Local filesystem or Cloudflare R2 |
| Container | Docker (multi-stage, Node 20 Alpine) |
| Reverse proxy | Nginx (production) |

---

## Project Structure

```
.
├── app/
│   ├── (public)/          # Home, About, Contact, Login, Signup, Verify-email
│   ├── (protected)/       # Report submission (requires verified session)
│   └── (admin)/           # Admin dashboard (requires ADMIN/MODERATOR role)
├── components/
│   ├── forms/             # Report form, contact form, auth forms
│   └── layout/            # Header, footer, shared UI
├── lib/
│   ├── encryption.ts      # AES-256-GCM — all crypto confined here
│   ├── session.ts         # Cookie-based session validation
│   ├── auth.ts            # Login, signup, password hashing (Argon2id)
│   ├── rate-limit.ts      # Fixed-window in-memory rate limiter
│   ├── storage.ts         # StorageAdapter — local or R2
│   ├── email.ts           # Resend email delivery
│   ├── audit.ts           # Audit log writer
│   └── db.ts              # Prisma client singleton
├── prisma/
│   └── schema.prisma      # Database schema
├── public/
│   └── robots.txt         # Crawl rules — AI bots fully blocked
├── middleware.ts           # Session check + route protection
├── Dockerfile
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## 🚀 Handoff Guide — Taking This Live (Read This First)

**This section is written for the person who will take this codebase from local to a live production website. Follow every step in order. Do not skip anything marked REQUIRED.**

---

### Step 1 — Buy the Domain

> **Buy: `pandecora.com`** (or `pandecora.net` / `.org` if `.com` is taken)

| Where to buy | Link | Approx. cost |
|---|---|---|
| hostinger *(recommended — cheap + free WHOIS privacy)* | https://www.hostinger.com | ~$10–12/year |
| Cloudflare Registrar *(at-cost pricing, no markup)* | https://www.cloudflare.com/products/registrar/ | ~$9–11/year |
| Porkbun | https://porkbun.com | ~$9/year |

After buying:
- Log into your registrar's DNS settings.
- You will come back here later (Step 4) to point it at your server.

---

### Step 2 — Get a Server (VPS)

You need a Linux server with Docker. Minimum spec: **2 vCPU, 2 GB RAM, 20 GB SSD**.

| Provider | Link | Approx. cost | Notes |
|---|---|---|---|
| Hetzner *(cheapest for value)* | https://www.hetzner.com/cloud | $4–6/month | Best choice for budget |
| DigitalOcean | https://www.digitalocean.com/products/droplets | $6–12/month | Easy panel, good docs |
| Vultr | https://www.vultr.com | $6/month | Fast setup |
| Linode (Akamai) | https://www.linode.com | $5/month | Reliable |

After buying a server:
1. Create a new Ubuntu 24.04 (or Debian 12) VPS.
2. SSH into it: `ssh root@YOUR_SERVER_IP`
3. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. Install Docker Compose plugin:
   ```bash
   apt install docker-compose-plugin -y
   ```
5. Note down your server's **public IP address** — you need it for DNS.

---

### Step 3 — Set Up Email Sending (Resend)

> **Free account required — no credit card for free tier**

The platform sends email verification links. Without this, users cannot verify their accounts.

1. Sign up at https://resend.com (free — 3,000 emails/month, 100/day)
2. Go to **Domains** → **Add Domain** → type `pandecora.com`
3. Resend will give you DNS records (TXT and MX records). Add them to your domain registrar's DNS settings.
4. Wait for verification (usually 5–15 minutes). Resend shows a green tick when done.
5. Go to **API Keys** → **Create API Key** → give it full access → copy the key.
6. You will paste this key into `RESEND_API_KEY` in your `.env` file later.
7. Your `EMAIL_FROM` will be: `Pandecora <noreply@pandecora.com>`

---

### Step 4 — Point the Domain at Your Server

In your domain registrar's DNS settings, add these records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `YOUR_SERVER_IP` | 300 |
| A | `www` | `YOUR_SERVER_IP` | 300 |

Also add any DNS records Resend gave you in Step 3 (for email sending).

Wait 5–30 minutes for DNS to propagate. You can check at https://dnschecker.org.

---

### Step 5 — (Optional) Set Up File Storage on Cloudflare R2

> **Only needed if you expect large file uploads or want cloud storage. If not, skip this — the app stores files on disk by default.**

R2 is free for the first 10 GB/month.

1. Sign up at https://www.cloudflare.com (free)
2. Go to **R2 Object Storage** → **Create Bucket** → name it `pandecora-uploads`
3. Go to **Manage R2 API Tokens** → **Create API Token** → tick "Object Read & Write" → select your bucket → create
4. Copy: **Account ID** (visible on the R2 overview page), **Access Key ID**, **Secret Access Key**
5. In bucket settings → **Public Access** → enable a public URL (or connect a custom subdomain like `cdn.pandecora.com`)
6. You will paste all five values into your `.env` later and set `STORAGE_ADAPTER=r2`

If you skip R2, set `STORAGE_ADAPTER=local` and files will be stored on the server disk.

---

### Step 6 — Generate Secret Keys

Run these commands **on your own computer** (you need OpenSSL installed — it comes with macOS and Linux):

```bash
# Encryption key — 256-bit AES key
openssl rand -hex 32
# → paste result into ENCRYPTION_KEY

# Hash pepper — HMAC key for email hashing  
openssl rand -hex 32
# → paste result into HASH_PEPPER  (must be DIFFERENT from ENCRYPTION_KEY)

# Session secret
openssl rand -base64 32
# → paste result into BETTER_AUTH_SECRET

# Strong database password
openssl rand -base64 24
# → paste result into DB_PASSWORD
```

> ⚠️ **CRITICAL**: Write down `ENCRYPTION_KEY` and `HASH_PEPPER` and store them somewhere safe offline (password manager, printed paper in a safe). If you lose them after the database has data, all encrypted data is permanently unreadable. These two values must never change after launch.

---

### Step 7 — Create the `.env` File

On the server, clone the repository and create the `.env` file:

```bash
git clone <repo-url> /app/pandecora
cd /app/pandecora
cp .env.example .env
nano .env      # or: vim .env
```

Fill in every value. Here is exactly what to replace with real values — go line by line:

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL="postgresql://admin:YOUR_DB_PASSWORD@db:5432/pandecora"
#                                 ^^^^^^^^^^^^^^^^ ← paste DB_PASSWORD here
#                                                          ^^^^^^^^ ← can keep this name or change it

DB_USER=admin
DB_PASSWORD=YOUR_DB_PASSWORD       ← paste same password here
DB_NAME=pandecora

# ── Encryption ────────────────────────────────────────────────
ENCRYPTION_KEY=YOUR_64_HEX_CHARS   ← paste output of: openssl rand -hex 32
HASH_PEPPER=YOUR_64_HEX_CHARS      ← paste output of different: openssl rand -hex 32

# ── Auth / Session ────────────────────────────────────────────
BETTER_AUTH_SECRET=YOUR_BASE64     ← paste output of: openssl rand -base64 32
BETTER_AUTH_URL="https://pandecora.com"          ← your real domain
NEXT_PUBLIC_APP_URL="https://pandecora.com"      ← same as above

# ── Admin account (seed) ──────────────────────────────────────
ADMIN_EMAIL="admin@pandecora.com"   ← your real admin email
ADMIN_PASSWORD="ChangeMe!Strong1"   ← strong password, change after first login

# ── Storage ───────────────────────────────────────────────────
STORAGE_ADAPTER="local"             ← or "r2" if you set up Cloudflare R2

# If STORAGE_ADAPTER=r2, fill these in:
R2_ACCOUNT_ID=""                    ← from Cloudflare dashboard
R2_ACCESS_KEY_ID=""                 ← from R2 API token
R2_SECRET_ACCESS_KEY=""             ← from R2 API token
R2_BUCKET_NAME="pandecora-uploads"  ← your bucket name
R2_PUBLIC_URL=""                    ← your R2 public URL

# ── Email ─────────────────────────────────────────────────────
RESEND_API_KEY="re_xxxxxxxxxxxx"    ← paste API key from resend.com
EMAIL_FROM="Pandecora <noreply@pandecora.com>"

# ── Runtime ───────────────────────────────────────────────────
NODE_ENV="production"
```

---

### Step 8 — Also Update `robots.txt`

Open `public/robots.txt` and replace the placeholder domain at the bottom:

```
# Find this line:
Sitemap: https://yourdomain.com/sitemap.xml

# Change to:
Sitemap: https://pandecora.com/sitemap.xml
```

---

### Step 9 — Launch the App

```bash
# From /app/pandecora on the server:
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This builds the Docker image, starts the app and database containers, and starts Nginx.

---

### Step 10 — Run Database Migrations and Seed Admin Account

```bash
# Apply database schema
docker compose exec app npx prisma migrate deploy

# Create the initial admin account (uses ADMIN_EMAIL + ADMIN_PASSWORD from .env)
docker compose exec app npm run seed
```

---

### Step 11 — Get a Free SSL Certificate (HTTPS)

```bash
# Install certbot on the server
apt install certbot python3-certbot-nginx -y

# Get the certificate (replace with your real domain)
certbot --nginx -d pandecora.com -d www.pandecora.com
```

Certbot auto-renews every 90 days. HTTPS is now live.

---

### Step 12 — First Login and Security

1. Go to `https://pandecora.com/admin/login`
2. Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env`
3. **Change the admin password immediately** after logging in
4. Test user registration and email verification end-to-end

---

### ✅ Go-Live Checklist

Before calling it live, verify every item below:

- [ ] Domain `pandecora.com` points to the server (DNS A record)
- [ ] `https://pandecora.com` loads with a green padlock (SSL working)
- [ ] Admin login works at `https://pandecora.com/admin/login`
- [ ] User registration works and verification email arrives
- [ ] File upload works on the report form
- [ ] `NODE_ENV=production` is set in `.env`
- [ ] Database port 5432 is NOT accessible from the public internet (`netstat -tlnp | grep 5432` — should only show 127.0.0.1 or the Docker network)
- [ ] Admin password has been changed from the seed value
- [ ] `ENCRYPTION_KEY` and `HASH_PEPPER` are backed up offline
- [ ] Automated database backups are scheduled (see below)
- [ ] `./uploads` directory is included in backups if using local storage

---

### Backup Setup (Recommended)

Set up a daily database backup with cron:

```bash
crontab -e

# Add this line (runs daily at 2 AM, keeps 7 days of backups):
0 2 * * * docker compose -f /app/pandecora/docker-compose.yml exec -T db pg_dump -U admin pandecora > /backups/pandecora_$(date +\%Y\%m\%d).sql && find /backups -name "pandecora_*.sql" -mtime +7 -delete
```

---

### Cost Summary

| Item | Where | Cost | Required? |
|---|---|---|---|
| Domain `pandecora.com` | Namecheap / Cloudflare | ~$10/year | **Yes** |
| VPS (2 vCPU / 2 GB) | Hetzner / DigitalOcean | $4–12/month | **Yes** |
| SSL Certificate | Let's Encrypt (free) | Free | **Yes** (auto) |
| Resend email | resend.com | Free (3k/mo) | **Yes** (free tier fine) |
| Cloudflare R2 storage | cloudflare.com | Free (10 GB/mo) | Optional |

**Minimum cost to run: ~$4–12/month + ~$10/year domain.**

---

## Environment Variables — Full Reference

| Variable | Required | Description | How to generate |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | Fill manually |
| `DB_USER` | Yes | Database username | Fill manually |
| `DB_PASSWORD` | Yes | Database password | `openssl rand -base64 24` |
| `DB_NAME` | Yes | Database name | Fill manually |
| `ENCRYPTION_KEY` | **Critical** | 64-char hex AES key — never change after data written | `openssl rand -hex 32` |
| `HASH_PEPPER` | **Critical** | 64-char hex HMAC key — never change after data written | `openssl rand -hex 32` |
| `BETTER_AUTH_SECRET` | Yes | Session signing secret | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your domain, e.g. `https://pandecora.com` | Fill manually |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `BETTER_AUTH_URL` | Fill manually |
| `ADMIN_EMAIL` | Yes | Initial admin account email | Fill manually |
| `ADMIN_PASSWORD` | Yes | Initial admin password — change after first login | Fill manually |
| `STORAGE_ADAPTER` | Yes | `local` or `r2` | Fill manually |
| `R2_ACCOUNT_ID` | If r2 | Cloudflare account ID | From Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | If r2 | R2 API token access key | From R2 API token |
| `R2_SECRET_ACCESS_KEY` | If r2 | R2 API token secret | From R2 API token |
| `R2_BUCKET_NAME` | If r2 | R2 bucket name | Fill manually |
| `R2_PUBLIC_URL` | If r2 | R2 bucket public URL | From Cloudflare dashboard |
| `RESEND_API_KEY` | Yes | Email API key | From resend.com |
| `EMAIL_FROM` | Yes | From address for emails | `Pandecora <noreply@pandecora.com>` |
| `NODE_ENV` | Yes | `production` in live deployments | Fill manually |

---

## Getting Started — Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Copy and fill the env file

```bash
cp .env.example .env
# Fill in DATABASE_URL, ENCRYPTION_KEY, HASH_PEPPER, BETTER_AUTH_SECRET
# For local dev, RESEND_API_KEY can be left empty — links print to the console
```

### 3. Start PostgreSQL via Docker

```bash
docker compose up -d db
```

### 4. Run migrations and seed

```bash
npm run db:migrate
npm run seed
```

### 5. Start the dev server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Running with Docker

### Development

```bash
docker compose up --build
```

### Production

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Database Management

| Command | Description |
|---|---|
| `npm run db:generate` | Regenerate Prisma Client after schema changes |
| `npm run db:migrate` | Create and apply a new SQL migration |
| `npm run db:push` | Push schema without a migration file (dev only) |
| `npm run db:studio` | Open Prisma Studio at port 5555 |
| `npm run seed` | Create the initial admin account |

---

## Security Model

### Password hashing
Passwords are hashed with **Argon2id** (memory-hard). Salt is embedded in the output hash.

### Encryption at rest
All PII (emails, phone numbers, descriptions, accused names, file names, URLs) is encrypted with authenticated symmetric encryption before being written to the database. Each field gets a fresh random initialisation vector per encryption call. The authentication tag ensures tampered data is rejected on decryption.

### Email hashing
A keyed HMAC hash of each email (using `HASH_PEPPER`) is stored for uniqueness checks and login lookups. This is a one-way function — the hash cannot be reversed.

### Sessions
Random UUID token, stored in the database, sent as `HttpOnly; SameSite=Strict; Secure` cookie. 30-minute sliding expiry.

### File encryption
Evidence files are encrypted immediately after upload. Video files (up to 2 GB) use a streaming cipher to avoid loading them entirely into memory.

### Anti-scraping
- `public/robots.txt` blocks GPTBot, ClaudeBot, CCBot, Google-Extended, Bytespider, and 20+ other AI/data crawlers.
- `X-Robots-Tag: noai, noimageai` HTTP header on every response.
- Root metadata declares `robots: noindex, nofollow` and `ai-content-opt-out: 1`.

---

## File Storage

Two backends, selected by `STORAGE_ADAPTER`:

- **`local`** — files stored in `./uploads/` on the server (Docker volume). Fine for a single server.
- **`r2`** — files stored in Cloudflare R2. Required for multi-instance deployments.

| Evidence type | Formats | Max size | Max count |
|---|---|---|---|
| Documents & Images | JPEG, PNG, GIF, WebP, PDF, TXT | 20 MB each | 5 per section |
| Video | MP4, MOV, AVI, WebM, MPEG | 2 GB | 1 per section |

---

## Email

Transactional email via **Resend** (https://resend.com).  
Free tier: 3,000 emails/month, 100/day.  
Without `RESEND_API_KEY`, verification links are printed to the server console.

---

## Deployment

See the **[Handoff Guide](#-handoff-guide--taking-this-live-read-this-first)** above — it covers everything.

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm run dev` | Dev server with hot reload (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Start production build locally |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:push` | Push schema without migration (dev only) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run seed` | Seed initial admin account |

---

## License

Private. All rights reserved. © Pandecora.
