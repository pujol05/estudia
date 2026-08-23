import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export type AcademicActionError =
  | "unauthorized"
  | "invalidData"
  | "invalidSubject"
  | "notFound"
  | "unknown";

export async function getAuthenticatedUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export function normalizeRequiredText(
  value: unknown,
  minLength = 2,
  maxLength = 120,
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length < minLength || normalized.length > maxLength) {
    return null;
  }

  return normalized;
}

export function normalizeOptionalText(value: unknown, maxLength = 500) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length > maxLength) {
    return undefined;
  }

  return normalized || null;
}

export function parseRequiredDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parseRequiredDate(value);
}

export function parseNumberInRange(
  value: unknown,
  minimum: number,
  maximum: number,
) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    return null;
  }

  return number;
}

export async function subjectBelongsToUser(
  subjectId: unknown,
  userId: string,
) {
  if (typeof subjectId !== "string" || !subjectId) {
    return false;
  }

  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      userId,
    },
    select: {
      id: true,
    },
  });

  return subject !== null;
}
