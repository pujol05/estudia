import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ContactForm from "@/components/contact/ContactForm";

import styles from "./page.module.css";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });

  return (
    <div className={styles.page}>
      <header>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <ContactForm />
      <p className={styles.privacyNote}>{t("privacyNote")}</p>
    </div>
  );
}
