import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import SubjectsManager from "@/components/subjects/SubjectsManager";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

// Every page here sits behind auth.api.getSession() below and redirects
// anonymous visitors to /login before rendering anything real, so there is
// nothing worth indexing — this is defense in depth, not the primary guard
// (see src/app/robots.ts, which is what actually keeps crawlers out).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Subjects" });

  return {
    title: `${t("title")} | Estudia`,
    robots: { index: false, follow: false },
  };
}

export default async function SubjectsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const subjects = await prisma.subject.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return (
    <SubjectsManager
      initialSubjects={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        taskCount: subject._count.tasks,
      }))}
    />
  );
}
