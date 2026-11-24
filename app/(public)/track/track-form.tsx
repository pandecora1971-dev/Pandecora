"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { trackReport, type TrackResult } from "./actions";

const STATUS: Record<string, { bn: string; en: string; cn: string }> = {
  PENDING:      { bn: "গৃহীত — পর্যালোচনার অপেক্ষায়", en: "Received, awaiting review", cn: "bg-yellow-100 text-yellow-800" },
  UNDER_REVIEW: { bn: "পর্যালোচনা চলছে",              en: "Under review",              cn: "bg-blue-100 text-blue-800" },
  RESOLVED:     { bn: "সমাধান হয়েছে",                 en: "Resolved",                  cn: "bg-green-100 text-green-800" },
  DISMISSED:    { bn: "বাতিল করা হয়েছে",               en: "Dismissed",                 cn: "bg-gray-100 text-gray-700" },
};

const CATEGORY_BN: Record<string, string> = {
  HARASSMENT_BULLYING:          "হয়রানি / বুলিং",
  BLACKMAIL_THREATS:            "ব্ল্যাকমেইল / হুমকি",
  CORRUPTION_BRIBERY_EXTORTION: "দুর্নীতি / ঘুষ / চাঁদাবাজি",
  DISCRIMINATION_BIAS:          "বৈষম্য",
  ACADEMIC_MALPRACTICE:         "একাডেমিক অসদাচরণ",
  EXPULSION_DISMISSAL:          "বহিষ্কার / অব্যাহতি",
  SUSPENSION_RELIEF:            "সাময়িক বরখাস্ত",
  THEFT_PROPERTY_DAMAGE:        "চুরি / সম্পদের ক্ষতি",
  OTHER_CRIME_POLICY_VIOLATION: "অন্যান্য",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function TrackForm() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => setResult(await trackReport(code)));
  }

  const ok = result?.success ? result : null;
  const st = ok ? (STATUS[ok.status] ?? { bn: ok.status, en: ok.status, cn: "bg-gray-100 text-gray-700" }) : null;

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3">
        <label htmlFor="code" className="block text-sm font-semibold text-[#25282b]">
          ট্র্যাকিং কোড <span className="text-xs font-normal text-[#7e7e7e]">(Tracking code)</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PD-XXXXX-XXXXX" autoComplete="off" spellCheck={false} maxLength={20}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm tracking-widest text-[#25282b] outline-none focus:border-[#e60000] focus:ring-2 focus:ring-[#e60000]/15"
          />
          <button type="submit" disabled={isPending || !code.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e60000] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#cc0000] disabled:opacity-50">
            <Search size={15} />
            {isPending ? "খোঁজা হচ্ছে…" : "খুঁজুন"}
          </button>
        </div>
        {result && !result.success && (
          <p role="alert" className="text-sm text-[#e60000]">{result.error}</p>
        )}
      </form>

      {ok && st && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${st.cn}`}>{st.bn}</span>
          <p className="-mt-2 text-xs text-[#7e7e7e]">{st.en}</p>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-[#7e7e7e]">বিষয়</dt><dd className="font-semibold text-[#25282b]">{CATEGORY_BN[ok.category] ?? ok.category}</dd></div>
            <div><dt className="text-xs text-[#7e7e7e]">জরুরী স্তর</dt><dd className="font-semibold text-[#25282b]">{ok.urgencyLevel}</dd></div>
            <div><dt className="text-xs text-[#7e7e7e]">জমা দেওয়া হয়েছে</dt><dd className="text-[#25282b]">{fmt(ok.createdAt)}</dd></div>
            <div><dt className="text-xs text-[#7e7e7e]">সর্বশেষ আপডেট</dt><dd className="text-[#25282b]">{fmt(ok.updatedAt)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
