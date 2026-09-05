import "server-only";

export type Locale = "ca" | "es" | "en";

export function getRequestLocale(request: Request | undefined): Locale {
  const referer = request?.headers.get("referer");

  if (!referer) {
    return "ca";
  }

  try {
    const locale = new URL(referer).pathname.split("/")[1];
    return locale === "es" || locale === "en" ? locale : "ca";
  } catch {
    return "ca";
  }
}
