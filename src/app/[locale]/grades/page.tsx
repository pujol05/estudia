import { headers } from "next/headers";

import GradesManager from "@/components/grades/GradesManager";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

export default async function GradesPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect({ href: "/login", locale });

  const [subjects, exams] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.exam.findMany({
      where: { subject: { userId: session.user.id } },
      orderBy: { examDate: "desc" },
      select: {
        id: true,
        title: true,
        examDate: true,
        subject: { select: { id: true, name: true } },
        grade: { select: { id: true, score: true, maxScore: true, weight: true } },
      },
    }),
  ]);

  return (
    <GradesManager
      initialSubjects={subjects}
      initialGrades={exams.map((exam) => ({
        id: exam.grade?.id ?? null,
        examId: exam.id,
        title: exam.title,
        examDate: exam.examDate.toISOString(),
        score: exam.grade?.score ?? null,
        maxScore: exam.grade?.maxScore ?? 10,
        weight: exam.grade?.weight ?? 100,
        subject: exam.subject,
      }))}
    />
  );
}
