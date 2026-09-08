import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import "./globals.css";

import styles from "./not-found.module.css";

// This file sits outside src/app/[locale], so it has none of next-intl's
// request config to read a locale from — it is Next's global fallback for
// any URL that doesn't match a route at all (see src/app/[locale]/not-found.tsx
// for the boundary that only fires from an explicit notFound() call within a
// matched route). The locale is recovered from the x-pathname header proxy.ts
// sets on every request, since that's the only place a first path segment is
// still available this far outside the locale-aware tree.
const copy = {
  ca: {
    title: "Pàgina no trobada",
    text: "La pàgina que busques no existeix o s'ha mogut.",
    backHome: "Tornar a l'inici",
  },
  es: {
    title: "Página no encontrada",
    text: "La página que buscas no existe o se ha movido.",
    backHome: "Volver al inicio",
  },
  en: {
    title: "Page not found",
    text: "The page you are looking for does not exist or has moved.",
    backHome: "Back to home",
  },
} as const;

type Locale = keyof typeof copy;

const locales = Object.keys(copy) as Locale[];

function detectLocale(pathname: string | null): Locale {
  const firstSegment = pathname?.split("/")[1];
  return locales.find((locale) => locale === firstSegment) ?? "ca";
}

export const metadata: Metadata = {
  title: "Estudia",
  robots: { index: false, follow: false },
};

export default async function RootNotFound() {
  const pathname = (await headers()).get("x-pathname");
  const locale = detectLocale(pathname);
  const t = copy[locale];
  const homeHref = locale === "ca" ? "/" : `/${locale}`;

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <Link href={homeHref} className={styles.brand} aria-label="Estudia">
          <span className={styles.mark} aria-hidden="true">
            <Image src="/logo_estudia.png" alt="" fill sizes="32px" />
          </span>
          <span className={styles.name}>Estudia</span>
        </Link>

        <p className={styles.code}>404</p>
        <h1>{t.title}</h1>
        <p>{t.text}</p>

        <div className={styles.actions}>
          <Link href={homeHref}>{t.backHome}</Link>
        </div>
      </div>
    </section>
  );
}
