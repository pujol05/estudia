import { headers } from "next/headers";
import { redirect } from "next/navigation";

import EventsManager from "@/components/events/EventsManager";
import type { EventType } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(`/${locale}/login`);

  const [subjects, events] = await Promise.all([
    prisma.subject.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.event.findMany({
      where: { userId: session.user.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, description: true, startsAt: true, endsAt: true, location: true, type: true, subject: { select: { id: true, name: true } } },
    }),
  ]);

  return <EventsManager referenceTime={new Date().toISOString()} initialSubjects={subjects} initialEvents={events.map((event) => ({ ...event, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null, type: event.type as EventType }))} />;
}
