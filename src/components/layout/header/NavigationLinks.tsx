"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";

import styles from "./Header.module.css";

const LINKS = [
  { href: "/", key: "home" },
  { href: "/subjects", key: "subjects" },
  { href: "/tasks", key: "tasks" },
  { href: "/exams", key: "exams" },
  { href: "/grades", key: "grades" },
  { href: "/events", key: "events" },
] as const;

export default function NavigationLinks() {
  const t = useTranslations("Navigation");
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label={t("privateNavigation")}>
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? styles.activeLink : undefined}
            aria-current={active ? "page" : undefined}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
