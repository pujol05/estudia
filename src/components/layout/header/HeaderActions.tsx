"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { CLOSE_STUDY_PANEL_EVENT, STUDY_PANEL_OPENED_EVENT } from "@/lib/study-timer-events";

import styles from "./Header.module.css";

import LanguageSelector from "./languageSelector";
import UserMenu from "./UserMenu";
import StudyTimer from "@/components/study/StudyTimer";

type Props = {
  user: {
    name: string;
    image: string | null;
  } | null;
  studySubjects: { id: string; name: string; tasks: { id: string; title: string }[] }[];
};

type OpenMenu = "language" | "user" | "auth" | null;

export default function HeaderActions({ user, studySubjects }: Props) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const t = useTranslations("Navigation");

  useEffect(() => {
    function handleStudyPanelOpened() {
      setOpenMenu(null);
    }
    window.addEventListener(STUDY_PANEL_OPENED_EVENT, handleStudyPanelOpened);
    return () => window.removeEventListener(STUDY_PANEL_OPENED_EVENT, handleStudyPanelOpened);
  }, []);

  function openMenuExclusive(menu: Exclude<OpenMenu, null>) {
    window.dispatchEvent(new CustomEvent(CLOSE_STUDY_PANEL_EVENT));
    setOpenMenu(menu);
  }

  return (
    <>
      {user && <StudyTimer subjects={studySubjects} />}

      <LanguageSelector
        isOpen={openMenu === "language"}
        onOpenChange={(isOpen) => (isOpen ? openMenuExclusive("language") : setOpenMenu(null))}
      />

      {user ? (
        <UserMenu
          name={user.name}
          image={user.image}
          isOpen={openMenu === "user"}
          onOpenChange={(isOpen) => (isOpen ? openMenuExclusive("user") : setOpenMenu(null))}
        />
      ) : (
        <>
          <div className={`${styles.authLinks} ${styles.desktopOnly}`}>
            <Link href="/login">{t("login")}</Link>

            <Link href="/register" className={styles.registerButton}>
              {t("register")}
            </Link>
          </div>

          <div className={styles.authMenu}>
            <button
              type="button"
              className={styles.authMenuTrigger}
              onClick={() => (openMenu === "auth" ? setOpenMenu(null) : openMenuExclusive("auth"))}
              aria-expanded={openMenu === "auth"}
              aria-haspopup="menu"
            >
              {t("account")}
              <span className={styles.arrow} aria-hidden="true">▾</span>
            </button>

            {openMenu === "auth" && (
              <div className={styles.authMenuDropdown}>
                <Link href="/login" onClick={() => setOpenMenu(null)}>{t("login")}</Link>
                <Link href="/register" onClick={() => setOpenMenu(null)}>{t("register")}</Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
