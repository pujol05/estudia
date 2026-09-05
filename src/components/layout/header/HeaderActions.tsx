"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

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

type OpenMenu = "language" | "user" | null;

export default function HeaderActions({ user, studySubjects }: Props) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const t = useTranslations("Navigation");

  return (
    <>
      {user && <StudyTimer subjects={studySubjects} />}

      <LanguageSelector
        isOpen={openMenu === "language"}
        onOpenChange={(isOpen) => setOpenMenu(isOpen ? "language" : null)}
      />

      {user ? (
        <UserMenu
          name={user.name}
          image={user.image}
          isOpen={openMenu === "user"}
          onOpenChange={(isOpen) => setOpenMenu(isOpen ? "user" : null)}
        />
      ) : (
        <div className={styles.authLinks}>
          <Link href="/login">{t("login")}</Link>

          <Link href="/register" className={styles.registerButton}>
            {t("register")}
          </Link>
        </div>
      )}
    </>
  );
}
