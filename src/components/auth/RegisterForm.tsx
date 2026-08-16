"use client";

import { SyntheticEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";

import styles from "./AuthForm.module.css";

export default function RegisterForm() {
  const t = useTranslations("Auth.register");
  const router = useRouter();

  //quan luser escriu canvia de "" a name amb setName("input")
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(t("registerError"));
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
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
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className={styles.error}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={isLoading}
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