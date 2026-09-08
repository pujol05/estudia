import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        // Behind a login redirect for anonymous visitors anyway; excluded
        // here so crawlers don't spend budget on pages that always bounce.
        "/tasks",
        "/*/tasks",
        "/exams",
        "/*/exams",
        "/grades",
        "/*/grades",
        "/subjects",
        "/*/subjects",
        "/events",
        "/*/events",
        "/profile",
        "/*/profile",
        // Token-bearing, single-use transactional links — never worth indexing.
        "/reset-password",
        "/*/reset-password",
        "/verify-email",
        "/*/verify-email",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
