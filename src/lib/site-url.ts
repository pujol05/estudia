// Falls back to the real production host so robots.txt, the sitemap and
// absolute metadata URLs are always well-formed — unlike the CANONICAL_HOST
// redirect in proxy.ts, these must never resolve to a *.vercel.app preview
// origin or silently no-op when the env var is unset.
export const siteUrl = `https://${process.env.CANONICAL_HOST?.trim() || "www.estudianow.com"}`;
