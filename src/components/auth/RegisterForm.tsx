"use client";

import { SyntheticEvent, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import TurnstileWidget from "@/components/security/TurnstileWidget";
import { authClient } from "@/lib/auth-client";
import { Link } from "@/i18n/navigation";

import styles from "./AuthForm.module.css";

export default function RegisterForm() {
  const t = useTranslations("Auth.register");
  const locale = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  //quan luser escriu canvia de "" a name amb setName("input")
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Set once the account exists. Sign-up never returns a session while
  // requireEmailVerification is on, so the form stays on this screen instead
  // of redirecting to a page the user is still logged out of.
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  function verificationCallbackURL() {
    return `${window.location.origin}/${locale}/verify-email`;
  }

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

    if (!turnstileToken) {
      setError(t("verificationRequired"));
      return;
    }

    if (!agreedToTerms) {
      setError(t("agreementRequired"));
      return;
    }

    setIsLoading(true);

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: verificationCallbackURL(),
      fetchOptions: {
        headers: {
          "x-turnstile-token": turnstileToken,
        },
      },
    });

    if (error) {
      setError(t("registerError"));
      resetTurnstile();
      setIsLoading(false);
      return;
    }

    setPendingEmail(email);
    setPassword("");
    setConfirmPassword("");
    resetTurnstile();
    setIsLoading(false);
  }

  async function handleResend() {
    if (!turnstileToken) {
      setError(t("verificationRequired"));
      return;
    }

    setError("");
    setResendStatus("sending");

    const { error } = await authClient.sendVerificationEmail({
      email: pendingEmail,
      callbackURL: verificationCallbackURL(),
      fetchOptions: {
        headers: {
          "x-turnstile-token": turnstileToken,
        },
      },
    });

    resetTurnstile();
    setResendStatus(error ? "error" : "sent");
  }

  if (pendingEmail) {
    return (
      <section className={styles.auth}>
        <div className={styles.card}>
          <h1>{t("checkEmailTitle")}</h1>

          <p className={styles.subtitle}>
            {t("checkEmailText", { email: pendingEmail })}
          </p>

          <div className={styles.result}>
            {siteKey ? (
              <TurnstileWidget
                key={turnstileKey}
                siteKey={siteKey}
                locale={locale}
                action="email-verification-request"
                onTokenChange={handleTurnstileToken}
                onError={handleTurnstileError}
              />
            ) : (
              <p className={styles.error}>{t("verificationUnavailable")}</p>
            )}

            {resendStatus === "sent" && (
              <p className={styles.success} role="status">{t("resendSuccess")}</p>
            )}

            {resendStatus === "error" && (
              <p className={styles.error} role="alert">{t("resendError")}</p>
            )}

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button
              type="button"
              className={styles.submit}
              onClick={handleResend}
              disabled={resendStatus === "sending" || !turnstileToken}
            >
              {resendStatus === "sending" ? t("resending") : t("resend")}
            </button>
          </div>

          <p className={styles.switch}>
            <Link href="/login">{t("login")}</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.auth}>
      <div className={styles.card}>
        <h1>{t("title")}</h1>

        <p className={styles.subtitle}>
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="name">
              {t("name")}
            </label>

            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">
              {t("email")}
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">
              {t("password")}
            </label>

            <input
              id="password"
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
            <label htmlFor="confirmPassword">
              {t("confirmPassword")}
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>

          {siteKey ? (
            <TurnstileWidget
              key={turnstileKey}
              siteKey={siteKey}
              locale={locale}
              action="register"
              onTokenChange={handleTurnstileToken}
              onError={handleTurnstileError}
            />
          ) : (
            <p className={styles.error}>{t("verificationUnavailable")}</p>
          )}

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <label className={styles.consentField}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(event) => setAgreedToTerms(event.target.checked)}
              required
            />
            <span>
              {t("agreeBefore")} <Link href="/privacy">{t("privacyLink")}</Link>{" "}
              {t("agreeMiddle")} <Link href="/terms">{t("termsLink")}</Link>
              {t("agreeEnd")}
            </span>
          </label>

          <button
            type="submit"
            className={styles.submit}
            disabled={isLoading || !turnstileToken || !agreedToTerms}
          >
            {isLoading ? t("loading") : t("submit")}
          </button>
        </form>

        <p className={styles.switch}>
          {t("alreadyAccount")}{" "}
          <Link href="/login">
            {t("login")}
          </Link>
        </p>
      </div>
    </section>
  );
}
