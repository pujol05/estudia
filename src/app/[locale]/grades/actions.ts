"use server";

import {
  getAuthenticatedUserId,
  parseNumberInRange,
  type AcademicActionError,
} from "@/lib/academic";
import type { GradeSummary } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

export type GradeInput = {
  examId: string;
  score: number | null;
  maxScore: number;
  weight: number;
};

type GradeResult =
  | { ok: true; grade: GradeSummary }
  | { ok: false; error: AcademicActionError };

type DeleteGradeResult =
  | { ok: true; examId: string }
  | { ok: false; error: AcademicActionError };

function serializeGrade(grade: {
  id: string;
  score: number;
  maxScore: number;
  weight: number;
  exam: {
    id: string;
    title: string;
    examDate: Date;
    subject: { id: string; name: string };
  };
}): GradeSummary {
  return {
    id: grade.id,
    examId: grade.exam.id,
    title: grade.exam.title,
    examDate: grade.exam.examDate.toISOString(),
    score: grade.score,
    maxScore: grade.maxScore,
    weight: grade.weight,
    subject: grade.exam.subject,
  };
}

function validateInput(input: GradeInput) {
  const score = parseNumberInRange(input.score, 0, 100);
  const maxScore = parseNumberInRange(input.maxScore, 0.01, 100);
  const weight = parseNumberInRange(input.weight, 0.01, 100);

  if (
    typeof input.examId !== "string" ||
    !input.examId ||
    score === null ||
    maxScore === null ||
    score > maxScore ||
    weight === null
  ) {
    return null;
  }

  return { score, maxScore, weight };
}

export async function saveGradeAction(input: GradeInput): Promise<GradeResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };

  const data = validateInput(input);
  if (!data) return { ok: false, error: "invalidData" };

  const exam = await prisma.exam.findFirst({
    where: { id: input.examId, subject: { userId } },
    select: { id: true },
  });
  if (!exam) return { ok: false, error: "notFound" };

  try {
    const [grade] = await prisma.$transaction([
      prisma.grade.upsert({
        where: { examId: exam.id },
        update: data,
        create: { ...data, examId: exam.id },
        select: {
          id: true,
          score: true,
          maxScore: true,
          weight: true,
          exam: {
            select: {
              id: true,
              title: true,
              examDate: true,
              subject: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.exam.update({
        where: { id: exam.id },
        data: { completed: true },
        select: { id: true },
      }),
    ]);

    return { ok: true, grade: serializeGrade(grade) };
  } catch (error) {
    console.error("Could not save grade", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteGradeAction(gradeId: string): Promise<DeleteGradeResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  if (!gradeId) return { ok: false, error: "invalidData" };

  try {
    const grade = await prisma.grade.findFirst({
      where: { id: gradeId, exam: { subject: { userId } } },
      select: { id: true, examId: true },
    });
    if (!grade) return { ok: false, error: "notFound" };

    await prisma.grade.delete({ where: { id: grade.id } });
    return { ok: true, examId: grade.examId };
  } catch (error) {
    console.error("Could not delete grade", error);
    return { ok: false, error: "unknown" };
  }
}
