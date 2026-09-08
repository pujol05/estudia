// contecta la configuracio de request.ts amb next.js (setup oficial del plugin)

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy is set per-request in src/proxy.ts instead, since it
// needs a fresh nonce on every response. A second, static CSP header here
// would layer on top of that one — browsers AND multiple CSP headers together,
// so the two policies would fight each other instead of one simply applying.
const securityHeaders = [
  {
    // Superseded by frame-ancestors in the proxy CSP, kept for browsers that
    // predate the frame-ancestors directive.
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
