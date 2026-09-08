import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import EventsManager from "@/components/events/EventsManager";
import { redirect } from "@/i18n/navigation";
import type { EventRecurrence, EventType } from "@/lib/academic-types";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ locale: string }> };

// Every page here sits behind auth.api.getSession() below and redirects
// anonymous visitors to /login before rendering anything real, so there is
// nothing worth indexing — this is defense in depth, not the primary guard
// (see src/app/robots.ts, which is what actually keeps crawlers out).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Events" });

  return {
    title: `${t("title")} | Estudia`,
    robots: { index: false, follow: false },
  };
}

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect({ href: "/login", locale });

  const [subjects, events] = await Promise.all([
    prisma.subject.findMany({ where: { userId: session.user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.event.findMany({
      where: { userId: session.user.id },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, description: true, startsAt: true, endsAt: true, location: true, type: true, recurrence: true, recurrenceUntil: true, subject: { select: { id: true, name: true } } },
    }),
  ]);

  return <EventsManager referenceTime={new Date().toISOString()} initialSubjects={subjects} initialEvents={events.map((event) => ({ ...event, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null, recurrenceUntil: event.recurrenceUntil?.toISOString() ?? null, type: event.type as EventType, recurrence: event.recurrence as EventRecurrence }))} />;
}
