import { headers } from "next/headers";
import { redirect } from "next/navigation";

import TasksManager from "@/components/tasks/TasksManager";
import type { TaskPriority, TaskStatus } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TasksPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const [subjects, tasks] = await Promise.all([
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
          select: { id: true, date: true, minutes: true },
        },
      },
    }),
  ]);

  return (
    <TasksManager
      initialSubjects={subjects}
      initialTasks={tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
        priority: task.priority as TaskPriority,
        status: task.status as TaskStatus,
        timeEntries: task.timeEntries.map((entry) => ({
          ...entry,
          date: entry.date.toISOString().slice(0, 10),
        })),
      }))}
    />
  );
}
