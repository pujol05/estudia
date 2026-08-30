"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createEventAction, deleteEventAction, updateEventAction, type EventInput } from "@/app/[locale]/events/actions";
import styles from "@/components/academic/AcademicManager.module.css";
import calendarStyles from "@/components/events/EventsManager.module.css";
import { useRouter } from "@/i18n/navigation";
import type { EventRecurrence, EventSummary, EventType, SubjectOption } from "@/lib/academic-types";

type Props = { referenceTime: string; initialSubjects: SubjectOption[]; initialEvents: EventSummary[] };
type EventFilter = "upcoming" | "past" | "all";
type CalendarView = "list" | "month" | "week";
type Occurrence = { event: EventSummary; startsAt: Date; endsAt: Date | null; key: string };

const EMPTY_FORM: EventInput = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: null,
  location: "",
  type: "STUDY",
  recurrence: "NONE",
  recurrenceUntil: null,
  subjectId: null,
};

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toDateInput(value: string | null) {
  return toDateTimeInput(value).slice(0, 10);
}

function endOfLocalDayIso(value: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(value: Date, amount: number) {
  const result = new Date(value);
  result.setDate(result.getDate() + amount);
  return result;
}

function addMonths(value: Date, amount: number) {
  const result = new Date(value);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

function startOfWeek(value: Date) {
  const result = startOfDay(value);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  return addDays(result, -daysSinceMonday);
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function nextOccurrence(value: Date, recurrence: EventRecurrence) {
  if (recurrence === "WEEKLY") return addDays(value, 7);
  if (recurrence === "BIWEEKLY") return addDays(value, 14);
  if (recurrence === "MONTHLY") return addMonths(value, 1);
  return null;
}

function occurrenceForReference(event: EventSummary, reference: Date) {
  let startsAt = new Date(event.startsAt);
  const duration = event.endsAt ? new Date(event.endsAt).getTime() - startsAt.getTime() : 0;
  const until = event.recurrenceUntil ? new Date(event.recurrenceUntil).getTime() : Number.POSITIVE_INFINITY;

  for (let index = 0; index < 1_200; index += 1) {
    const endsAt = new Date(startsAt.getTime() + duration);
    if (endsAt.getTime() >= reference.getTime() && startsAt.getTime() <= until) {
      return { startsAt, endsAt: event.endsAt ? endsAt : null };
    }
    const next = nextOccurrence(startsAt, event.recurrence);
    if (!next || next.getTime() > until) return null;
    startsAt = next;
  }
  return null;
}

function expandOccurrences(events: EventSummary[], rangeStart: Date, rangeEnd: Date) {
  const occurrences: Occurrence[] = [];

  for (const event of events) {
    let startsAt = new Date(event.startsAt);
    const duration = event.endsAt ? new Date(event.endsAt).getTime() - startsAt.getTime() : 0;
    const until = event.recurrenceUntil ? new Date(event.recurrenceUntil).getTime() : Number.POSITIVE_INFINITY;

    for (let index = 0; index < 1_200 && startsAt.getTime() < rangeEnd.getTime() && startsAt.getTime() <= until; index += 1) {
      const endsAt = event.endsAt ? new Date(startsAt.getTime() + duration) : null;
      if ((endsAt ?? startsAt).getTime() >= rangeStart.getTime()) {
        occurrences.push({ event, startsAt, endsAt, key: `${event.id}-${startsAt.toISOString()}` });
      }
      const next = nextOccurrence(startsAt, event.recurrence);
      if (!next) break;
      startsAt = next;
    }
  }

  return occurrences.sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

function CalendarChevron({ direction }: { direction: "previous" | "next" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>;
}

export default function EventsManager({ referenceTime, initialSubjects, initialEvents }: Props) {
  const t = useTranslations("Events");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [view, setView] = useState<CalendarView>("list");
  const [filter, setFilter] = useState<EventFilter>("upcoming");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date(referenceTime)));
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const referenceDate = useMemo(() => new Date(referenceTime), [referenceTime]);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);
  const timeFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }), [locale]);
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short" }), [locale]);
  const dayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { day: "numeric" }), [locale]);

  const matchingEvents = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return events.filter((event) => (
      (subjectFilter === "all" || (subjectFilter === "none" ? event.subject === null : event.subject?.id === subjectFilter))
      && (!search || `${event.title} ${event.description ?? ""} ${event.location ?? ""} ${event.subject?.name ?? ""}`.toLocaleLowerCase(locale).includes(search))
    ));
  }, [events, locale, query, subjectFilter]);

  const listEntries = useMemo(() => matchingEvents.flatMap((event) => {
    const next = occurrenceForReference(event, referenceDate);
    const isPast = next === null;
    if ((filter === "past" && !isPast) || (filter === "upcoming" && isPast)) return [];
    const displayed = filter === "upcoming" && next
      ? next
      : { startsAt: new Date(event.startsAt), endsAt: event.endsAt ? new Date(event.endsAt) : null };
    return [{ event, ...displayed }];
  }).sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime()), [filter, matchingEvents, referenceDate]);

  const calendarRange = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(anchorDate);
      return { start, end: addDays(start, 7), days: Array.from({ length: 7 }, (_, index) => addDays(start, index)) };
    }
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const start = startOfWeek(monthStart);
    return { start, end: addDays(start, 42), days: Array.from({ length: 42 }, (_, index) => addDays(start, index)) };
  }, [anchorDate, view]);

  const calendarOccurrences = useMemo(
    () => expandOccurrences(matchingEvents, calendarRange.start, calendarRange.end),
    [calendarRange.end, calendarRange.start, matchingEvents],
  );

  const calendarTitle = useMemo(() => {
    if (view === "month") return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(anchorDate);
    const weekEnd = addDays(calendarRange.end, -1);
    return `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(calendarRange.start)} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(weekEnd)}`;
  }, [anchorDate, calendarRange.end, calendarRange.start, locale, view]);

  function unauthorized(error: string) { if (error !== "unauthorized") return false; router.push("/login"); router.refresh(); return true; }
  function openCreate() { setEditingId(null); setForm(EMPTY_FORM); setFeedback(null); setEditorOpen(true); }
  function openEdit(event: EventSummary) {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description ?? "",
      startsAt: toDateTimeInput(event.startsAt),
      endsAt: event.endsAt ? toDateTimeInput(event.endsAt) : null,
      location: event.location ?? "",
      type: event.type,
      recurrence: event.recurrence,
      recurrenceUntil: toDateInput(event.recurrenceUntil),
      subjectId: event.subject?.id ?? null,
    });
    setFeedback(null);
    setEditorOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    const input = {
      ...form,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      recurrenceUntil: form.recurrence === "NONE" ? null : endOfLocalDayIso(form.recurrenceUntil),
    };
    const result = editingId ? await updateEventAction(editingId, input) : await createEventAction(input);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
    } else {
      setEvents((current) => editingId ? current.map((item) => item.id === result.event.id ? result.event : item) : [...current, result.event]);
      setEditorOpen(false);
      setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
    }
    setBusy(false);
  }

  async function remove() {
    if (!deletingEvent) return;
    setBusy(true);
    const result = await deleteEventAction(deletingEvent.id);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: t("deleteError") });
    } else {
      setEvents((current) => current.filter((event) => event.id !== result.eventId));
      setDeletingEvent(null);
      setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(false);
  }

  function typeLabel(type: EventType) { return t(`type${type[0]}${type.slice(1).toLowerCase()}`); }
  function recurrenceLabel(recurrence: EventRecurrence) {
    const key = recurrence === "NONE" ? "recurrenceNone" : recurrence === "WEEKLY" ? "recurrenceWeekly" : recurrence === "BIWEEKLY" ? "recurrenceBiweekly" : "recurrenceMonthly";
    return t(key);
  }
  function moveCalendar(direction: -1 | 1) {
    setAnchorDate((current) => view === "month" ? addMonths(current, direction) : addDays(current, direction * 7));
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></header>

    <div className={calendarStyles.controls}>
      <div className={styles.tabs} aria-label={t("viewLabel")}>
        {(["list", "month", "week"] as CalendarView[]).map((value) => <button key={value} className={`${styles.tab} ${view === value ? styles.activeTab : ""}`} type="button" aria-pressed={view === value} onClick={() => setView(value)}>{t(`view${value[0].toUpperCase()}${value.slice(1)}`)}</button>)}
      </div>
      {view === "list" && <div className={styles.tabs} aria-label={t("listFilterLabel")}>{(["upcoming", "past", "all"] as EventFilter[]).map((value) => <button key={value} className={`${styles.tab} ${filter === value ? styles.activeTab : ""}`} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(value)}</button>)}</div>}
      <div className={`${styles.filters} ${calendarStyles.filters}`}><select className={styles.filterSelect} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label={common("filterSubject")}><option value="all">{common("allSubjects")}</option><option value="none">{t("noSubject")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} /></div>
    </div>

    {feedback && <p className={feedback.type === "error" ? styles.error : styles.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

    {view === "list" && (listEntries.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>D</div><h2>{t("emptyTitle")}</h2><p>{t("emptyText")}</p><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></section> : <section className={styles.list} aria-label={t("listLabel")}>
      {listEntries.map(({ event, startsAt, endsAt }) => <article className={styles.item} key={event.id}>
        <div className={styles.itemMain}><div className={styles.itemIcon}>D</div><div className={styles.itemText}><h2 className={styles.itemTitle}>{event.title}</h2><p className={styles.itemDescription}>{event.description || event.subject?.name || t("noSubject")}</p></div></div>
        <div className={styles.itemMeta}><strong>{formatter.format(startsAt)}</strong>{endsAt ? t("ends", { date: formatter.format(endsAt) }) : event.location || t("noLocation")}{event.recurrence !== "NONE" && <span className={calendarStyles.recurrenceText}>{recurrenceLabel(event.recurrence)}</span>}</div>
        <span className={styles.badge}>{typeLabel(event.type)}</span>
        <div className={styles.itemActions}><button className={styles.secondaryButton} type="button" onClick={() => openEdit(event)} disabled={busy}>{common("edit")}</button><button className={styles.dangerButton} type="button" onClick={() => setDeletingEvent(event)} disabled={busy}>{common("delete")}</button></div>
      </article>)}
    </section>)}

    {view !== "list" && <section className={calendarStyles.calendar} aria-label={t("calendarLabel")}>
      <header className={calendarStyles.calendarHeader}>
        <div className={calendarStyles.calendarNav}><button className={`${styles.iconButton} ${calendarStyles.calendarArrow}`} type="button" onClick={() => moveCalendar(-1)} aria-label={t("previousPeriod")}><CalendarChevron direction="previous" /></button><button className={styles.secondaryButton} type="button" onClick={() => setAnchorDate(startOfDay(referenceDate))}>{t("today")}</button><button className={`${styles.iconButton} ${calendarStyles.calendarArrow}`} type="button" onClick={() => moveCalendar(1)} aria-label={t("nextPeriod")}><CalendarChevron direction="next" /></button></div>
        <h2>{calendarTitle}</h2>
      </header>
      <div className={calendarStyles.calendarScroller}>
        <div className={`${calendarStyles.calendarGrid} ${view === "week" ? calendarStyles.weekGrid : calendarStyles.monthGrid}`} role="grid">
          {calendarRange.days.slice(0, 7).map((day) => <div className={calendarStyles.weekday} key={`weekday-${day.toISOString()}`} role="columnheader">{weekdayFormatter.format(day)}</div>)}
          {calendarRange.days.map((day) => {
            const dayOccurrences = calendarOccurrences.filter((occurrence) => sameDay(occurrence.startsAt, day));
            const visible = dayOccurrences.slice(0, view === "month" ? 3 : 8);
            return <div className={`${calendarStyles.day} ${view === "month" && day.getMonth() !== anchorDate.getMonth() ? calendarStyles.outsideMonth : ""} ${sameDay(day, referenceDate) ? calendarStyles.today : ""}`} key={day.toISOString()} role="gridcell">
              <div className={calendarStyles.dayNumber}><span>{view === "week" ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(day) : dayFormatter.format(day)}</span></div>
              <div className={calendarStyles.dayEvents}>{visible.map((occurrence) => <button className={`${calendarStyles.eventChip} ${calendarStyles[`event${occurrence.event.type}`] ?? ""}`} key={occurrence.key} type="button" onClick={() => openEdit(occurrence.event)} title={`${timeFormatter.format(occurrence.startsAt)} · ${occurrence.event.title}`}><time>{timeFormatter.format(occurrence.startsAt)}</time><span>{occurrence.event.title}</span></button>)}{dayOccurrences.length > visible.length && <span className={calendarStyles.moreEvents}>{t("moreEvents", { count: dayOccurrences.length - visible.length })}</span>}</div>
            </div>;
          })}
        </div>
      </div>
      {calendarOccurrences.length === 0 && <p className={calendarStyles.calendarEmpty}>{t("calendarEmpty")}</p>}
    </section>}

    {editorOpen && <div className={styles.dialogBackdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="event-editor-title"><h2 id="event-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p><form onSubmit={submit}><div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-title">{t("titleLabel")}</label><input id="event-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
      <div className={styles.field}><label htmlFor="event-type">{t("type")}</label><select id="event-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as EventType })}><option value="STUDY">{t("typeStudy")}</option><option value="CLASS">{t("typeClass")}</option><option value="DEADLINE">{t("typeDeadline")}</option><option value="PERSONAL">{t("typePersonal")}</option><option value="OTHER">{t("typeOther")}</option></select></div>
      <div className={styles.field}><label htmlFor="event-subject">{common("subject")}</label><select id="event-subject" value={form.subjectId ?? ""} onChange={(event) => setForm({ ...form, subjectId: event.target.value || null })}><option value="">{t("noSubject")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="event-start">{t("startsAt")}</label><input id="event-start" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.currentTarget.value })} required /></div>
      <div className={styles.field}><label htmlFor="event-end">{t("endsAt")}</label><input id="event-end" type="datetime-local" value={form.endsAt ?? ""} onChange={(event) => setForm({ ...form, endsAt: event.currentTarget.value || null })} /></div>
      <div className={styles.field}><label htmlFor="event-recurrence">{t("recurrence")}</label><select id="event-recurrence" value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as EventRecurrence, recurrenceUntil: event.target.value === "NONE" ? null : form.recurrenceUntil })}><option value="NONE">{t("recurrenceNone")}</option><option value="WEEKLY">{t("recurrenceWeekly")}</option><option value="BIWEEKLY">{t("recurrenceBiweekly")}</option><option value="MONTHLY">{t("recurrenceMonthly")}</option></select></div>
      {form.recurrence !== "NONE" && <div className={styles.field}><label htmlFor="event-recurrence-until">{t("recurrenceUntil")}</label><input id="event-recurrence-until" type="date" value={form.recurrenceUntil ?? ""} min={form.startsAt.slice(0, 10)} onChange={(event) => setForm({ ...form, recurrenceUntil: event.currentTarget.value || null })} /><small className={calendarStyles.fieldHint}>{t("recurrenceUntilHint")}</small></div>}
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-location">{t("location")}</label><input id="event-location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} maxLength={160} /></div>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-description">{common("description")}</label><textarea id="event-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={600} /></div>
    </div><div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setEditorOpen(false)} disabled={busy}>{common("cancel")}</button><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? common("saving") : common("save")}</button></div></form></div></div>}
    {deletingEvent && <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-event-title"><h2 id="delete-event-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingEvent.title })}</p><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeletingEvent(null)} disabled={busy}>{common("cancel")}</button><button className={styles.confirmDeleteButton} type="button" onClick={remove} disabled={busy}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>}
  </div>;
}
