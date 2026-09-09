import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

import styles from "@/components/auth/AuthForm.module.css";

// Wrapped in React's cache() so generateMetadata and the page component,
// which both need this, only trigger one session lookup per request.
const isEmailChangeComplete = cache(async (pendingEmail: string) => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.email.toLowerCase() === pendingEmail.toLowerCase();
});

type Props = {
  params: Promise<{ locale: string }>;
  // better-auth redirects here after handling the link: unchanged on success,
  // with an `error` code when the token was invalid or had expired.
  //
  // pendingEmail marks the two email-change hops (see ProfileForm.tsx, which
  // sets it as part of the callbackURL it passes to authClient.changeEmail).
  // better-auth reuses that same callbackURL verbatim for both the old- and
  // the new-address link, so there is no signal in the URL telling them
  // apart — instead, whether the current session's email already matches
  // pendingEmail is what distinguishes "old address just confirmed" (not yet
  // matching) from "new address just confirmed, change is complete" (matches).
  searchParams: Promise<{ error?: string; pendingEmail?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { error, pendingEmail } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Auth.verifyEmail" });

  if (error) {
    return { title: t("errorTitle"), robots: { index: false, follow: false } };
  }

  if (pendingEmail) {
    const emailChangeComplete = await isEmailChangeComplete(pendingEmail);

    return {
      title: t(emailChangeComplete ? "emailChangeCompleteTitle" : "emailChangeConfirmedTitle"),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: t("successTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { error, pendingEmail } = await searchParams;
  const t = await getTranslations({ locale, namespace: "Auth.verifyEmail" });

  if (error) {
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

  if (pendingEmail) {
    const emailChangeComplete = await isEmailChangeComplete(pendingEmail);

    return (
      <section className={styles.auth}>
        <div className={styles.card}>
          <h1>{t(emailChangeComplete ? "emailChangeCompleteTitle" : "emailChangeConfirmedTitle")}</h1>
          <p className={styles.subtitle}>
            {t(emailChangeComplete ? "emailChangeCompleteText" : "emailChangeConfirmedText", { email: pendingEmail })}
          </p>

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
        <h1>{t("successTitle")}</h1>
        <p className={styles.subtitle}>{t("successText")}</p>

        <div className={styles.result}>
          <Link href="/">{t("goToApp")}</Link>
        </div>
      </div>
    </section>
  );
}
