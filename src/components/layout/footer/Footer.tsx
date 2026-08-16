import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import styles from "./Footer.module.css";

export default function Footer() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Navigation");

  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>

          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              Estudia
            </Link>

            <p>{t("tagline")}</p>
          </div>

          <ul className={styles.links}>
            <li>
              <Link href="/">{tNav("home")}</Link>
            </li>

            <li>
              <Link href="/subjects">{tNav("subjects")}</Link>
            </li>

            <li>
              <Link href="/tasks">{tNav("tasks")}</Link>
            </li>

            <li>
              <Link href="/exams">{tNav("exams")}</Link>
            </li>

            <li>
              <Link href="/grades">{tNav("grades")}</Link>
            </li>
          </ul>

          <ul className={styles.links}>
            <li>
              <Link href="/contact">{t("contact")}</Link>
            </li>

            <li>
              <Link href="/legal">{t("legal")}</Link>
            </li>

            <li>
              <Link href="/privacy">{t("privacy")}</Link>
            </li>

            <li>
              <Link href="/cookies">{t("cookies")}</Link>
            </li>

            <li>
              <Link href="/accessibility">{t("accessibility")}</Link>
            </li>
          </ul>

        </div>

        <div className={styles.bottom}>
          <p>
            © {currentYear} Estudia. {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}