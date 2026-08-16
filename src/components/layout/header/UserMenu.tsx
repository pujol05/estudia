"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "@/i18n/navigation";

import styles from "./UserMenu.module.css";

type Props = {
  name: string;
  image: string | null;
};

export default function UserMenu({ name, image }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const t = useTranslations("Navigation");
  const router = useRouter();

  const initial = name.charAt(0).toUpperCase();

  async function handleLogout() {
    await authClient.signOut();

    router.push("/login");
    router.refresh();
  }

  return (
    <div className={styles.userMenu}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.avatar}>
          {image ? (
            <img src={image} alt={name} />
          ) : (
            initial
          )}
        </span>

        <span>{name}</span>

        <span className={styles.arrow}>▾</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <button
            type="button"
            className={styles.logout}
            onClick={handleLogout}
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}