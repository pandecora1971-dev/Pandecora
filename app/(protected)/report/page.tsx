import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";

// Code-split the report form so its large JS chunk is not included in the
// initial page bundle. Next.js still SSRs the skeleton, then swaps in the
// real form once the chunk loads on the client.
const ReportForm = dynamic(
  () => import("@/components/forms/report-form").then((m) => m.ReportForm),
  {
    loading: () => (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-48 rounded-2xl bg-gray-200" />
        ))}
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: "অভিযোগ রিপোর্ট জমা দিন — Pandecora",
};

export default function ReportPage() {
  return (
    <>
      <Header />

      {/* Dark hero band */}
      <div className="bg-[#25282b] px-6 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">
            গোপনীয় (Confidential)
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">
            অভিযোগ রিপোর্ট জমা দিন
          </h1>
          <p className="mt-1 text-xs font-light text-white/40">Submit Incident Report</p>
          <p className="mt-2 text-sm font-light text-white/55">
            সকল তথ্য সুরক্ষিতভাবে এনক্রিপ্ট করে সংরক্ষণ করা হয়।
            শুধুমাত্র অনুমোদিত পর্যালোচকরা এটি দেখতে পারবেন।
          </p>

          {/* 3-step guide */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-0">
            {/* Step 1 */}
            <div className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e60000] text-sm font-black text-white">
                ১
              </span>
              <div>
                <p className="text-sm font-bold text-white">
                  সমস্যার বিবরণ ও প্রমাণ
                </p>
                <p className="mt-0.5 text-xs text-white/45">
                  আপনার সমস্যা কী, বিস্তারিত লিখুন এবং ছবি, ভিডিও বা লিঙ্ক আকারে প্রমাণ যোগ করুন।
                </p>
                <p className="mt-0.5 text-[11px] text-white/30">
                  What happened &amp; your evidence
                </p>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden sm:flex sm:w-6 sm:shrink-0 sm:items-center sm:justify-center">
              <div className="h-px w-full bg-white/15" />
            </div>

            {/* Step 2 */}
            <div className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e60000] text-sm font-black text-white">
                ২
              </span>
              <div>
                <p className="text-sm font-bold text-white">
                  অভিযুক্তের তথ্য
                </p>
                <p className="mt-0.5 text-xs text-white/45">
                  যে ব্যক্তির বিরুদ্ধে অভিযোগ, তার নাম, পদবি ও সংশ্লিষ্ট প্রমাণ যোগ করুন।
                </p>
                <p className="mt-0.5 text-[11px] text-white/30">
                  Who is accused &amp; evidence against them
                </p>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden sm:flex sm:w-6 sm:shrink-0 sm:items-center sm:justify-center">
              <div className="h-px w-full bg-white/15" />
            </div>

            {/* Step 3 */}
            <div className="flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-black text-white/60">
                ৩
              </span>
              <div>
                <p className="text-sm font-bold text-white/70">
                  অন্য সংশ্লিষ্ট ব্যক্তি{" "}
                  <span className="text-xs font-normal text-white/35">(ঐচ্ছিক)</span>
                </p>
                <p className="mt-0.5 text-xs text-white/35">
                  ঘটনায় আরও কেউ জড়িত থাকলে তাদের তথ্য আলাদাভাবে যোগ করুন।
                </p>
                <p className="mt-0.5 text-[11px] text-white/25">
                  Any other related people — optional
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <ReportForm />
        </div>
      </main>
    </>
  );
}
