// function Header() is a component . Export default is used so others files can import this component.
// import Header from "@/components/layout/Header/Header";

import { headers } from "next/headers"
import { auth } from "@/lib/auth";

import styles from "./Header.module.css";

import BrandLogo from "@/components/layout/BrandLogo";
import HeaderActions from "./HeaderActions";
import NavigationLinks from "./NavigationLinks";
import prisma from "@/lib/prisma";

// posem sytles.header , nav ...pq tenim un fitxer css 
export default async function Header() {

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const studySubjects = session ? await prisma.subject.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      tasks: {
        where: { completed: false },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }],
        take: 30,
        select: { id: true, title: true },
      },
    },
  }) : [];

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <BrandLogo priority />
                {session && <NavigationLinks />}
                <div className={styles.actions}>
                    <HeaderActions
                        user={session ? {
                            name: session.user.name,
                            image: session.user.image ?? null,
                        } : null}
                        studySubjects={studySubjects}
                    />
                </div>
            </div>
        </header>
    );  
}
