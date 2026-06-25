import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  Lock,
  EyeOff,
  FileCheck,
  ShieldCheck,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  ServerCrash,
  GraduationCap,
  BookOpen,
  Building2,
  Landmark,
  LayoutGrid,
  X,
  MessageSquare,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ScrollAnimations } from "@/components/scroll-animations";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pandecora — Report Safely",
  description:
    "Submit incident reports protected by advanced encryption. Your identity and evidence are always secure.",
};

// ─── Static data ───────────────────────────────────────────────────────────────

const STATS = [
  { value: "Zero",   label: "Plaintext on Disk",     sub: "All data independently secured" },
  { value: "100%",   label: "Plaintext-Free Storage", sub: "Zero unencrypted data" },
  { value: "5+",     label: "Institution Types",      sub: "University, school & more" },
  { value: "24 / 7", label: "Secure Access",          sub: "Always available" },
] as const;

const FEATURES = [
  { Icon: Lock,        title: "End-to-End Encrypted",      body: "Reports are encrypted before they ever reach the database. Breaching the storage layer reveals nothing readable." },
  { Icon: EyeOff,      title: "Identity Protected",        body: "Only verified administrators with the correct keys can decrypt your identity. Everyone else sees only ciphertext." },
  { Icon: FileCheck,   title: "Encrypted Evidence",        body: "Upload documents, images, and up to 2 GB of video. Every byte is encrypted on arrival — zero plaintext on disk." },
  { Icon: Fingerprint, title: "Tamper-Proof Audit Trail",  body: "Every admin action — view, download, status change, delete — is permanently logged with timestamp and IP." },
  { Icon: Clock,       title: "Draft & Resume Later",      body: "Start a report and save it as a draft. Return any time to complete and submit when you are ready." },
  { Icon: Users,       title: "Multi-Role Access Control", body: "Strict role separation ensures reporters and administrators can only perform actions appropriate to their role." },
] as const;

const PIPELINE = [
  { step: "01", label: "You submit",    detail: "Form data + files sent over TLS" },
  { step: "02", label: "Encrypted",     detail: "Encrypted on the server, each field independently secured" },
  { step: "03", label: "Stored safely", detail: "Only ciphertext reaches the database & disk" },
  { step: "04", label: "Admin only",    detail: "Decryption keys held by verified reviewers" },
] as const;

const STEPS = [
  { n: "01", title: "Create a secure account",  body: "Register with your institution details. Your email, phone, and personal information are encrypted the moment you sign up." },
  { n: "02", title: "Describe the incident",    body: "Choose a category, set urgency, and write a full description. Attach files, screenshots, and links as evidence." },
  { n: "03", title: "Submit with confidence",   body: "Your report is encrypted before storage. Only authorised administrators can review it, and every access is logged." },
] as const;

