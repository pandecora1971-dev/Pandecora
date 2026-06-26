import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  // Tree-shake large icon packages — avoids shipping unused icons to the client.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Image optimization — serve AVIF/WebP with 1-year CDN cache.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31_536_000, // 1 year in seconds
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  serverExternalPackages: ["argon2", "@prisma/client"],

  async headers() {
    return [
      // ── Immutable cache for hashed static assets (JS/CSS chunks) ──────────
      // Next.js embeds a content hash in every chunk filename, so we can cache
      // forever — a code change produces a new filename and busts the cache.
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Next.js image optimisation API ────────────────────────────────────
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, must-revalidate",
          },
        ],
      },
      // ── Public static files (favicon, robots.txt …) ───────────────────────
      {
        source: "/:file(favicon\\.svg|robots\\.txt|manifest\\.json)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // ── No-AI crawl consent header on every response ──────────────────────
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value:
              "noai, noimageai, noindex-ai, noarchive, nositelinkssearchbox",
          },
        ],
      },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (!isServer) {
      // Prevent node:crypto from being bundled into the client-side JS.
      config.resolve = {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as object),
          argon2: false,
        },
      };
    }
    return config;
  },
};

export default nextConfig;
