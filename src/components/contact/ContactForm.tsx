"use client";

import { FormEvent, useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import TurnstileWidget from "./TurnstileWidget";
import styles from "./ContactForm.module.css";

export default function ContactForm() {
  const t = useTranslations("Contact");
  const locale = useLocale();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const handleTurnstileError = useCallback(() => {
    setError(t("verificationError"));
  }, [t]);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);

    if (token) {
      setError("");
    }
  }, []);

  function resetTurnstile() {
    setTurnstileToken("");
    setTurnstileKey((currentKey) => currentKey + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!turnstileToken) {
      setError(t("verificationRequired"));
      return;
    }

    setIsSending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          subject: formData.get("subject"),
          message: formData.get("message"),
          website: formData.get("website"),
          locale,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        if (result?.error === "rate_limited") {
          setError(t("rateError"));
        } else if (result?.error === "verification_failed") {
          setError(t("verificationError"));
        } else {
          setError(t("sendError"));
        }
        resetTurnstile();
        return;
      }

      form.reset();
      resetTurnstile();
      setSuccess(true);
    } catch {
      setError(t("sendError"));
      resetTurnstile();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="contact-email">{t("email")}</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-subject">{t("subject")}</label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          minLength={3}
          maxLength={120}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-message">{t("message")}</label>
        <textarea
          id="contact-message"
          name="message"
          rows={7}
          minLength={10}
          maxLength={4000}
          required
        />
        <p>{t("messageHelp")}</p>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {siteKey ? (
        <TurnstileWidget
          key={turnstileKey}
          siteKey={siteKey}
          locale={locale}
          onTokenChange={handleTurnstileToken}
          onError={handleTurnstileError}
        />
      ) : (
        <p className={styles.error} role="alert">{t("verificationUnavailable")}</p>
      )}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{t("success")}</p>}

      <button type="submit" disabled={isSending || !turnstileToken}>
        {isSending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
