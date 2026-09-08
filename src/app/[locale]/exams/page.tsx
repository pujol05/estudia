import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import ExamsManager from "@/components/exams/ExamsManager";
import { redirect } from "@/i18n/navigation";
import type { ExamType } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

// Every page here sits behind auth.api.getSession() below and redirects
// anonymous visitors to /login before rendering anything real, so there is
// nothing worth indexing — this is defense in depth, not the primary guard
// (see src/app/robots.ts, which is what actually keeps crawlers out).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Exams" });

  return {
    title: `${t("title")} | Estudia`,
    robots: { index: false, follow: false },
  };
}

export default async function ExamsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect({ href: "/login", locale });

  const [subjects, exams] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: session.user.id }, orderBy: { name: "asc" }, select: { id: true, name: true },
    }),
    prisma.exam.findMany({
      where: { subject: { userId: session.user.id } },
      orderBy: [{ completed: "asc" }, { examDate: "asc" }],
      select: {
        id: true, title: true, description: true, examDate: true,
        type: true, completed: true,
        subject: { select: { id: true, name: true } },
      },
    }),
  ]);

  return <ExamsManager referenceTime={new Date().toISOString()} initialSubjects={subjects} initialExams={exams.map((exam) => ({ ...exam, examDate: exam.examDate.toISOString(), type: exam.type as ExamType }))} />;
}