const CATEGORIES = [
  { label: "Harassment & Bullying",   color: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "Blackmail & Threats",     color: "bg-orange-50 text-orange-700 border-orange-200" },
  { label: "Corruption & Bribery",    color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "Discrimination",          color: "bg-violet-50 text-violet-700 border-violet-200" },
  { label: "Academic Malpractice",    color: "bg-blue-50 text-blue-700 border-blue-200" },
  { label: "Theft & Property Damage", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { label: "Other Policy Violations", color: "bg-gray-100 text-gray-700 border-gray-300" },
] as const;

const INSTITUTIONS = [
  { Icon: GraduationCap, label: "Universities" },
  { Icon: BookOpen,      label: "Schools" },
  { Icon: Building2,     label: "Colleges" },
  { Icon: Landmark,      label: "Madrasas" },
  { Icon: LayoutGrid,    label: "Other Institutions" },
] as const;

const URGENCY_LEVELS = [
  { dot: "bg-green-500",  label: "Low",      desc: "Non-urgent, informational" },
  { dot: "bg-yellow-500", label: "Medium",   desc: "Needs attention soon" },
  { dot: "bg-orange-500", label: "High",     desc: "Significant harm involved" },
  { dot: "bg-[#e60000]",  label: "Critical", desc: "Immediate action required" },
] as const;

const PROMISES = [
  { n: "01", title: "Your identity stays yours.",   body: "We never expose who you are. Your name, email, and phone number are locked behind encryption that only authorised reviewers hold the key to." },
  { n: "02", title: "Your evidence stays safe.",    body: "Every file you upload — photos, documents, videos — is encrypted before it touches our storage. A data breach reveals nothing." },
  { n: "03", title: "Every action is accountable.", body: "Every time an administrator opens, downloads, or changes the status of your report, it is recorded permanently with time and IP." },
] as const;

const COMPARE_OLD = [
  "Fear of retaliation stops most reporters",
  "Identity exposed to multiple staff members",
  "Paper trail can be altered or destroyed",
  "No way to track what happened to your report",
  "Verbal complaints are easy to dismiss or ignore",
];

const COMPARE_NEW = [
  "Your identity is encrypted — only reviewed by authorised staff",
  "Evidence is locked in place the moment you upload",
  "Immutable audit log — every action is permanently recorded",
  "Live status tracking from Pending to Resolved",
  "Written, encrypted record that cannot be tampered with",
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn  = !!cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const ctaHref     = isLoggedIn ? "/report"  : "/signup";
  const ctaLabel    = isLoggedIn ? "Submit a Report" : "Report an Incident";

  return (
    <>
      <ScrollAnimations />
      <Header />

      {/* ─── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-[#25282b]" aria-labelledby="hero-heading">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} aria-hidden="true" />
        <div className="absolute left-0 top-0 h-full w-1 bg-[#e60000]" aria-hidden="true" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-bl-full opacity-[0.04] bg-[#e60000]" aria-hidden="true" />

        <div className="relative mx-auto w-full max-w-7xl px-8 py-28 sm:px-12 lg:py-40">
          <div className="max-w-3xl">
            <div data-animate="down" className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[#e60000]/30 bg-[#e60000]/10 px-4 py-2">
              <ShieldCheck size={14} className="text-[#e60000]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Encrypted Reporting Platform</span>
            </div>

            <h1 id="hero-heading" data-animate="up" data-delay="100" className="mb-6 font-black uppercase leading-[0.95] tracking-tight text-white" style={{ fontSize: "clamp(48px, 8.5vw, 110px)" }}>
              Report Safely.<br /><span className="text-[#e60000]">Stay Protected.</span>
            </h1>

            <p data-animate="up" data-delay="200" className="mb-12 max-w-xl text-lg font-light leading-relaxed text-white/50">
              Your identity, evidence, and report content are protected with strong authenticated encryption — your data is secured from the moment it leaves your device.
            </p>

            <div data-animate="up" data-delay="320" className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href={ctaHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e60000] px-10 py-4 text-base font-semibold text-white transition-all hover:bg-[#cc0000] hover:shadow-lg hover:shadow-[#e60000]/25">
                {ctaLabel}<ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center rounded-full border border-white/20 px-10 py-4 text-base font-medium text-white/70 transition-colors hover:border-white/40 hover:text-white">
                See how it works
              </a>
            </div>

            <div data-animate="fade" data-delay="500" className="mt-14 flex flex-wrap gap-5">
              {["End-to-End Encrypted", "Zero Plaintext Storage", "Full Audit Trail"].map((badge) => (
                <div key={badge} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-[#e60000]" />
                  <span className="text-sm text-white/40">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: "linear-gradient(to bottom, transparent, rgba(37,40,43,0.8))" }} aria-hidden="true" />
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 lg:grid-cols-4 lg:divide-y-0">
            {STATS.map(({ value, label, sub }, i) => (
              <div key={label} data-animate="up" data-delay={String(i * 80)} className="px-8 py-10 text-center">
                <p className="text-3xl font-black tracking-tight text-[#25282b] sm:text-4xl">{value}</p>
                <p className="mt-1 text-sm font-semibold text-[#25282b]">{label}</p>
                <p className="mt-0.5 text-xs text-[#7e7e7e]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WHY IT MATTERS ───────────────────────────────────────────────────── */}
      <section className="bg-[#e60000]">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="grid lg:grid-cols-2">
            <div className="flex flex-col justify-center py-20 pr-0 lg:py-28 lg:pr-16">
              <p data-animate="right" className="mb-6 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">Why it matters</p>
              <blockquote data-animate="right" data-delay="120" className="font-black uppercase leading-[1.0] tracking-tight text-white" style={{ fontSize: "clamp(32px, 5vw, 64px)" }}>
                Fear of retaliation<br />should never silence<br />a victim.
              </blockquote>
              <p data-animate="right" data-delay="240" className="mt-8 max-w-sm text-base font-light leading-relaxed text-white/70">
                Incidents in educational institutions often go unreported because reporters fear exposure. This platform removes that barrier.
              </p>
            </div>

            <div className="flex flex-col gap-4 border-l border-white/20 py-20 pl-0 lg:pl-16">
              <div data-animate="left" data-delay="100" className="rounded-2xl bg-white/10 p-6">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-white/50">Without this platform</p>
                <ul className="space-y-2">
                  {["Identity exposed to staff", "Evidence can be lost or altered", "No record of who saw what", "Reporters often face backlash"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-white/80">
                      <X size={14} className="mt-0.5 shrink-0 text-white/40" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-animate="left" data-delay="220" className="rounded-2xl bg-white p-6">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-[#e60000]/60">With this platform</p>
                <ul className="space-y-2">
                  {["Identity locked behind encryption", "Evidence secured the moment it uploads", "Every admin action permanently logged", "Report safely from any device"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-[#25282b]">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#e60000]" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-16 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Platform Features</p>
              <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-[#25282b] sm:text-5xl">Built for trust,<br />designed for safety.</h2>
            </div>
            <p data-animate="left" className="max-w-sm text-base font-light leading-relaxed text-[#7e7e7e] lg:text-right">
              Every feature is engineered to protect whistleblowers and ensure sensitive evidence reaches only the right hands.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }, i) => (
              <article key={title} data-animate="zoom" data-delay={String(i * 80)} className="group relative rounded-2xl border border-gray-200 bg-white p-8 transition-shadow hover:shadow-lg hover:shadow-gray-100">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e60000]/10 transition-colors group-hover:bg-[#e60000]">
                  <Icon size={22} className="text-[#e60000] transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-[#25282b]">{title}</h3>
                <p className="text-sm leading-relaxed text-[#7e7e7e]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ENCRYPTION PIPELINE ──────────────────────────────────────────────── */}
      <section className="bg-[#25282b] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-16 text-center">
            <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Security Architecture</p>
            <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-white sm:text-5xl">How your data stays safe</h2>
            <p data-animate="up" data-delay="200" className="mx-auto mt-5 max-w-xl text-base font-light text-white/45">
              Every piece of data follows the same encryption pipeline — no exceptions, no shortcuts, no plaintext storage.
            </p>
          </div>

          <div className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-[28px] hidden h-px lg:block" style={{ background: "linear-gradient(to right, transparent, rgba(230,0,0,0.4) 20%, rgba(230,0,0,0.4) 80%, transparent)" }} aria-hidden="true" />
            {PIPELINE.map(({ step, label, detail }, i) => (
              <div key={step} data-animate="up" data-delay={String(i * 100)} className="relative flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e60000] bg-[#e60000]/10">
                  <span className="text-sm font-black text-[#e60000]">{step}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{label}</h3>
                <p className="text-xs leading-relaxed text-white/40">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Lock,          label: "Strong Encryption", desc: "Authenticated encryption — each field is independently secured with its own key material" },
              { icon: ServerCrash,   label: "Breach Resistant",  desc: "Database theft yields only ciphertext. Keys are never stored alongside data." },
              { icon: AlertTriangle, label: "Tamper Detection",  desc: "Authentication tags prevent silent data corruption or tampering attacks" },
            ].map(({ icon: Icon, label, desc }, i) => (
              <div key={label} data-animate="up" data-delay={String(i * 100)} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <Icon size={18} className="mb-3 text-[#e60000]" />
                <p className="mb-1.5 text-sm font-bold text-white">{label}</p>
                <p className="text-xs leading-relaxed text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-16">
            <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Simple Process</p>
            <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-[#25282b] sm:text-5xl">Three steps to<br />secure reporting.</h2>
          </div>

          <div className="space-y-6">
            {STEPS.map(({ n, title, body }, i) => (
              <div
                key={n}
                data-animate={i % 2 === 0 ? "right" : "left"}
                data-delay={String(i * 80)}
                className={`flex flex-col gap-6 rounded-2xl border p-8 sm:flex-row sm:items-start sm:gap-10 ${i % 2 === 0 ? "border-gray-200 bg-gray-50" : "border-[#e60000]/20 bg-[#e60000]/5"}`}
              >
                <div className="shrink-0 font-black leading-none text-[#e60000]/20" style={{ fontSize: "clamp(60px, 8vw, 90px)", lineHeight: 1 }}>{n}</div>
                <div className="pt-2">
                  <h3 className="mb-3 text-xl font-black text-[#25282b]">{title}</h3>
                  <p className="text-base leading-relaxed text-[#7e7e7e]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── OUR PROMISE ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-16 text-center">
            <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Our Promise</p>
            <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-[#25282b] sm:text-5xl">Three commitments<br />we never break.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {PROMISES.map(({ n, title, body }, i) => (
              <div key={n} data-animate="zoom" data-delay={String(i * 100)} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8">
                <div className="absolute -right-4 -top-6 font-black leading-none text-gray-100 select-none" style={{ fontSize: "120px" }} aria-hidden="true">{n}</div>
                <div className="relative">
                  <div className="mb-5 h-1 w-12 rounded-full bg-[#e60000]" />
                  <h3 className="mb-4 text-xl font-black text-[#25282b]">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#7e7e7e]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────────────────── */}
      <section className="bg-[#25282b] py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-8 sm:px-12">
          <div className="mb-16 text-center">
            <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">The Difference</p>
            <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-white sm:text-5xl">Old way vs. the right way.</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div data-animate="right" className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="mb-6 text-xs font-extrabold uppercase tracking-widest text-white/30">Traditional Reporting</p>
              <ul className="space-y-4">
                {COMPARE_OLD.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <X size={11} className="text-white/40" />
                    </div>
                    <span className="text-sm text-white/40 line-through decoration-white/20">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div data-animate="left" data-delay="120" className="rounded-2xl border border-[#e60000]/30 bg-[#e60000]/10 p-8">
              <p className="mb-6 text-xs font-extrabold uppercase tracking-widest text-[#e60000]/80">Pandecora</p>
              <ul className="space-y-4">
                {COMPARE_NEW.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e60000]/30">
                      <CheckCircle2 size={11} className="text-[#e60000]" />
                    </div>
                    <span className="text-sm font-medium text-white">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── INCIDENT CATEGORIES ──────────────────────────────────────────────── */}
      <section className="bg-white py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-14 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Incident Categories</p>
              <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-[#25282b] sm:text-5xl">What can be<br />reported?</h2>
            </div>
            <p data-animate="left" className="max-w-xs text-sm font-light text-[#7e7e7e]">
              Reports are classified by category and urgency level to ensure appropriate and timely review.
            </p>
          </div>

          <div data-animate="up" data-delay="100" className="flex flex-wrap gap-3">
            {CATEGORIES.map(({ label, color }) => (
              <span key={label} className={`rounded-full border px-5 py-2.5 text-sm font-semibold ${color}`}>{label}</span>
            ))}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {URGENCY_LEVELS.map(({ dot, label, desc }, i) => (
              <div key={label} data-animate="up" data-delay={String(100 + i * 80)} className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <span className="text-sm font-bold text-[#25282b]">{label} Priority</span>
                </div>
                <p className="text-xs text-[#7e7e7e]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── INSTITUTION TYPES ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-8 sm:px-12">
          <div className="mb-12 text-center">
            <p data-animate="up" className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e60000]">Who Can Report</p>
            <h2 data-animate="up" data-delay="100" className="text-4xl font-black tracking-tight text-[#25282b]">Open to all educational institutions</h2>
            <p data-animate="up" data-delay="200" className="mx-auto mt-4 max-w-xl text-base font-light text-[#7e7e7e]">
              Students and teachers across every type of institution in Bangladesh can register and submit reports.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {INSTITUTIONS.map(({ Icon, label }, i) => (
              <div key={label} data-animate="zoom" data-delay={String(i * 80)} className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center transition-colors hover:border-[#e60000]/40 hover:bg-[#e60000]/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e60000]/10">
                  <Icon size={22} className="text-[#e60000]" />
                </div>
                <span className="text-sm font-semibold text-[#25282b]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ANONYMOUS QUOTE ──────────────────────────────────────────────────── */}
      <section className="bg-[#25282b] py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-8 text-center sm:px-12">
          <div data-animate="zoom" className="mb-8 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
              <MessageSquare size={20} className="text-[#e60000]" />
            </div>
          </div>
          <blockquote data-animate="up" data-delay="120" className="font-black italic leading-tight tracking-tight text-white" style={{ fontSize: "clamp(24px, 4vw, 44px)" }}>
            &ldquo;I was afraid no one would believe me. This platform let me document everything safely — and it worked.&rdquo;
          </blockquote>
          <p data-animate="fade" data-delay="300" className="mt-6 text-sm text-white/30">— Anonymous student, University of Dhaka</p>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#e60000] py-24 lg:py-32">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden="true" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-bl-full bg-white/10" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 h-56 w-56 rounded-tr-full bg-black/10" aria-hidden="true" />

        <div className="relative mx-auto max-w-4xl px-8 text-center sm:px-12">
          <p data-animate="up" className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/60">Get Started Today</p>
          <h2 data-animate="up" data-delay="100" className="mb-6 font-black uppercase leading-[0.95] tracking-tight text-white" style={{ fontSize: "clamp(40px, 7vw, 80px)" }}>
            Your voice deserves<br />to be heard safely.
          </h2>
          <p data-animate="up" data-delay="200" className="mx-auto mb-12 max-w-lg text-lg font-light text-white/70">
            Join the platform where every report is protected, every identity is shielded, and every action is accountable.
          </p>
          <div data-animate="up" data-delay="300" className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-4 text-base font-bold text-[#e60000] transition-all hover:shadow-2xl hover:shadow-black/20">
              {ctaLabel}<ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-10 py-4 text-base font-medium text-white/80 transition-colors hover:border-white hover:text-white">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
