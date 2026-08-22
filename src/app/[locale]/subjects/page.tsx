import { headers } from "next/headers";
import { redirect } from "next/navigation";

import SubjectsManager from "@/components/subjects/SubjectsManager";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SubjectsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect(`/${locale}/login`);
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
