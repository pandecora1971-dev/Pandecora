import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "রিপোর্টের অবস্থা দেখুন — Pandecora",
};

export default function TrackPage() {
  return (
    <>
      <Header />
      <div className="bg-[#25282b] px-6 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">Track</p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">রিপোর্টের অবস্থা দেখুন</h1>
          <p className="mt-1 text-xs font-light text-white/40">Check your report status</p>
          <p className="mt-2 text-sm font-light text-white/55">
            রিপোর্ট জমা দেওয়ার সময় পাওয়া ট্র্যাকিং কোডটি লিখুন। শুধু অবস্থা দেখানো হয় — রিপোর্টের বিষয়বস্তু নয়।
          </p>
        </div>
      </div>
      <main className="bg-gray-50 min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
          <TrackForm />
          <p className="text-center text-xs text-[#7e7e7e]">
            নতুন রিপোর্ট করতে চান?{" "}
            <Link href="/report" className="font-semibold text-[#e60000] hover:underline">লগইন ছাড়াই রিপোর্ট করুন</Link>
          </p>
        </div>
      </main>
    </>
  );
}
