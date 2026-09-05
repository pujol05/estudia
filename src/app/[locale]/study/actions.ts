"use server";

import {
  getAuthenticatedUserId,
  normalizeRequiredText,
  parseNumberInRange,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { StudySessionMode } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

type SessionDestination = "GENERAL" | "SUBJECT" | "TASK" | "CREATE_TASK";

export type SaveStudySessionInput = {
  date: string;
  minutes: number;
  startedAt: string;
  endedAt: string;
  mode: Exclude<StudySessionMode, "MANUAL">;
  destination: SessionDestination;
  taskId: string | null;
  subjectId: string | null;
  newTaskTitle: string;
};

type SaveStudySessionResult =
  | { ok: true; sessionId: string; taskId: string | null }
  | { ok: false; error: AcademicActionError };

const TIMER_MODES: SaveStudySessionInput["mode"][] = ["STOPWATCH", "POMODORO"];
const DESTINATIONS: SessionDestination[] = ["GENERAL", "SUBJECT", "TASK", "CREATE_TASK"];

function parseSessionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export async function saveStudySessionAction(input: SaveStudySessionInput): Promise<SaveStudySessionResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const minutes = parseNumberInRange(input.minutes, 1, 1440);
  const date = parseSessionDate(input.date);
  const startedAt = new Date(input.startedAt);
  const endedAt = new Date(input.endedAt);
  const validDates = !Number.isNaN(startedAt.getTime()) && !Number.isNaN(endedAt.getTime()) && endedAt >= startedAt;
  const validMode = TIMER_MODES.includes(input.mode);
  const validDestination = DESTINATIONS.includes(input.destination);
  if (!minutes || !Number.isInteger(minutes) || !date || !validDates || !validMode || !validDestination) {
    return { ok: false, error: "invalidData" };
  }

  let task: { id: string; subjectId: string; status: string } | null = null;
  let subjectId: string | null = null;
  let newTaskTitle: string | null = null;

  if (input.destination === "TASK") {
    if (!input.taskId) return { ok: false, error: "invalidData" };
    task = await prisma.task.findFirst({
      where: { id: input.taskId, subject: { userId } },
      select: { id: true, subjectId: true, status: true },
    });
    if (!task) return { ok: false, error: "notFound" };
    subjectId = task.subjectId;
  }

  if (input.destination === "SUBJECT" || input.destination === "CREATE_TASK") {
    if (!input.subjectId || !(await subjectBelongsToUser(input.subjectId, userId))) {
      return { ok: false, error: "invalidSubject" };
    }
    subjectId = input.subjectId;
  }

  if (input.destination === "CREATE_TASK") {
    newTaskTitle = normalizeRequiredText(input.newTaskTitle, 2, 120);
    if (!newTaskTitle) return { ok: false, error: "invalidData" };
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      let taskId = task?.id ?? null;
      if (input.destination === "CREATE_TASK" && newTaskTitle && subjectId) {
        const createdTask = await transaction.task.create({
          data: {
            title: newTaskTitle,
            subjectId,
            status: "IN_PROGRESS",
            completed: false,
            priority: "MEDIUM",
          },
          select: { id: true },
        });
        taskId = createdTask.id;
      }

      const session = await transaction.studySession.create({
        data: { userId, taskId, subjectId, date, minutes, startedAt, endedAt, mode: input.mode },
        select: { id: true },
      });

      if (task?.status === "TODO") {
        await transaction.task.update({
          where: { id: task.id },
          data: { status: "IN_PROGRESS", completed: false },
        });
      }

      return { sessionId: session.id, taskId };
    });
    return { ok: true, ...result };
  } catch (error) {
    console.error("Could not save study session", error);
    return { ok: false, error: "unknown" };
  }
}
