import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ExamsManager from "@/components/exams/ExamsManager";
import type { ExamType } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

export default async function ExamsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale}/login`);

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
