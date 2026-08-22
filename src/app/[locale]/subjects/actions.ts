"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const SUBJECT_NAME_MIN_LENGTH = 2;
const SUBJECT_NAME_MAX_LENGTH = 80;

export type SubjectSummary = {
  id: string;
  name: string;
  taskCount: number;
};

export type SubjectActionError =
  | "unauthorized"
  | "invalidName"
  | "duplicate"
  | "notFound"
  | "unknown";

type CreateSubjectResult =
  | { ok: true; subject: SubjectSummary }
  | { ok: false; error: SubjectActionError };

type UpdateSubjectResult =
  | { ok: true; subject: Pick<SubjectSummary, "id" | "name"> }
  | { ok: false; error: SubjectActionError };

type DeleteSubjectResult =
  | { ok: true; subjectId: string }
  | { ok: false; error: SubjectActionError };

async function getAuthenticatedUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function normalizeSubjectName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (
    name.length < SUBJECT_NAME_MIN_LENGTH ||
    name.length > SUBJECT_NAME_MAX_LENGTH
  ) {
    return null;
  }

  return name;
}

async function subjectNameExists(
  userId: string,
  name: string,
  excludedSubjectId?: string,
) {
  const subject = await prisma.subject.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(excludedSubjectId
        ? {
            id: {
              not: excludedSubjectId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  return subject !== null;
}

export async function createSubjectAction(
  rawName: unknown,
): Promise<CreateSubjectResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  const name = normalizeSubjectName(rawName);

  if (!name) {
    return { ok: false, error: "invalidName" };
  }

  try {
    if (await subjectNameExists(userId, name)) {
      return { ok: false, error: "duplicate" };
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return {
      ok: true,
      subject: {
        ...subject,
        taskCount: 0,
      },
    };
  } catch (error) {
    console.error("Could not create subject", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateSubjectAction(
  rawSubjectId: unknown,
  rawName: unknown,
): Promise<UpdateSubjectResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  if (typeof rawSubjectId !== "string" || !rawSubjectId) {
    return { ok: false, error: "notFound" };
  }

  const name = normalizeSubjectName(rawName);

  if (!name) {
    return { ok: false, error: "invalidName" };
  }

  try {
    if (await subjectNameExists(userId, name, rawSubjectId)) {
      return { ok: false, error: "duplicate" };
    }

    const result = await prisma.subject.updateMany({
      where: {
        id: rawSubjectId,
        userId,
      },
      data: {
        name,
      },
    });

    if (result.count === 0) {
      return { ok: false, error: "notFound" };
    }

    return {
      ok: true,
      subject: {
        id: rawSubjectId,
        name,
      },
    };
  } catch (error) {
    console.error("Could not update subject", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteSubjectAction(
  rawSubjectId: unknown,
): Promise<DeleteSubjectResult> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return { ok: false, error: "unauthorized" };
  }

  if (typeof rawSubjectId !== "string" || !rawSubjectId) {
    return { ok: false, error: "notFound" };
  }

  try {
    const result = await prisma.subject.deleteMany({
      where: {
        id: rawSubjectId,
        userId,
      },
    });

    if (result.count === 0) {
      return { ok: false, error: "notFound" };
    }

    return {
      ok: true,
      subjectId: rawSubjectId,
    };
  } catch (error) {
    console.error("Could not delete subject", error);
    return { ok: false, error: "unknown" };
  }
}
