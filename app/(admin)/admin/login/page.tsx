import type { Metadata } from "next";
import LoginForm from "./_form";

export const metadata: Metadata = {
  title: "Admin Login — Pandecora",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#25282b] p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e60000]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-6 w-6"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white">
              ADMIN PANEL
            </p>
            <p className="text-[11px] text-white/40">Pandecora</p>
          </div>
        </div>

        {/* Center content */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#e60000]">
              ADMIN ACCESS
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white">
              Restricted Area
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/60">
              Authorised personnel only. All access is monitored and logged for
              security compliance.
            </p>
          </div>

          {/* Security notice */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e60000]/20">
                <div className="h-2 w-2 rounded-full bg-[#e60000]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Security Notice</p>
                <p className="text-xs leading-relaxed text-white/50">
                  Unauthorised access attempts are recorded and may be referred to
                  appropriate authorities. Use of this system constitutes consent to
                  monitoring.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()} Pandecora. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e60000]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#25282b]">
            ADMIN PANEL
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#25282b]">Sign in</h2>
            <p className="mt-1.5 text-sm text-[#7e7e7e]">
              Restricted area — authorised personnel only.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
