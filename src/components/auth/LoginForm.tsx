"use client";

import { SyntheticEvent, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";

import styles from "./AuthForm.module.css";
    
export default function LoginForm() {
  const t = useTranslations("Auth.login");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
    });

    if (error) {
      setError(t("invalidCredentials"));
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
              autoComplete="current-password"
            />
          </div>

          <p className={styles.auxiliaryLink}>
            <Link href="/forgot-password">{t("forgotPassword")}</Link>
          </p>

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
          {t("noAccount")}{" "}
          <Link href="/register">
            {t("register")}
          </Link>
        </p>
      </div>
    </section>
  );
}
