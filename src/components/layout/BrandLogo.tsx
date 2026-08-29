import Image from "next/image";

import { Link } from "@/i18n/navigation";

import styles from "./BrandLogo.module.css";

type Props = {
  compact?: boolean;
  priority?: boolean;
  showName?: boolean;
};

export default function BrandLogo({
  compact = false,
  priority = false,
  showName = true,
}: Props) {
  return (
    <Link
      href="/"
      className={`${styles.brand} ${compact ? styles.compact : ""}`}
      aria-label="Estudia"
    >
      <span className={styles.mark} aria-hidden="true">
        <Image
          className={styles.image}
          src="/logo_estudia.png"
          alt=""
          fill
          priority={priority}
          sizes={compact ? "36px" : "42px"}
        />
      </span>
      {showName && <span className={styles.name}>Estudia</span>}
    </Link>
  );
}
