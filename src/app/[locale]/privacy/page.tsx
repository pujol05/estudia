import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./page.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return (
    <article className={styles.page}>
      <header className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <span>{t("updated")}</span>
      </header>

      <div className={styles.content}>
        <section>
          <h2>{t("controllerTitle")}</h2>
          <p>{t("controllerText")}</p>
          <Link href="/contact">{t("contactLink")}</Link>
        </section>

        <section>
          <h2>{t("dataTitle")}</h2>
          <p>{t("dataText")}</p>
          <p>{t("useText")}</p>
        </section>

        <section>
          <h2>{t("infrastructureTitle")}</h2>
          <p>{t("infrastructureText")}</p>
        </section>

        <section>
          <h2>{t("cookiesTitle")}</h2>
          <p>{t("cookiesText")}</p>
        </section>

        <section>
          <h2>{t("rightsTitle")}</h2>
          <p>{t("rightsText")}</p>
          <p>
            {t("complaintBefore")}
            <a href="https://www.aepd.es/" target="_blank" rel="noreferrer">
              {t("complaintLink")}
            </a>
            .
          </p>
        </section>

        <p className={styles.age}>{t("ageText")}</p>
      </div>
    </article>
  );
}
