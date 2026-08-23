"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createEventAction, deleteEventAction, updateEventAction, type EventInput } from "@/app/[locale]/events/actions";
import styles from "@/components/academic/AcademicManager.module.css";
import { useRouter } from "@/i18n/navigation";
import type { EventSummary, EventType, SubjectOption } from "@/lib/academic-types";

type Props = { referenceTime: string; initialSubjects: SubjectOption[]; initialEvents: EventSummary[] };
type EventFilter = "upcoming" | "past" | "all";
const EMPTY_FORM: EventInput = { title: "", description: "", startsAt: "", endsAt: null, location: "", type: "STUDY", subjectId: null };

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function EventsManager({ referenceTime, initialSubjects, initialEvents }: Props) {
  const t = useTranslations("Events");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState<EventFilter>("upcoming");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<EventSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);

  const filtered = useMemo(() => {
    const now = new Date(referenceTime).getTime();
    const search = query.trim().toLocaleLowerCase(locale);
    return events.filter((event) => {
      const isPast = new Date(event.endsAt ?? event.startsAt).getTime() < now;
      return (filter === "all" || (filter === "past" ? isPast : !isPast)) && (subjectFilter === "all" || (subjectFilter === "none" ? event.subject === null : event.subject?.id === subjectFilter)) && (!search || `${event.title} ${event.description ?? ""} ${event.location ?? ""} ${event.subject?.name ?? ""}`.toLocaleLowerCase(locale).includes(search));
    });
  }, [events, filter, locale, query, referenceTime, subjectFilter]);

  function unauthorized(error: string) { if (error !== "unauthorized") return false; router.push("/login"); router.refresh(); return true; }
  function openCreate() { setEditingId(null); setForm(EMPTY_FORM); setFeedback(null); setEditorOpen(true); }
  function openEdit(event: EventSummary) {
    setEditingId(event.id);
    setForm({ title: event.title, description: event.description ?? "", startsAt: toDateTimeInput(event.startsAt), endsAt: event.endsAt ? toDateTimeInput(event.endsAt) : null, location: event.location ?? "", type: event.type, subjectId: event.subject?.id ?? null });
    setFeedback(null); setEditorOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback(null);
    const input = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null };
    const result = editingId ? await updateEventAction(editingId, input) : await createEventAction(input);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
    } else {
      setEvents((current) => editingId ? current.map((item) => item.id === result.event.id ? result.event : item) : [...current, result.event]);
      setEditorOpen(false); setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
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
      setDeletingEvent(null); setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(false);
  }

  function typeLabel(type: EventType) { return t(`type${type[0]}${type.slice(1).toLowerCase()}`); }

  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></header>
    <div className={styles.toolbar}><div className={styles.tabs}>{(["upcoming", "past", "all"] as EventFilter[]).map((value) => <button key={value} className={`${styles.tab} ${filter === value ? styles.activeTab : ""}`} type="button" onClick={() => setFilter(value)}>{t(value)}</button>)}</div><div className={styles.filters}><select className={styles.filterSelect} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={common("filterSubject")}><option value="all">{common("allSubjects")}</option><option value="none">{t("noSubject")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input className={styles.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} /></div></div>
    {feedback && <p className={feedback.type === "error" ? styles.error : styles.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
    {filtered.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>D</div><h2>{t("emptyTitle")}</h2><p>{t("emptyText")}</p><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></section> : <section className={styles.list} aria-label={t("listLabel")}>
      {filtered.map((event) => <article className={styles.item} key={event.id}>
        <div className={styles.itemMain}><div className={styles.itemIcon}>D</div><div className={styles.itemText}><h2 className={styles.itemTitle}>{event.title}</h2><p className={styles.itemDescription}>{event.description || event.subject?.name || t("noSubject")}</p></div></div>
        <div className={styles.itemMeta}><strong>{formatter.format(new Date(event.startsAt))}</strong>{event.endsAt ? t("ends", { date: formatter.format(new Date(event.endsAt)) }) : event.location || t("noLocation")}</div>
        <span className={styles.badge}>{typeLabel(event.type)}</span>
        <div className={styles.itemActions}><button className={styles.secondaryButton} type="button" onClick={() => openEdit(event)} disabled={busy}>{common("edit")}</button><button className={styles.dangerButton} type="button" onClick={() => setDeletingEvent(event)} disabled={busy}>{common("delete")}</button></div>
      </article>)}
    </section>}

    {editorOpen && <div className={styles.dialogBackdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="event-editor-title"><h2 id="event-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p><form onSubmit={submit}><div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-title">{t("titleLabel")}</label><input id="event-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
      <div className={styles.field}><label htmlFor="event-type">{t("type")}</label><select id="event-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}><option value="STUDY">{t("typeStudy")}</option><option value="CLASS">{t("typeClass")}</option><option value="DEADLINE">{t("typeDeadline")}</option><option value="PERSONAL">{t("typePersonal")}</option><option value="OTHER">{t("typeOther")}</option></select></div>
      <div className={styles.field}><label htmlFor="event-subject">{common("subject")}</label><select id="event-subject" value={form.subjectId ?? ""} onChange={(e) => setForm({ ...form, subjectId: e.target.value || null })}><option value="">{t("noSubject")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="event-start">{t("startsAt")}</label><input id="event-start" type="datetime-local" value={form.startsAt} onInput={(e) => setForm({ ...form, startsAt: e.currentTarget.value })} onChange={(e) => setForm({ ...form, startsAt: e.currentTarget.value })} required /></div>
      <div className={styles.field}><label htmlFor="event-end">{t("endsAt")}</label><input id="event-end" type="datetime-local" value={form.endsAt ?? ""} onInput={(e) => setForm({ ...form, endsAt: e.currentTarget.value || null })} onChange={(e) => setForm({ ...form, endsAt: e.currentTarget.value || null })} /></div>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-location">{t("location")}</label><input id="event-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={160} /></div>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="event-description">{common("description")}</label><textarea id="event-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={600} /></div>
    </div><div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setEditorOpen(false)} disabled={busy}>{common("cancel")}</button><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? common("saving") : common("save")}</button></div></form></div></div>}
    {deletingEvent && <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-event-title"><h2 id="delete-event-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingEvent.title })}</p><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeletingEvent(null)} disabled={busy}>{common("cancel")}</button><button className={styles.confirmDeleteButton} type="button" onClick={remove} disabled={busy}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>}
  </div>;
}
