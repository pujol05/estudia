"use server";

import {
  getAuthenticatedUserId,
  normalizeOptionalText,
  normalizeRequiredText,
  parseRequiredDate,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { ExamSummary, ExamType } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

const EXAM_TYPES: ExamType[] = ["FINAL", "MIDTERM", "PRACTICAL", "ORAL", "OTHER"];

export type ExamInput = {
  title: string;
  description: string;
  examDate: string;
  type: ExamType;
  completed: boolean;
  subjectId: string;
};

type ExamResult =
  | { ok: true; exam: ExamSummary }
  | { ok: false; error: AcademicActionError };

type DeleteExamResult =
  | { ok: true; examId: string }
  | { ok: false; error: AcademicActionError };

function serializeExam(exam: {
  id: string;
  title: string;
  description: string | null;
  examDate: Date;
  type: string;
  completed: boolean;
  subject: { id: string; name: string };
}): ExamSummary {
  return {
    ...exam,
    examDate: exam.examDate.toISOString(),
    type: exam.type as ExamType,
  };
}

function validateInput(input: ExamInput) {
  const title = normalizeRequiredText(input.title, 2, 120);
  const description = normalizeOptionalText(input.description, 600);
  const examDate = parseRequiredDate(input.examDate);
  const type = EXAM_TYPES.includes(input.type) ? input.type : null;
  if (!title || description === undefined || !examDate || !type || typeof input.completed !== "boolean") {
    return null;
  }

  return { title, description, examDate, type, completed: input.completed };
}

export async function createExamAction(input: ExamInput): Promise<ExamResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const data = validateInput(input);
  if (!data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const exam = await prisma.exam.create({
      data: { ...data, subjectId: input.subjectId },
      select: {
        id: true, title: true, description: true, examDate: true,
        type: true, completed: true,
        subject: { select: { id: true, name: true } },
      },
    });
    return { ok: true, exam: serializeExam(exam) };
  } catch (error) {
    console.error("Could not create exam", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateExamAction(examId: string, input: ExamInput): Promise<ExamResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const data = validateInput(input);
  if (!examId || !data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const result = await prisma.exam.updateMany({
      where: { id: examId, subject: { userId } },
      data: { ...data, subjectId: input.subjectId },
    });
    if (result.count === 0) return { ok: false, error: "notFound" };

    const exam = await prisma.exam.findFirst({
      where: { id: examId, subject: { userId } },
      select: {
        id: true, title: true, description: true, examDate: true,
        type: true, completed: true,
        subject: { select: { id: true, name: true } },
      },
    });
    return exam ? { ok: true, exam: serializeExam(exam) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update exam", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteExamAction(examId: string): Promise<DeleteExamResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  try {
    const result = await prisma.exam.deleteMany({ where: { id: examId, subject: { userId } } });
    return result.count > 0 ? { ok: true, examId } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not delete exam", error);
    return { ok: false, error: "unknown" };
  }
}
