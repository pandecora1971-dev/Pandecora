import Link from "next/link";
import { Shield } from "lucide-react";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, validateSession } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await validateSession(token) : null;

  return (
    <header className="bg-[#25282b]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#e60000]">
            <Shield size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white">
            Pandecora
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {/* Always-visible links */}
          <Link
            href="/#how-it-works"
            className="hidden rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white sm:block"
          >
            How it works
          </Link>
          <Link
            href="/contact"
            className="hidden rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white sm:block"
          >
            Contact
          </Link>

          <div className="mx-3 hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />

          {session ? (
            <>
              <span className="hidden max-w-[140px] truncate rounded-lg px-3 py-2 text-sm text-white/30 sm:block">
                {session.user.name}
              </span>
              <Link
                href="/report"
                className="hidden rounded-lg px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white sm:block"
              >
                My Reports
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-lg px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="ml-1 rounded-full bg-[#e60000] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#cc0000]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
