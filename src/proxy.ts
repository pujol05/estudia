import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// The automatic *.vercel.app URL cannot be removed from the project, so without
// this the same pages are served from two origins: that splits SEO across
// duplicates and leaves a second origin better-auth would have to trust.
// Unset (local development) or on preview deployments nothing is redirected.
const canonicalHost = process.env.CANONICAL_HOST?.trim().toLowerCase();

function getRequestHost(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  return forwardedHost?.split(",")[0]?.trim().toLowerCase() ?? null;
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

  return handleI18nRouting(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
