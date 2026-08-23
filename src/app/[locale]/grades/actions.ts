"use server";

import {
  getAuthenticatedUserId,
  normalizeRequiredText,
  parseNumberInRange,
  parseRequiredDate,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { GradeSummary } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

export type GradeInput = {
  title: string;
  score: number;
  maxScore: number;
  weight: number;
  gradedAt: string;
  subjectId: string;
};

type GradeResult =
  | { ok: true; grade: GradeSummary }
  | { ok: false; error: AcademicActionError };

type DeleteGradeResult =
  | { ok: true; gradeId: string }
  | { ok: false; error: AcademicActionError };

function serializeGrade(grade: {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  weight: number;
  gradedAt: Date;
  subject: { id: string; name: string };
}): GradeSummary {
  return { ...grade, gradedAt: grade.gradedAt.toISOString() };
}

function validateInput(input: GradeInput) {
  const title = normalizeRequiredText(input.title, 2, 120);
  const score = parseNumberInRange(input.score, 0, 100);
  const maxScore = parseNumberInRange(input.maxScore, 0.01, 100);
  const weight = parseNumberInRange(input.weight, 0.01, 100);
  const gradedAt = parseRequiredDate(input.gradedAt);

  if (!title || score === null || maxScore === null || score > maxScore || weight === null || !gradedAt) {
    return null;
  }

  return { title, score, maxScore, weight, gradedAt };
}

export async function createGradeAction(input: GradeInput): Promise<GradeResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const data = validateInput(input);
  if (!data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const grade = await prisma.grade.create({
      data: { ...data, subjectId: input.subjectId },
      select: { id: true, title: true, score: true, maxScore: true, weight: true, gradedAt: true, subject: { select: { id: true, name: true } } },
    });
    return { ok: true, grade: serializeGrade(grade) };
  } catch (error) {
    console.error("Could not create grade", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateGradeAction(gradeId: string, input: GradeInput): Promise<GradeResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const data = validateInput(input);
  if (!gradeId || !data) return { ok: false, error: "invalidData" };
  if (!(await subjectBelongsToUser(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const result = await prisma.grade.updateMany({
      where: { id: gradeId, subject: { userId } },
      data: { ...data, subjectId: input.subjectId },
    });
    if (result.count === 0) return { ok: false, error: "notFound" };
    const grade = await prisma.grade.findFirst({
      where: { id: gradeId, subject: { userId } },
      select: { id: true, title: true, score: true, maxScore: true, weight: true, gradedAt: true, subject: { select: { id: true, name: true } } },
    });
    return grade ? { ok: true, grade: serializeGrade(grade) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update grade", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteGradeAction(gradeId: string): Promise<DeleteGradeResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  try {
    const result = await prisma.grade.deleteMany({ where: { id: gradeId, subject: { userId } } });
    return result.count > 0 ? { ok: true, gradeId } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not delete grade", error);
    return { ok: false, error: "unknown" };
  }
}
