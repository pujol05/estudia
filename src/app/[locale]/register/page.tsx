import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import RegisterForm from "@/components/auth/RegisterForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.register" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
