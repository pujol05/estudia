"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import styles from "./error.module.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPages");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <h1>{t("title")}</h1>
        <p>{t("text")}</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => reset()} className={styles.primary}>
            {t("retry")}
          </button>
          <Link href="/">{t("backHome")}</Link>
        </div>
      </div>
    </section>
  );
}
