"use client";

import { SyntheticEvent, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import TurnstileWidget from "@/components/security/TurnstileWidget";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

import styles from "./AuthForm.module.css";

export default function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const locale = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);

    if (token) {
      setError("");
    }
  }, []);

  const handleTurnstileError = useCallback(() => {
    setError(t("verificationError"));
  }, [t]);

  function resetTurnstile() {
    setTurnstileToken("");
    setTurnstileKey((currentKey) => currentKey + 1);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!turnstileToken) {
      setError(t("verificationRequired"));
      return;
    }

    setIsLoading(true);

    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/${locale}/reset-password`,
        fetchOptions: {
          headers: {
            "x-turnstile-token": turnstileToken,
          },
        },
      });

      if (requestError) {
        setError(t("requestError"));
        resetTurnstile();
        return;
      }

      setSuccess(true);
      resetTurnstile();
    } catch {
      setError(t("requestError"));
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.auth}>
      <div className={styles.card}>
        <h1>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        {success ? (
          <div className={styles.result}>
            <p className={styles.success} role="status">{t("success")}</p>
            <Link href="/login">{t("backToLogin")}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="forgot-password-email">{t("email")}</label>
              <input
                id="forgot-password-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                autoComplete="email"
              />
            </div>

            {siteKey ? (
              <TurnstileWidget
                key={turnstileKey}
                siteKey={siteKey}
                locale={locale}
                action="password-reset-request"
                onTokenChange={handleTurnstileToken}
                onError={handleTurnstileError}
              />
            ) : (
              <p className={styles.error}>{t("verificationUnavailable")}</p>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button
              type="submit"
              className={styles.submit}
              disabled={isLoading || !turnstileToken}
            >
              {isLoading ? t("loading") : t("submit")}
            </button>
          </form>
        )}

        {!success && (
          <p className={styles.switch}>
            <Link href="/login">{t("backToLogin")}</Link>
          </p>
        )}
      </div>
    </section>
  );
}
