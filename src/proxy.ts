import createMiddleware from "next-intl/middleware";
import { NextResponse, NextRequest } from "next/server";

import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// The automatic *.vercel.app URL cannot be removed from the project, so without
// this the same pages are served from two origins: that splits SEO across
// duplicates and leaves a second origin better-auth would have to trust.
// Unset (local development) or on preview deployments nothing is redirected.
const canonicalHost = process.env.CANONICAL_HOST?.trim().toLowerCase();

const isDevelopment = process.env.NODE_ENV === "development";

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  return forwardedHost?.split(",")[0]?.trim().toLowerCase() ?? null;
}

// script-src trusts only scripts carrying this request's nonce, plus anything
// those scripts go on to insert themselves (`strict-dynamic`) — which is how
// the Turnstile widget and Vercel Analytics still load without being listed
// by host. An injected `<script src="https://evil">` has neither, so the
// browser refuses to run it even though `default-src` would otherwise allow
// fetching that origin.
function buildContentSecurityPolicy(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (used by the error pages) have no nonce
    // mechanism of their own, so this directive stays host/keyword-based.
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
}

export default function proxy(request: NextRequest) {
  if (canonicalHost && process.env.VERCEL_ENV === "production") {
    const host = getRequestHost(request);

    if (host && host !== canonicalHost) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = canonicalHost;
      url.port = "";

      return NextResponse.redirect(url, 308);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);

  // Next.js reads the nonce back out of the *request's* CSP header while
  // rendering, so the header has to be set here before handing the request
  // to next-intl, not only on the response that goes to the browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // Read by the root not-found page (which sits outside next-intl's request
  // config and so has no other way to know which locale the visitor was on).
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const requestWithNonce = new NextRequest(request.nextUrl, {
    headers: requestHeaders,
    method: request.method,
  });

  const response = handleI18nRouting(requestWithNonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
