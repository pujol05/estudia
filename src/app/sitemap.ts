import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/site-url";

// Only the pages a logged-out visitor can actually reach and that are worth
// search traffic. Everything behind auth, plus the token-bearing transactional
// pages, is deliberately left out here and disallowed in src/app/robots.ts.
const publicPaths = ["", "/contact", "/privacy", "/terms", "/login", "/register", "/forgot-password"];

function localizedUrl(path: string, locale: string) {
  const suffix = path === "" ? "/" : path;
  return locale === routing.defaultLocale ? `${siteUrl}${suffix}` : `${siteUrl}/${locale}${suffix}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map((path) => ({
    url: localizedUrl(path, routing.defaultLocale),
    changeFrequency: path === "" ? "monthly" : "yearly",
    priority: path === "" ? 1 : 0.5,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, localizedUrl(path, locale)]),
      ),
    },
  }));
}
