import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

import styles from "./Footer.module.css";

export default function Footer() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.inner}>
          <p>© {currentYear} Estudia. {t("rights")}</p>
          <nav aria-label={t("legalNavigation")}>
            <ul className={styles.links}>
              <li><Link href="/contact">{t("contact")}</Link></li>
              <li><Link href="/privacy">{t("privacy")}</Link></li>
              <li><Link href="/terms">{t("terms")}</Link></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
