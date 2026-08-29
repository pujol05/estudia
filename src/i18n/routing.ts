import { defineRouting } from "next-intl/routing";

// locales : idiomes disponibles per la web.
// defaultLocale : idioma per defecte de la web.
export const routing = defineRouting({
  locales: ["ca", "es", "en"],
  defaultLocale: "ca",
  localeDetection: false
});
