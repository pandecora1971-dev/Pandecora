"use client";

import { useState, useTransition } from "react";
import * as Toast from "@radix-ui/react-toast";
import { CheckCircle2, X, Send, User, Mail, MessageSquare } from "lucide-react";
import { sendContactMessage } from "./actions";

const inputCn = (hasError: boolean) =>
  [
    "w-full rounded-xl border bg-gray-50 py-3 text-sm text-[#25282b]",
    "placeholder:text-gray-400 transition-all",
    "focus:bg-white focus:outline-none focus:ring-2",
    hasError
      ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15"
      : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15",
  ].join(" ");

export function ContactForm() {
  const [isPending, startTransition] = useTransition();

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [toastOpen,   setToastOpen]   = useState(false);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await sendContactMessage({ name, email, message });

      if (!result.success) {
        setGlobalError(result.error);
        if ("fieldErrors" in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      setName("");
      setEmail("");
      setMessage("");
      setToastOpen(true);
    });
  }

  return (
    <Toast.Provider swipeDirection="right" duration={5000}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* Global error */}
        {globalError && (
          <div role="alert" className="rounded-xl border border-[#e60000]/20 bg-[#e60000]/5 px-4 py-3 text-sm text-[#e60000]">
            {globalError}
          </div>
        )}

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="c-name" className="block text-sm font-semibold text-[#25282b]">
            পুরো নাম <span className="text-xs font-normal text-[#7e7e7e]">(Name)</span>
            <span className="ml-0.5 text-[#e60000]">*</span>
          </label>
          <div className="relative">
            <User size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="c-name"
              type="text"
              autoComplete="name"
              placeholder="আপনার পুরো নাম লিখুন"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
              className={`${inputCn(!!fieldErrors.name)} pl-11`}
              disabled={isPending}
            />
          </div>
          {fieldErrors.name && (
            <p role="alert" className="text-xs text-[#e60000]">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="c-email" className="block text-sm font-semibold text-[#25282b]">
            ইমেইল ঠিকানা <span className="text-xs font-normal text-[#7e7e7e]">(Email)</span>
            <span className="ml-0.5 text-[#e60000]">*</span>
          </label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="c-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
              className={`${inputCn(!!fieldErrors.email)} pl-11`}
              disabled={isPending}
            />
          </div>
          {fieldErrors.email && (
            <p role="alert" className="text-xs text-[#e60000]">{fieldErrors.email}</p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label htmlFor="c-message" className="block text-sm font-semibold text-[#25282b]">
            বার্তা <span className="text-xs font-normal text-[#7e7e7e]">(Message)</span>
            <span className="ml-0.5 text-[#e60000]">*</span>
          </label>
          <div className="relative">
            <MessageSquare size={15} className="pointer-events-none absolute left-4 top-4 text-gray-400" />
            <textarea
              id="c-message"
              rows={6}
              placeholder="আমরা কীভাবে সাহায্য করতে পারি?"
              value={message}
              onChange={(e) => { setMessage(e.target.value); clearFieldError("message"); }}
              className={`${inputCn(!!fieldErrors.message)} resize-y pl-11`}
              disabled={isPending}
            />
          </div>
          <div className="flex items-start justify-between gap-2">
            <span>
              {fieldErrors.message && (
                <p role="alert" className="text-xs text-[#e60000]">{fieldErrors.message}</p>
              )}
            </span>
            <p className={`shrink-0 text-xs ${message.length > 4500 ? "text-[#e60000]" : "text-[#7e7e7e]"}`}>
              {message.length} / 5000
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e60000] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#cc0000] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e60000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              পাঠানো হচ্ছে…
            </>
          ) : (
            <>
              <Send size={15} />
              বার্তা পাঠান
            </>
          )}
        </button>
      </form>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        className="flex items-start gap-3 rounded-2xl border border-green-200 bg-white px-5 py-4 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-right-full"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="flex-1 min-w-0">
          <Toast.Title className="text-sm font-bold text-[#25282b]">
            বার্তা পাঠানো হয়েছে!
          </Toast.Title>
          <Toast.Description className="mt-0.5 text-xs text-[#7e7e7e]">
            আমরা যত দ্রুত সম্ভব উত্তর দেব।
          </Toast.Description>
        </div>
        <Toast.Close asChild>
          <button
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-gray-400 hover:text-[#25282b] transition-colors"
          >
            <X size={14} />
          </button>
        </Toast.Close>
      </Toast.Root>

      <Toast.Viewport className="fixed bottom-6 right-6 z-[100] w-full max-w-sm" />
    </Toast.Provider>
  );
}
