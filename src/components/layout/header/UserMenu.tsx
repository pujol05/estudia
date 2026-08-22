"use client";

import Image from "next/image"; // serveix per a mostrar imatges optimitzades a Next.js
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Link, useRouter } from "@/i18n/navigation";

import styles from "./UserMenu.module.css";

type Props = {
  name: string;
  image: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function UserMenu({
  name,
  image,
  isOpen,
  onOpenChange,
}: Props) {
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
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className={styles.avatar}>
          {image ? (
            <Image src={image} alt="" width={32} height={32} unoptimized />
          ) : (initial)}
        </span>

        <span>{name}</span>

        <span className={styles.arrow}>▾</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          <Link
            href="/profile"
            className={styles.menuAction}
            onClick={() => onOpenChange(false)}
          >
            {t("profile")}
          </Link>

          <div className={styles.divider} />

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
