"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Shield, Lock, FileText, Users } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (honeypot) {
      startTransition(async () => { await new Promise((r) => setTimeout(r, 1400)); });
      return;
    }
    setError(null);
    setUnverified(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(fd);
      if (result?.error) {
        setError(result.error);
        setUnverified(result.unverified === true);
      }
    });
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left: brand panel (desktop only) ───────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#25282b] px-12 py-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
            <Shield size={17} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Pandecora
          </span>
        </Link>

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">
            সুরক্ষিত রিপোর্টিং
          </p>
          <h2 className="mt-4 text-5xl font-black uppercase leading-[1.05] tracking-tight text-white">
            রিপোর্ট<br />করুন।<br />নিরাপদ<br />থাকুন।
          </h2>
          <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-white/55">
            প্রতিটি তথ্য আমাদের সার্ভারে পৌঁছানোর আগেই সুরক্ষিত হয়।
            প্রতিটি ধাপে আপনার পরিচয় সম্পূর্ণ গোপন থাকে।
          </p>

          <div className="mt-10 space-y-4">
            {[
              { Icon: Lock,     bn: "নিরাপদ এনক্রিপশন ব্যবস্থা",              en: "Secure encryption system" },
              { Icon: FileText, bn: "এনক্রিপ্টেড ফাইল ও প্রমাণ সংরক্ষণ",    en: "Encrypted file & evidence storage" },
              { Icon: Users,    bn: "শুধুমাত্র অনুমোদিত কর্মীদের দ্বারা পর্যালোচিত", en: "Reviewed by authorised personnel only" },
            ].map(({ Icon, bn, en }) => (
              <div key={en} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 mt-0.5">
                  <Icon size={14} className="text-white/60" />
                </div>
                <div>
                  <p className="text-sm text-white/80">{bn}</p>
                  <p className="text-xs text-white/35">{en}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/25">
          &copy; {new Date().getFullYear()} Pandecora
        </p>
      </div>

      {/* ── Right: form panel ───────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center bg-white px-6 py-12 sm:px-12 lg:px-16">

        {/* Mobile logo */}
        <div className="mb-10 lg:hidden">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
              <Shield size={17} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-[#25282b]">
              Pandecora
            </span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-black tracking-tight text-[#25282b]">
              স্বাগতম
            </h1>
            <p className="text-xs text-[#7e7e7e] mt-0.5">Welcome back</p>
            <p className="mt-3 text-sm text-[#7e7e7e]">
              ঘটনা প্রতিবেদন জমা দিন বা ট্র্যাক করুন
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-[#e60000]/20 bg-[#e60000]/5 px-4 py-3 text-sm text-[#e60000]"
            >
              {error}
              {unverified && (
                <div className="mt-2 pt-2 border-t border-[#e60000]/15">
                  <a
                    href="/verify-email/pending"
                    className="font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    যাচাইকরণ ইমেইল পুনরায় পাঠান →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Honeypot */}
          <div className="absolute -left-[9999px] -top-[9999px]" aria-hidden="true">
            <label htmlFor="hp_website">Website</label>
            <input
              id="hp_website" name="website" type="text"
              tabIndex={-1} autoComplete="nope"
              value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-[#25282b]">
                ইমেইল ঠিকানা
                <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">(Email address)</span>
              </label>
              <input
                id="email" name="email" type="email"
                autoComplete="username" placeholder="আপনার ইমেইল লিখুন"
                disabled={isPending}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#25282b] placeholder:text-gray-400 transition-all focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-[#25282b]">
                পাসওয়ার্ড
                <span className="ml-1.5 text-xs font-normal text-[#7e7e7e]">(Password)</span>
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password" placeholder="আপনার পাসওয়ার্ড লিখুন"
                  disabled={isPending}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-11 text-sm text-[#25282b] placeholder:text-gray-400 transition-all focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#25282b]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={isPending}
              className="w-full rounded-lg bg-[#e60000] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "লগইন হচ্ছে…" : "লগইন করুন"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#7e7e7e]">
            অ্যাকাউন্ট নেই?{" "}
            <Link href="/signup" className="font-semibold text-[#e60000] hover:underline">
              নিবন্ধন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
