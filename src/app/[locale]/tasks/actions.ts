"use server";

import {
  getAuthenticatedUserId,
  normalizeOptionalText,
  normalizeRequiredText,
  parseNumberInRange,
  parseOptionalDate,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { TaskPriority, TaskStatus, TaskSummary } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  subjectId: string;
};

type TaskResult =
  | { ok: true; task: TaskSummary }
  | { ok: false; error: AcademicActionError };

type DeleteTaskResult =
  | { ok: true; taskId: string }
  | { ok: false; error: AcademicActionError };

const taskSelect = {
  id: true,
  title: true,
  description: true,
  dueDate: true,
  completed: true,
  status: true,
  priority: true,
  subject: { select: { id: true, name: true } },
  timeEntries: {
    orderBy: [{ date: "desc" as const }, { createdAt: "desc" as const }],
    select: { id: true, date: true, minutes: true },
  },
};

function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  status: string;
  priority: string;
  subject: { id: string; name: string };
  timeEntries: { id: string; date: Date; minutes: number }[];
}): TaskSummary {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    priority: task.priority as TaskPriority,
    status: task.status as TaskStatus,
    timeEntries: task.timeEntries.map((entry) => ({
      ...entry,
      date: entry.date.toISOString().slice(0, 10),
    })),
  };
}

function validateInput(input: TaskInput) {
  const title = normalizeRequiredText(input.title, 2, 120);
  const description = normalizeOptionalText(input.description, 600);
  const dueDate = parseOptionalDate(input.dueDate);
  const priority = PRIORITIES.includes(input.priority) ? input.priority : null;
  const status = STATUSES.includes(input.status) ? input.status : null;

  if (!title || description === undefined || !priority || !status) return null;
  return { title, description, dueDate, priority, status, completed: status === "DONE" };
}

async function findOwnedTask(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, subject: { userId } },
    select: taskSelect,
  });
}

export async function createTaskAction(input: TaskInput): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const data = validateInput(input);
  if (!data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) {
    return { ok: false, error: "invalidSubject" };
  }

  try {
    const task = await prisma.task.create({
      data: { ...data, subjectId: input.subjectId },
      select: taskSelect,
    });
    return { ok: true, task: serializeTask(task) };
  } catch (error) {
    console.error("Could not create task", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateTaskAction(taskId: string, input: TaskInput): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const data = validateInput(input);
  if (!taskId || !data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) {
    return { ok: false, error: "invalidSubject" };
  }

  try {
    const result = await prisma.task.updateMany({
      where: { id: taskId, subject: { userId } },
      data: { ...data, subjectId: input.subjectId },
    });
    if (result.count === 0) return { ok: false, error: "notFound" };

    const task = await findOwnedTask(taskId, userId);
    return task ? { ok: true, task: serializeTask(task) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update task", error);
    return { ok: false, error: "unknown" };
  }
}

export async function setTaskStatusAction(taskId: string, status: TaskStatus): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  if (!taskId || !STATUSES.includes(status)) return { ok: false, error: "invalidData" };

  try {
    const result = await prisma.task.updateMany({
      where: { id: taskId, subject: { userId } },
      data: { status, completed: status === "DONE" },
    });
    if (result.count === 0) return { ok: false, error: "notFound" };

    const task = await findOwnedTask(taskId, userId);
    return task ? { ok: true, task: serializeTask(task) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update task status", error);
    return { ok: false, error: "unknown" };
  }
}

export async function addTaskTimeEntryAction(
  taskId: string,
  input: { date: string; hours: number | string; minutes: number | string },
): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const hours = parseNumberInRange(input.hours, 0, 24);
  const minutePart = parseNumberInRange(input.minutes, 0, 59);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(input.date);
  const date = validDate ? new Date(`${input.date}T00:00:00.000Z`) : null;
  const dateMatchesInput = date?.toISOString().slice(0, 10) === input.date;
  const validDurationParts = hours !== null
    && minutePart !== null
    && Number.isInteger(hours)
    && Number.isInteger(minutePart);
  const minutes = validDurationParts ? hours * 60 + minutePart : null;
  if (!taskId || !date || !dateMatchesInput || !minutes || minutes > 1440) {
    return { ok: false, error: "invalidData" };
  }

  const ownedTask = await prisma.task.findFirst({
    where: { id: taskId, subject: { userId } },
    select: { id: true, status: true },
  });
  if (!ownedTask) return { ok: false, error: "notFound" };

  try {
    await prisma.$transaction([
      prisma.taskTimeEntry.create({ data: { taskId, date, minutes } }),
      ...(ownedTask.status === "TODO"
        ? [prisma.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS", completed: false } })]
        : []),
    ]);
    const task = await findOwnedTask(taskId, userId);
    return task ? { ok: true, task: serializeTask(task) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not add task time entry", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteTaskAction(taskId: string): Promise<DeleteTaskResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  try {
    const result = await prisma.task.deleteMany({ where: { id: taskId, subject: { userId } } });
    return result.count > 0 ? { ok: true, taskId } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not delete task", error);
    return { ok: false, error: "unknown" };
  }
}
