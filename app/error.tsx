"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // error.digest is a Next.js server-side error ID — safe to log client-side
    // (it's a hash, not the actual error). Full details are in server logs.
    if (process.env.NODE_ENV === "development") {
      console.error("[error boundary]", error.digest ?? "(no digest)", error.message);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle size={26} className="text-[#e60000]" />
        </div>
        <h1 className="text-xl font-black text-[#25282b]">Something went wrong</h1>
        <p className="mt-2 text-sm text-[#7e7e7e]">
          An unexpected error occurred. Our team has been notified. Please try again.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-[#e60000] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#cc0000]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
