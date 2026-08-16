// function Header() is a component . Export default is used so others files can import this component.
// import Header from "@/components/layout/Header/Header";

import { headers } from "next/headers"
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";

import styles from "./Header.module.css";

import UserMenu from "./UserMenu";
import LanguageSelector from "./languageSelector";

// posem sytles.header , nav ...pq tenim un fitxer css 
export default async function Header() {

  const t = await getTranslations("Navigation");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    Estudia
                </Link>
                <nav className={styles.navigation}>
                    <Link href="/">{t("home")}</Link>
                    <Link href="/subjects">{t("subjects")}</Link>
                    <Link href="/tasks">{t("tasks")}</Link>
                    <Link href="/exams">{t("exams")}</Link>
                    <Link href="/grades">{t("grades")}</Link>
                </nav>
                <div className={styles.actions}>
                    <LanguageSelector />
                    {session ? (
                        <UserMenu
                            name={session.user.name}
                            image={session.user.image ?? null}
                        />
                    ) : (
                        <div className={styles.authLinks}>
                            <Link href="/login">
                                {t("login")}
                            </Link>

                            <Link href="/register" className={styles.registerButton}>
                                {t("register")}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );  
}