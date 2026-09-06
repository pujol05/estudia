// contecta la configuracio de request.ts amb next.js (setup oficial del plugin)

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDevelopment = process.env.NODE_ENV === "development";

// Origins the app genuinely loads from. Anything else the browser refuses,
// which is what limits the damage if markup ever gets injected into a page.
const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' covers the hydration scripts Next.js inlines on every page.
  // React escapes rendered values, so the practical gain of a nonce here is
  // small next to the risk of silently breaking Turnstile, which cannot be
  // exercised locally. The origin allowlist below is what does the work.
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
  // next/font self-hosts Google Fonts at build time, so no external origin.
  "font-src 'self'",
  // Client-side avatar uploads talk to the Blob API on vercel.com and then PUT
  // the file straight to the store, so both origins have to be reachable.
  "connect-src 'self' https://challenges.cloudflare.com https://va.vercel-scripts.com https://vercel.com https://*.vercel-storage.com",
  // The Turnstile widget renders inside an iframe served by Cloudflare.
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    // Superseded by frame-ancestors above, kept for browsers that ignore it.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Password reset links carry their token in the URL: without this the token
    // would travel to third parties in the Referer header.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
