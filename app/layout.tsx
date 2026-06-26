import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// display:"swap" prevents invisible text during font load (eliminates FOIT,
// improves LCP score on slow connections).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // mono font only used in code/ID blocks — no critical-path penalty
});

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
