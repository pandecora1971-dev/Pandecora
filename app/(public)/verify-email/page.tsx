import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Shield, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { verifyEmail } from "./actions";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export const metadata = { title: "ইমেইল যাচাই — Pandecora" };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  // No token in URL
  if (!token) {
    return <Layout><InvalidState message="লিংকে কোনো যাচাইকরণ টোকেন পাওয়া যায়নি।" showResend /></Layout>;
  }

  const result = await verifyEmail(token);

  if (result.success) {
    return (
      <Layout>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-[#25282b]">ইমেইল যাচাই সম্পন্ন!</h1>
          <p className="text-xs text-[#7e7e7e] mt-1">Email verified!</p>
          <p className="mt-3 text-sm leading-relaxed text-[#7e7e7e]">
            আপনার অ্যাকাউন্ট এখন সক্রিয়। লগইন করুন এবং রিপোর্ট জমা দেওয়া শুরু করুন।
          </p>
          <p className="mt-1 text-xs text-[#7e7e7e]">
            Your account is now active. You can sign in and start submitting reports.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#e60000] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#cc0000]"
          >
            অ্যাকাউন্টে লগইন করুন
            <ArrowRight size={15} />
          </Link>
        </div>
      </Layout>
    );
  }

  if (result.expired) {
    return (
      <Layout>
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <Clock size={32} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-[#25282b]">লিংকের মেয়াদ শেষ</h1>
          <p className="text-xs text-[#7e7e7e] mt-1">Link expired</p>
          <p className="mt-3 text-sm leading-relaxed text-[#7e7e7e]">
            এই যাচাইকরণ লিংকটি ২৪ ঘণ্টার বেশি পুরনো। নিচে থেকে নতুন লিংক নিন।
          </p>
          <p className="mt-1 text-xs text-[#7e7e7e]">
            This verification link is more than 24 hours old. Request a new one below.
          </p>
          <Link
            href="/verify-email/pending"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#e60000] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#cc0000]"
          >
            যাচাইকরণ ইমেইল পুনরায় পাঠান
            <ArrowRight size={15} />
          </Link>
        </div>
      </Layout>
    );
  }

  return <Layout><InvalidState message={result.error} showResend /></Layout>;
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function Layout({ children }: { children: React.ReactNode }) {
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
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ─── Invalid / error state ────────────────────────────────────────────────────

function InvalidState({ message, showResend }: { message: string; showResend?: boolean }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <XCircle size={32} className="text-[#e60000]" />
      </div>
      <h1 className="text-2xl font-black text-[#25282b]">যাচাইকরণ ব্যর্থ হয়েছে</h1>
      <p className="text-xs text-[#7e7e7e] mt-1">Verification failed</p>
      <p className="mt-3 text-sm leading-relaxed text-[#7e7e7e]">{message}</p>
      {showResend && (
        <Link
          href="/verify-email/pending"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#e60000] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#cc0000]"
        >
          যাচাইকরণ ইমেইল পুনরায় পাঠান
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
