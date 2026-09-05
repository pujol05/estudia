import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "@/components/auth/AuthForm.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  // better-auth redirects here after handling the link: unchanged on success,
  // with an `error` code when the token was invalid or had expired.
  searchParams: Promise<{ error?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.verifyEmail" });

  return {
    title: t("successTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Auth.verifyEmail" });

  if (!error) {
    return (
      <section className={styles.auth}>
        <div className={styles.card}>
          <h1>{t("successTitle")}</h1>
          <p className={styles.subtitle}>{t("successText")}</p>

          <div className={styles.result}>
            <Link href="/">{t("goToApp")}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.auth}>
      <div className={styles.card}>
        <h1>{t("errorTitle")}</h1>
        <p className={styles.subtitle}>
          {error === "TOKEN_EXPIRED" ? t("expiredText") : t("invalidText")}
        </p>

        <div className={styles.result}>
          <Link href="/login">{t("backToLogin")}</Link>
        </div>
      </div>
    </section>
  );
}
