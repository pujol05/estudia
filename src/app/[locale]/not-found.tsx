import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./error.module.css";

export default function NotFound() {
  const t = useTranslations("ErrorPages");

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundText")}</p>
        <div className={styles.actions}>
          <Link href="/">{t("backHome")}</Link>
        </div>
      </div>
    </section>
  );
}
