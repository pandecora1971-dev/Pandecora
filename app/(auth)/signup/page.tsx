"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Shield } from "lucide-react";
import { signupStep1Schema, validatePasswordStrength, isAcademic, type ProfessionValue } from "@/lib/validators";
import { useSignup } from "./_context";

// ─── Password strength ─────────────────────────────────────────────────────────

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function getStrengthLevel(errorCount: number): StrengthLevel {
  if (errorCount >= 4) return "weak";
  if (errorCount === 3) return "fair";
  if (errorCount === 2) return "good";
  return "strong";
}

const STRENGTH: Record<StrengthLevel, { label: string; labelBn: string; color: string; segments: number }> = {
  weak:   { label: "Weak",   labelBn: "দুর্বল",    color: "bg-red-500",    segments: 1 },
  fair:   { label: "Fair",   labelBn: "মোটামুটি",  color: "bg-amber-500",  segments: 2 },
  good:   { label: "Good",   labelBn: "ভালো",       color: "bg-yellow-400", segments: 3 },
  strong: { label: "Strong", labelBn: "শক্তিশালী", color: "bg-green-500",  segments: 4 },
};

// ─── Profession definitions ────────────────────────────────────────────────────

const ACADEMIC_OPTIONS: { val: ProfessionValue; bn: string; en: string }[] = [
  { val: "TEACHER", bn: "শিক্ষক",     en: "Teacher" },
  { val: "STUDENT", bn: "শিক্ষার্থী", en: "Student" },
];

