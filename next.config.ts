import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output:           "standalone",
  poweredByHeader:  false,
  compress:         true,

  serverExternalPackages: ["argon2", "@prisma/client"],

  async headers() {
    return [
      // Declare no-AI crawl consent on every response via HTTP header.
      // This works alongside robots.txt for crawlers that read headers.
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
      // Hardened headers for the encrypted upload directory.
      {
        source: "/uploads/:path*",
        headers: [
          { key: "X-Robots-Tag",        value: "noindex, nofollow, noai, noimageai" },
          { key: "Cache-Control",        value: "no-store" },
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
    ];
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any, { isServer }: { isServer: boolean }) {
    if (!isServer) {
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
