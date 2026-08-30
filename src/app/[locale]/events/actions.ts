"use server";

import {
  getAuthenticatedUserId,
  normalizeOptionalText,
  normalizeRequiredText,
  parseOptionalDate,
  parseRequiredDate,
  subjectBelongsToUser,
  type AcademicActionError,
} from "@/lib/academic";
import type { EventRecurrence, EventSummary, EventType } from "@/lib/academic-types";
import prisma from "@/lib/prisma";

const EVENT_TYPES: EventType[] = ["STUDY", "CLASS", "DEADLINE", "PERSONAL", "OTHER"];
const EVENT_RECURRENCES: EventRecurrence[] = ["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"];

export type EventInput = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  type: EventType;
  recurrence: EventRecurrence;
  recurrenceUntil: string | null;
  subjectId: string | null;
};

type EventResult =
  | { ok: true; event: EventSummary }
  | { ok: false; error: AcademicActionError };

type DeleteEventResult =
  | { ok: true; eventId: string }
  | { ok: false; error: AcademicActionError };

function serializeEvent(event: {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  type: string;
  recurrence: string;
  recurrenceUntil: Date | null;
  subject: { id: string; name: string } | null;
}): EventSummary {
  return {
    ...event,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    type: event.type as EventType,
    recurrence: event.recurrence as EventRecurrence,
    recurrenceUntil: event.recurrenceUntil?.toISOString() ?? null,
  };
}

function validateInput(input: EventInput) {
  const title = normalizeRequiredText(input.title, 2, 120);
  const description = normalizeOptionalText(input.description, 600);
  const location = normalizeOptionalText(input.location, 160);
  const startsAt = parseRequiredDate(input.startsAt);
  const endsAt = parseOptionalDate(input.endsAt);
  const type = EVENT_TYPES.includes(input.type) ? input.type : null;
  const recurrence = EVENT_RECURRENCES.includes(input.recurrence) ? input.recurrence : null;
  const parsedRecurrenceUntil = parseOptionalDate(input.recurrenceUntil);
  const recurrenceUntil = recurrence === "NONE" ? null : parsedRecurrenceUntil;

  if (!title || description === undefined || location === undefined || !startsAt || !type || !recurrence || (endsAt && endsAt < startsAt) || (recurrenceUntil && recurrenceUntil < startsAt)) {
    return null;
  }

  return { title, description, location, startsAt, endsAt, type, recurrence, recurrenceUntil };
}

async function validSubject(subjectId: string | null, userId: string) {
  return !subjectId || subjectBelongsToUser(subjectId, userId);
}

export async function createEventAction(input: EventInput): Promise<EventResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const data = validateInput(input);
  if (!data) return { ok: false, error: "invalidData" };
  if (!(await validSubject(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const event = await prisma.event.create({
      data: { ...data, userId, subjectId: input.subjectId },
      select: { id: true, title: true, description: true, startsAt: true, endsAt: true, location: true, type: true, recurrence: true, recurrenceUntil: true, subject: { select: { id: true, name: true } } },
    });
    return { ok: true, event: serializeEvent(event) };
  } catch (error) {
    console.error("Could not create event", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateEventAction(eventId: string, input: EventInput): Promise<EventResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  const data = validateInput(input);
  if (!eventId || !data) return { ok: false, error: "invalidData" };
  if (!(await validSubject(input.subjectId, userId))) return { ok: false, error: "invalidSubject" };

  try {
    const result = await prisma.event.updateMany({ where: { id: eventId, userId }, data: { ...data, subjectId: input.subjectId } });
    if (result.count === 0) return { ok: false, error: "notFound" };
    const event = await prisma.event.findFirst({
      where: { id: eventId, userId },
      select: { id: true, title: true, description: true, startsAt: true, endsAt: true, location: true, type: true, recurrence: true, recurrenceUntil: true, subject: { select: { id: true, name: true } } },
    });
    return event ? { ok: true, event: serializeEvent(event) } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not update event", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteEventAction(eventId: string): Promise<DeleteEventResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { ok: false, error: "unauthorized" };
  try {
    const result = await prisma.event.deleteMany({ where: { id: eventId, userId } });
    return result.count > 0 ? { ok: true, eventId } : { ok: false, error: "notFound" };
  } catch (error) {
    console.error("Could not delete event", error);
    return { ok: false, error: "unknown" };
  }
}
