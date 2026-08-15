// function Header() is a component . Export default is used so others files can import this component.
// import Header from "@/components/layout/Header/Header";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import styles from "./Header.module.css";
import LanguageSelector from "./languageSelector";

// posem sytles.header , nav ...pq tenim un fitxer css 
export default function Header() {
  const t = useTranslations("Navigation");

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
                </div>
            </div>
        </header>
    );  
}