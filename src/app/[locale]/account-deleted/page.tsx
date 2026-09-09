import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "@/components/auth/AuthForm.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountDeleted" });

  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

// Landed on straight from the confirmation email link (better-auth's
// /delete-user/callback), by which point the account is already gone —
// there is nothing left to check or personalize here.
export default async function AccountDeletedPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountDeleted" });

  return (
    <section className={styles.auth}>
      <div className={styles.card}>
        <h1>{t("title")}</h1>
        <p className={styles.subtitle}>{t("text")}</p>

        <div className={styles.result}>
          <Link href="/">{t("backHome")}</Link>
        </div>
      </div>
    </section>
  );
}
