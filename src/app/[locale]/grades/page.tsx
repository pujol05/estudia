import { headers } from "next/headers";
import { redirect } from "next/navigation";

import GradesManager from "@/components/grades/GradesManager";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

export default async function GradesPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale}/login`);

  const [subjects, grades] = await Promise.all([
    prisma.subject.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.grade.findMany({
      where: { subject: { userId: session.user.id } },
      orderBy: { gradedAt: "desc" },
      select: { id: true, title: true, score: true, maxScore: true, weight: true, gradedAt: true, subject: { select: { id: true, name: true } } },
    }),
  ]);

  return <GradesManager initialSubjects={subjects} initialGrades={grades.map((grade) => ({ ...grade, gradedAt: grade.gradedAt.toISOString() }))} />;
}
