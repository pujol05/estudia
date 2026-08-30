"use client";

import { SyntheticEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

import styles from "./AuthForm.module.css";

type Props = {
  token: string;
  hasInvalidToken: boolean;
};

export default function ResetPasswordForm({ token, hasInvalidToken }: Props) {
  const t = useTranslations("Auth.resetPassword");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        setError(t("resetError"));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t("resetError"));
    } finally {
      setIsLoading(false);
    }
  }

  if (hasInvalidToken || !token) {
    return (
      <section className={styles.auth}>
        <div className={styles.card}>
          <h1>{t("invalidTitle")}</h1>
          <div className={styles.result}>
            <p className={styles.error} role="alert">{t("invalidText")}</p>
            <Link href="/forgot-password">{t("requestAgain")}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.auth}>
      <div className={styles.card}>
        <h1>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>

        {success ? (
          <div className={styles.result}>
            <p className={styles.success} role="status">{t("success")}</p>
            <Link href="/login">{t("login")}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="reset-password">{t("password")}</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="reset-password-confirmation">{t("confirmPassword")}</label>
              <input
                id="reset-password-confirmation"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button type="submit" className={styles.submit} disabled={isLoading}>
              {isLoading ? t("loading") : t("submit")}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
