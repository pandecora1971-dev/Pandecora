import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#25282b]">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">

        {/* Main row */}
        <div className="flex flex-col items-center justify-between gap-4 py-10 sm:flex-row">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} Pandecora. All rights reserved.
          </p>
          <nav className="flex items-center gap-6">
            <Link
              href="/contact"
              className="text-xs text-white/40 transition-colors hover:text-white/70"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Hairline + tag */}
        <div className="border-t border-white/10 py-4 text-center">
          <p className="text-[11px] tracking-widest text-white/25 uppercase">
            End-to-End Encrypted
          </p>
        </div>

      </div>
    </footer>
  );
}
