import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { Shield } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ResendForm } from "./resend-form";

export const metadata = { title: "ইমেইল যাচাই করুন — Pandecora" };

export default async function PendingPage() {
  // Pre-fill the email from the cookie set during signup (best-effort)
  const cookieStore  = await cookies();
  const pendingEmail = cookieStore.get(`${AUTH_COOKIE_NAME}_pending`)?.value ?? "";

  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">

          {/* Brand mark */}
          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e60000]">
                <Shield size={17} className="text-white" />
              </div>
              <span className="text-sm font-bold text-[#25282b]">Pandecora</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">

            {/* Envelope illustration */}
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#e60000]/10">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="#e60000" strokeWidth="1.8"/>
                <path d="M2 7l10 7 10-7" stroke="#e60000" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>

            <h1 className="text-center text-2xl font-black text-[#25282b]">
              আপনার ইনবক্স চেক করুন
            </h1>
            <p className="mt-1 text-center text-xs text-[#7e7e7e]">Check your inbox</p>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#7e7e7e]">
              আপনার ইমেইল ঠিকানায় একটি যাচাইকরণ লিংক পাঠানো হয়েছে।
              অ্যাকাউন্ট সক্রিয় করতে লিংকে ক্লিক করুন।
            </p>
            <p className="mt-1 text-center text-xs text-[#7e7e7e]">
              We&apos;ve sent a verification link to your email. Click the link to activate your account.
            </p>

            {/* Tips */}
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 space-y-3">
              {[
                { bn: "ইমেইল না পেলে স্প্যাম বা জাংক ফোল্ডার দেখুন।", en: "Check your spam or junk folder if you don't see the email." },
                { bn: "লিংকটি ২৪ ঘণ্টার মধ্যে মেয়াদোত্তীর্ণ হয়ে যাবে।", en: "The link expires in 24 hours." },
                { bn: "শুধুমাত্র সর্বশেষ পাঠানো লিংকটি বৈধ।", en: "Only the most recently sent link is valid." },
              ].map((tip) => (
                <div key={tip.bn} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e60000]" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[#25282b]">{tip.bn}</p>
                    <p className="text-[11px] text-[#7e7e7e]">{tip.en}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold text-[#7e7e7e]">ইমেইল পাননি? (Didn&apos;t receive it?)</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Resend form */}
            <ResendForm prefillEmail={pendingEmail} />

            <p className="mt-6 text-center text-xs text-[#7e7e7e]">
              ইতোমধ্যে যাচাই হয়েছে?{" "}
              <a href="/login" className="font-semibold text-[#e60000] hover:underline">
                লগইন করুন
              </a>
              <span className="ml-1 text-[#7e7e7e]">(Already verified? Sign in)</span>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
