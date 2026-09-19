"use client";

export default function FormattedDateTime({ date, locale }: { date: string; locale: string }) {
  return <>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))}</>;
}
