"use server";

import {
  getAuthenticatedUserId,
  normalizeOptionalText,
  normalizeRequiredText,
  parseOptionalDate,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { TaskPriority, TaskSummary } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

const PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null;
  priority: TaskPriority;
  subjectId: string;
};

type TaskResult =
  | { ok: true; task: TaskSummary }
  | { ok: false; error: AcademicActionError };

type DeleteTaskResult =
  | { ok: true; taskId: string }
  | { ok: false; error: AcademicActionError };

function serializeTask(task: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completed: boolean;
  priority: string;
  subject: { id: string; name: string };
}): TaskSummary {
  return {
    ...task,
    dueDate: task.dueDate?.toISOString() ?? null,
    priority: task.priority as TaskPriority,
  };
}

function validateInput(input: TaskInput) {
  const title = normalizeRequiredText(input.title, 2, 120);
  const description = normalizeOptionalText(input.description, 600);
  const dueDate = parseOptionalDate(input.dueDate);
  const priority = PRIORITIES.includes(input.priority) ? input.priority : null;

  if (!title || description === undefined || !priority) {
    return null;
  }

  return { title, description, dueDate, priority };
}

export async function createTaskAction(input: TaskInput): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  const data = validateInput(input);

  if (!data) {
    return { ok: false, error: "invalidData" };
  }

  if (!(await subjectBelongsToUser(input.subjectId, userId))) {
    return { ok: false, error: "invalidSubject" };
  }

  try {
    const task = await prisma.task.create({
      data: {
        ...data,
        subjectId: input.subjectId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        completed: true,
        priority: true,
        subject: { select: { id: true, name: true } },
      },
    });

    return { ok: true, task: serializeTask(task) };
  } catch (error) {
    console.error("Could not create task", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateTaskAction(
  taskId: string,
  input: TaskInput,
): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  const data = validateInput(input);

  if (!taskId || !data) {
    return { ok: false, error: "invalidData" };
  }

  if (!(await subjectBelongsToUser(input.subjectId, userId))) {
    return { ok: false, error: "invalidSubject" };
  }

  try {
    const result = await prisma.task.updateMany({
      where: { id: taskId, subject: { userId } },
      data: { ...data, subjectId: input.subjectId },
    });

    if (result.count === 0) {
      return { ok: false, error: "notFound" };
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, subject: { userId } },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        completed: true,
        priority: true,
        subject: { select: { id: true, name: true } },
      },
    });

    return task
      ? { ok: true, task: serializeTask(task) }
      : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update task", error);
    return { ok: false, error: "unknown" };
  }
}

export async function setTaskCompletedAction(
  taskId: string,
  completed: boolean,
): Promise<TaskResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const result = await prisma.task.updateMany({
      where: { id: taskId, subject: { userId } },
      data: { completed },
    });

    if (result.count === 0) {
      return { ok: false, error: "notFound" };
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, subject: { userId } },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        completed: true,
        priority: true,
        subject: { select: { id: true, name: true } },
      },
    });

    return task
      ? { ok: true, task: serializeTask(task) }
      : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not complete task", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteTaskAction(
  taskId: string,
): Promise<DeleteTaskResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  try {
    const result = await prisma.task.deleteMany({
      where: { id: taskId, subject: { userId } },
    });

    return result.count > 0
      ? { ok: true, taskId }
      : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not delete task", error);
    return { ok: false, error: "unknown" };
  }
}
