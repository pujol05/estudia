// function Header() is a component . Export default is used so others files can import this component.
// import Header from "@/components/layout/Header/Header";

import { headers } from "next/headers"
import { auth } from "@/lib/auth";
import { Link } from "@/i18n/navigation";

import styles from "./Header.module.css";

import HeaderActions from "./HeaderActions";
import NavigationLinks from "./NavigationLinks";

// posem sytles.header , nav ...pq tenim un fitxer css 
export default async function Header() {

  const session = await auth.api.getSession({
    headers: await headers(),
  });

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    Estudia
                </Link>
                {session && <NavigationLinks />}
                <div className={styles.actions}>
                    <HeaderActions
                        user={session ? {
                            name: session.user.name,
                            image: session.user.image ?? null,
                        } : null}
                    />
                </div>
            </div>
        </header>
    );  
}
