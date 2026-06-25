"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

const SUBJECTS = [
  "General Enquiry",
  "Technical Support",
  "Account Issue",
  "Report a Bug",
  "Partnership / Institutional Access",
  "Other",
] as const;

const inputCn = (hasError: boolean) =>
  [
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#25282b]",
    "placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2",
    hasError
      ? "border-[#e60000] focus:border-[#e60000] focus:ring-[#e60000]/15"
      : "border-gray-200 focus:border-[#e60000] focus:ring-[#e60000]/15",
  ].join(" ");

export function ContactForm() {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim())           e.name    = "Name is required.";
    if (!email.trim())          e.email   = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                                e.email   = "Enter a valid email address.";
    if (!subject)               e.subject = "Please select a subject.";
    if (!message.trim())        e.message = "Message is required.";
    else if (message.length < 20)
                                e.message = "Message must be at least 20 characters.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    // Simulate send (replace with real API call when ready)
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-black text-[#25282b]">Message sent!</h3>
          <p className="mt-2 text-sm text-[#7e7e7e]">
            We will get back to you at <strong>{email}</strong> as soon as possible.
          </p>
        </div>
        <button
          onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage(""); }}
          className="rounded-full border border-gray-200 px-6 py-2.5 text-sm font-medium text-[#25282b] hover:bg-gray-50 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Name + Email */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="cf-name" className="block text-sm font-semibold text-[#25282b]">
            Full Name <span className="text-[#e60000]">*</span>
          </label>
          <input
            id="cf-name" type="text" value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            placeholder="Your full name"
            className={inputCn(!!errors.name)}
          />
          {errors.name && <p className="text-xs text-[#e60000]">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cf-email" className="block text-sm font-semibold text-[#25282b]">
            Email Address <span className="text-[#e60000]">*</span>
          </label>
          <input
            id="cf-email" type="email" value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
            placeholder="you@example.com"
            className={inputCn(!!errors.email)}
          />
          {errors.email && <p className="text-xs text-[#e60000]">{errors.email}</p>}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <label htmlFor="cf-subject" className="block text-sm font-semibold text-[#25282b]">
          Subject <span className="text-[#e60000]">*</span>
        </label>
        <select
          id="cf-subject" value={subject}
          onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: "" })); }}
          className={inputCn(!!errors.subject)}
        >
          <option value="">Select a subject…</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.subject && <p className="text-xs text-[#e60000]">{errors.subject}</p>}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <label htmlFor="cf-message" className="block text-sm font-semibold text-[#25282b]">
          Message <span className="text-[#e60000]">*</span>
        </label>
        <textarea
          id="cf-message" rows={6} value={message}
          onChange={(e) => { setMessage(e.target.value); setErrors((p) => ({ ...p, message: "" })); }}
          placeholder="Describe your question or issue in detail…"
          className={`${inputCn(!!errors.message)} resize-y`}
        />
        <div className="flex items-center justify-between">
          {errors.message
            ? <p className="text-xs text-[#e60000]">{errors.message}</p>
            : <span />
          }
          <p className={`text-xs ${message.length > 1000 ? "text-[#e60000]" : "text-[#7e7e7e]"}`}>
            {message.length} / 1000
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#e60000] px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#cc0000] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Sending…
          </span>
        ) : (
          <>
            Send Message
            <Send size={14} />
          </>
        )}
      </button>
    </form>
  );
}
