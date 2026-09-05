import { headers } from "next/headers";

import TasksManager from "@/components/tasks/TasksManager";
import { redirect } from "@/i18n/navigation";
import type { StudySessionMode, TaskPriority, TaskStatus } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TasksPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return redirect({ href: "/login", locale });
  }

  const [subjects, tasks, studySessions] = await Promise.all([
    prisma.subject.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { subject: { userId: session.user.id } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        completed: true,
        status: true,
        priority: true,
        subject: { select: { id: true, name: true } },
        timeEntries: {
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          select: { id: true, date: true, minutes: true, mode: true },
        },
      },
    }),
    prisma.studySession.findMany({
      where: { userId: session.user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        date: true,
        minutes: true,
        mode: true,
        startedAt: true,
        endedAt: true,
        task: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <TasksManager
      key={`${studySessions.length}:${studySessions[0]?.id ?? "none"}:${tasks.length}`}
      initialSubjects={subjects}
      initialStudySessions={studySessions.map((studySession) => ({
        ...studySession,
        date: studySession.date.toISOString().slice(0, 10),
        startedAt: studySession.startedAt?.toISOString() ?? null,
        endedAt: studySession.endedAt?.toISOString() ?? null,
        mode: studySession.mode as StudySessionMode,
      }))}
      initialTasks={tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        timeEntries: task.timeEntries.map((entry) => ({
          ...entry,
          date: entry.date.toISOString().slice(0, 10),
          mode: entry.mode as StudySessionMode,
        })),
      }))}
    />
  );
}
