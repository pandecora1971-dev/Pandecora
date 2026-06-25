"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { resendVerification } from "../actions";

export function ResendForm({ prefillEmail }: { prefillEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [email,   setEmail]   = useState(prefillEmail);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await resendVerification(fd);
      if (!result.success) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
        <CheckCircle2 size={18} className="shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">ইমেইল পাঠানো হয়েছে!</p>
          <p className="text-[11px] text-green-700">Email sent!</p>
          <p className="mt-1 text-xs text-green-700">
            ঠিকানাটি নিবন্ধিত ও অযাচাইকৃত হলে নতুন লিংক পাঠানো হবে।
          </p>
          <p className="text-[11px] text-green-600">
            If that address is registered and unverified, a new link is on its way.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-[#e60000]/5 px-3 py-2 text-xs text-[#e60000] border border-[#e60000]/20">
          {error}
        </p>
      )}
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="আপনার ইমেইল ঠিকানা লিখুন (Enter your email address)"
        required
        disabled={isPending}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#25282b] placeholder:text-gray-400 transition-all focus:border-[#e60000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e60000]/15 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25282b] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1a1c1e] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            পাঠানো হচ্ছে… (Sending…)
          </>
        ) : (
          <>
            <Send size={14} />
            যাচাইকরণ ইমেইল পুনরায় পাঠান
          </>
        )}
      </button>
    </form>
  );
}