const PROFESSIONAL_OPTIONS: { val: ProfessionValue; bn: string; en: string }[] = [
  { val: "DOCTOR",        bn: "ডাক্তার",  en: "Doctor" },
  { val: "ENGINEER",      bn: "প্রকৌশলী", en: "Engineer" },
  { val: "LAWYER",        bn: "আইনজীবী",  en: "Lawyer" },
  { val: "JOURNALIST",    bn: "সাংবাদিক", en: "Journalist" },
  { val: "AGRICULTURIST", bn: "কৃষিবিদ",  en: "Agriculturist" },
  { val: "OTHERS",        bn: "অন্যান্য", en: "Others" },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const { setStep1 } = useSignup();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [profession, setProfession] = useState<ProfessionValue | "">("");

  const pwResult = password ? validatePasswordStrength(password) : null;
  const strengthLevel = pwResult ? getStrengthLevel(pwResult.errors.length) : null;
  const strengthCfg = strengthLevel ? STRENGTH[strengthLevel] : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (honeypot) {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1400));
      setLoading(false);
      return;
    }

    setErrors({});
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const raw = {
      name:             fd.get("name") as string,
      email:            fd.get("email") as string,
      phone:            fd.get("phone") as string,
      password:         fd.get("password") as string,
      confirmPassword:  fd.get("confirmPassword") as string,
      teacherOrStudent: profession,
    };

    const result = signupStep1Schema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    setStep1(result.data);
    // Academics go directly to location; professionals get an extra profession step
    router.push(isAcademic(result.data.teacherOrStudent) ? "/signup/location" : "/signup/profession");
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left brand panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[40%] flex-col justify-between bg-[#25282b] px-12 py-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
            <Shield size={17} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">Pandecora</span>
        </Link>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">ধাপ ১ — ব্যক্তিগত তথ্য</p>
          <h2 className="mt-4 text-5xl font-black uppercase leading-[1.05] tracking-tight text-white">
            আপনার<br />অ্যাকাউন্ট।
          </h2>
          <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-white/55">
            সাইবার নিরাপত্তা ঘটনার প্রতিবেদন জমা দিতে ও ট্র্যাক করতে একটি
            সুরক্ষিত অ্যাকাউন্ট তৈরি করুন।
          </p>

          <div className="mt-10 space-y-3">
            {[
              { bn: "ব্যক্তিগত তথ্য ও পরিচয়", en: "Personal info & credentials", active: true },
              { bn: "পেশাদার তথ্য",             en: "Professional details",        active: false },
              { bn: "অবস্থান ও প্রতিষ্ঠান",    en: "Location & institution",      active: false },
            ].map(({ bn, en, active }, i) => (
              <div key={en}>
                {i > 0 && <div className="ml-3.5 h-5 w-px bg-white/20 mb-3" />}
                <div className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${active ? "bg-[#e60000] text-white" : "bg-white/15 text-white/40"}`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/40"}`}>{bn}</p>
                    <p className={`text-xs ${active ? "text-white/50" : "text-white/25"}`}>{en}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Pandecora</p>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-14 overflow-y-auto">

        <div className="mb-8 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
              <Shield size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#25282b]">Pandecora</span>
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#e60000]">ধাপ ১ — ব্যক্তিগত তথ্য</p>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-[#25282b]">অ্যাকাউন্ট তৈরি করুন</h1>
            <p className="text-xs text-[#7e7e7e] mt-0.5">Create account</p>
            <p className="mt-2 text-sm text-[#7e7e7e]">ব্যক্তিগত তথ্য ও পাসওয়ার্ড দিন</p>
          </div>

          {/* Honeypot */}
          <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
            <label htmlFor="hp_website">Website</label>
            <input id="hp_website" name="website" type="text" tabIndex={-1} autoComplete="nope" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {Object.keys(errors).length > 0 && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#e60000]">
                নিচের তথ্যগুলো সঠিকভাবে পূরণ করুন।
              </div>
            )}

            <Field id="name" label="পুরো নাম" labelEn="Full Name" error={errors.name} required>
              <input id="name" name="name" type="text" autoComplete="name" placeholder="আপনার পুরো নাম লিখুন" className={inputCn(!!errors.name)} />
            </Field>

            <Field id="email" label="ইমেইল ঠিকানা" labelEn="Email" error={errors.email} required>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" className={inputCn(!!errors.email)} />
            </Field>

            <Field id="phone" label="মোবাইল নম্বর" labelEn="Phone Number" error={errors.phone} required>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className={inputCn(!!errors.phone)} />
            </Field>

            <Field id="password" label="পাসওয়ার্ড" labelEn="Password" error={errors.password} required>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password" placeholder="কমপক্ষে ৮ অক্ষর"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className={inputCn(!!errors.password) + " pr-11"}
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "লুকান" : "দেখুন"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#25282b]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && strengthCfg && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((seg) => (
                      <div key={seg} className={["h-1.5 flex-1 rounded-full transition-colors duration-300", seg <= strengthCfg.segments ? strengthCfg.color : "bg-gray-200"].join(" ")} />
                    ))}
                  </div>
                  <p className={["text-xs font-medium", strengthLevel === "weak" ? "text-red-500" : strengthLevel === "fair" ? "text-amber-500" : strengthLevel === "good" ? "text-yellow-500" : "text-green-500"].join(" ")}>
                    {strengthCfg.labelBn} <span className="font-normal text-gray-400">({strengthCfg.label})</span>
                  </p>
                </div>
              )}
            </Field>

            <Field id="confirmPassword" label="পাসওয়ার্ড নিশ্চিত করুন" labelEn="Confirm Password" error={errors.confirmPassword} required>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password" placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                  className={inputCn(!!errors.confirmPassword) + " pr-11"}
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? "লুকান" : "দেখুন"} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#25282b]">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {/* ── Profession selection ── */}
            <fieldset>
              <legend className="text-sm font-semibold text-[#25282b]">
                আমি একজন <span className="ml-1 text-xs font-normal text-[#7e7e7e]">(I am a)</span>
                <span className="text-[#e60000]">*</span>
              </legend>

              <p className="mt-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">শিক্ষা প্রতিষ্ঠান — Academic</p>
              <div className="flex gap-3 mb-4">
                {ACADEMIC_OPTIONS.map(({ val, bn, en }) => (
                  <label key={val} className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-3 text-center transition-colors ${profession === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 text-[#25282b] hover:bg-gray-50"}`}>
                    <input type="radio" name="teacherOrStudent" value={val} checked={profession === val} onChange={() => setProfession(val)} className="sr-only" />
                    <span className="text-sm font-bold">{bn}</span>
                    <span className="text-[10px] opacity-60">{en}</span>
                  </label>
                ))}
              </div>

              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#7e7e7e]">পেশাদার — Professional</p>
              <div className="grid grid-cols-3 gap-2">
                {PROFESSIONAL_OPTIONS.map(({ val, bn, en }) => (
                  <label key={val} className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-3 text-center transition-colors ${profession === val ? "border-[#e60000] bg-[#e60000]/5 text-[#e60000]" : "border-gray-200 text-[#25282b] hover:bg-gray-50"}`}>
                    <input type="radio" name="teacherOrStudent" value={val} checked={profession === val} onChange={() => setProfession(val)} className="sr-only" />
                    <span className="text-xs font-bold">{bn}</span>
                    <span className="text-[10px] opacity-60">{en}</span>
                  </label>
                ))}
              </div>

              {errors.teacherOrStudent && (
                <p className="mt-1.5 text-xs text-[#e60000]">{errors.teacherOrStudent}</p>
              )}
            </fieldset>

            <button
              type="submit" disabled={loading}
              className="w-full rounded-lg bg-[#e60000] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "যাচাই করা হচ্ছে…" : "পরবর্তী →"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#7e7e7e]">
            ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
            <Link href="/login" className="font-semibold text-[#e60000] hover:underline">লগইন করুন</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function inputCn(hasError: boolean): string {
  return [
    "w-full rounded-lg border bg-gray-50 px-4 py-3 text-sm text-[#25282b]",
    "placeholder:text-gray-400 transition-all focus:bg-white focus:outline-none focus:ring-2",
    hasError ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15" : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15",
  ].join(" ");
}

function Field({ id, label, labelEn, error, required, children }: {
  id: string; label: string; labelEn?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-[#25282b]">
        {label}
        {labelEn && <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">({labelEn})</span>}
        {required && <span className="ml-0.5 text-[#e60000]">*</span>}
      </label>
      {children}
      {error && <p role="alert" className="text-xs text-[#e60000]">{error}</p>}
    </div>
  );
}
