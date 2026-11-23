import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// display:"swap" prevents invisible text during font load (eliminates FOIT,
// improves LCP score on slow connections).
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-sans",
  display: "swap",
  preload: true,
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false, // mono font only used in code/ID blocks — no critical-path penalty
});

// CSP uses a fresh nonce for each request, including Next.js inline scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Pandecora",
    template: "%s | Pandecora",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  description:
    "Securely report and manage incidents with end-to-end encryption. " +
    "All submissions are confidential and accessible only to authorised reviewers.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  other: {
    "ai-content-opt-out": "1",
    "robots-noai": "noai",
  },
};

// Separate viewport export — required by Next.js 15 (metadata.viewport is
// deprecated). Sets ideal-width so mobile browsers render at device width and
// don't trigger a double-render that tanks Lighthouse mobile scores.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#25282b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
