import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./page.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });

  return (
    <article className={styles.page}>
      <header className={styles.heading}>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <span>{t("updated")}</span>
      </header>

      <div className={styles.content}>
        <section>
          <h2>{t("acceptanceTitle")}</h2>
          <p>{t("acceptanceText")}</p>
        </section>

        <section>
          <h2>{t("serviceTitle")}</h2>
          <p>{t("serviceText")}</p>
        </section>

        <section>
          <h2>{t("accountTitle")}</h2>
          <p>{t("accountText")}</p>
        </section>

        <section>
          <h2>{t("acceptableUseTitle")}</h2>
          <p>{t("acceptableUseText")}</p>
        </section>

        <section>
          <h2>{t("contentTitle")}</h2>
          <p>{t("contentText")}</p>
        </section>

        <section>
          <h2>{t("availabilityTitle")}</h2>
          <p>{t("availabilityText")}</p>
        </section>

        <section>
          <h2>{t("liabilityTitle")}</h2>
          <p>{t("liabilityText")}</p>
        </section>

        <section>
          <h2>{t("suspensionTitle")}</h2>
          <p>{t("suspensionText")}</p>
        </section>

        <section>
          <h2>{t("changesTitle")}</h2>
          <p>{t("changesText")}</p>
        </section>

        <section>
          <h2>{t("lawTitle")}</h2>
          <p>{t("lawText")}</p>
        </section>

        <section>
          <h2>{t("contactTitle")}</h2>
          <p>{t("contactText")}</p>
          <Link href="/contact">{t("contactLink")}</Link>
        </section>
      </div>
    </article>
  );
}
