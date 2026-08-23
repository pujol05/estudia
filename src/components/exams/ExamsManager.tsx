"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createExamAction, deleteExamAction, updateExamAction, type ExamInput } from "@/app/[locale]/exams/actions";
import styles from "@/components/academic/AcademicManager.module.css";
import { useRouter } from "@/i18n/navigation";
import type { ExamSummary, ExamType, SubjectOption } from "@/lib/academic-types";

type Props = { referenceTime: string; initialSubjects: SubjectOption[]; initialExams: ExamSummary[] };
type ExamFilter = "upcoming" | "past" | "all";

const EMPTY_FORM: ExamInput = { title: "", description: "", examDate: "", type: "FINAL", completed: false, score: null, subjectId: "" };

function toDateTimeInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function ExamsManager({ referenceTime, initialSubjects, initialExams }: Props) {
  const t = useTranslations("Exams");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [exams, setExams] = useState(initialExams);
  const [filter, setFilter] = useState<ExamFilter>("upcoming");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ExamInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingExam, setDeletingExam] = useState<ExamSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const formatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }), [locale]);

  const filteredExams = useMemo(() => {
    const now = new Date(referenceTime).getTime();
    const search = query.trim().toLocaleLowerCase(locale);
    return exams.filter((exam) => {
      const isPast = exam.completed || new Date(exam.examDate).getTime() < now;
      const matchesFilter = filter === "all" || (filter === "past" ? isPast : !isPast);
      const matchesSubject = subjectFilter === "all" || exam.subject.id === subjectFilter;
      const matchesSearch = !search || `${exam.title} ${exam.subject.name} ${exam.description ?? ""}`.toLocaleLowerCase(locale).includes(search);
      return matchesFilter && matchesSubject && matchesSearch;
    });
  }, [exams, filter, locale, query, referenceTime, subjectFilter]);

  function unauthorized(error: string) {
    if (error !== "unauthorized") return false;
    router.push("/login"); router.refresh(); return true;
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, subjectId: initialSubjects[0]?.id ?? "" });
    setFeedback(null); setEditorOpen(true);
  }

  function openEdit(exam: ExamSummary) {
    setEditingId(exam.id);
    setForm({ title: exam.title, description: exam.description ?? "", examDate: toDateTimeInput(exam.examDate), type: exam.type, completed: exam.completed, score: exam.score, subjectId: exam.subject.id });
    setFeedback(null); setEditorOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback(null);
    const input = { ...form, examDate: new Date(form.examDate).toISOString() };
    const result = editingId ? await updateExamAction(editingId, input) : await createExamAction(input);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
    } else {
      setExams((current) => editingId ? current.map((exam) => exam.id === result.exam.id ? result.exam : exam) : [...current, result.exam]);
      setEditorOpen(false); setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
    }
    setBusy(false);
  }

  async function remove() {
    if (!deletingExam) return;
    setBusy(true);
    const result = await deleteExamAction(deletingExam.id);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: t("deleteError") });
    } else {
      setExams((current) => current.filter((exam) => exam.id !== result.examId));
      setDeletingExam(null); setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(false);
  }

  function typeLabel(type: ExamType) { return t(`type${type[0]}${type.slice(1).toLowerCase()}`); }

  return (
    <div className={styles.page}>
      <header className={styles.heading}><div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div><button className={styles.primaryButton} type="button" onClick={openCreate} disabled={initialSubjects.length === 0}>{t("new")}</button></header>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>{(["upcoming", "past", "all"] as ExamFilter[]).map((value) => <button key={value} className={`${styles.tab} ${filter === value ? styles.activeTab : ""}`} type="button" onClick={() => setFilter(value)}>{t(value)}</button>)}</div>
        <div className={styles.filters}><select className={styles.filterSelect} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={common("filterSubject")}><option value="all">{common("allSubjects")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input className={styles.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} /></div>
      </div>
      {feedback && <p className={feedback.type === "error" ? styles.error : styles.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      {initialSubjects.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>A</div><h2>{t("noSubjectsTitle")}</h2><p>{t("noSubjectsText")}</p></section> : filteredExams.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>E</div><h2>{t("emptyTitle")}</h2><p>{t("emptyText")}</p><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></section> : (
        <section className={styles.list} aria-label={t("listLabel")}>
          {filteredExams.map((exam) => <article className={styles.item} key={exam.id}>
            <div className={styles.itemMain}><div className={styles.itemIcon}>E</div><div className={styles.itemText}><h2 className={styles.itemTitle}>{exam.subject.name}</h2><p className={styles.itemDescription}>{exam.title}{exam.description ? ` · ${exam.description}` : ""}</p></div></div>
            <div className={styles.itemMeta}><strong>{formatter.format(new Date(exam.examDate))}</strong>{exam.completed ? t("completed") : t("scheduled")}</div>
            <span className={`${styles.badge} ${exam.score !== null ? (exam.score >= 5 ? styles.badgeSuccess : styles.badgeDanger) : ""}`}>{exam.score !== null ? `${exam.score.toLocaleString(locale)}/10` : typeLabel(exam.type)}</span>
            <div className={styles.itemActions}><button className={styles.secondaryButton} type="button" onClick={() => openEdit(exam)} disabled={busy}>{common("edit")}</button><button className={styles.dangerButton} type="button" onClick={() => setDeletingExam(exam)} disabled={busy}>{common("delete")}</button></div>
          </article>)}
        </section>
      )}

      {editorOpen && <div className={styles.dialogBackdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="exam-editor-title"><h2 id="exam-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p><form onSubmit={submit}><div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="exam-title">{t("titleLabel")}</label><input id="exam-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
        <div className={styles.field}><label htmlFor="exam-subject">{common("subject")}</label><select id="exam-subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="exam-type">{t("type")}</label><select id="exam-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ExamType })}><option value="FINAL">{t("typeFinal")}</option><option value="MIDTERM">{t("typeMidterm")}</option><option value="PRACTICAL">{t("typePractical")}</option><option value="ORAL">{t("typeOral")}</option><option value="OTHER">{t("typeOther")}</option></select></div>
        <div className={styles.field}><label htmlFor="exam-date">{t("date")}</label><input id="exam-date" type="datetime-local" value={form.examDate} onInput={(e) => setForm({ ...form, examDate: e.currentTarget.value })} onChange={(e) => setForm({ ...form, examDate: e.currentTarget.value })} required /></div>
        <div className={styles.field}><label htmlFor="exam-status">{common("status")}</label><select id="exam-status" value={form.completed ? "completed" : "scheduled"} onChange={(e) => setForm({ ...form, completed: e.target.value === "completed" })}><option value="scheduled">{t("scheduled")}</option><option value="completed">{t("completed")}</option></select></div>
        <div className={styles.field}><label htmlFor="exam-score">{t("score")}</label><input id="exam-score" type="number" min="0" max="10" step="0.01" value={form.score ?? ""} onChange={(e) => setForm({ ...form, score: e.target.value === "" ? null : Number(e.target.value) })} /></div>
        <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="exam-description">{common("description")}</label><textarea id="exam-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={600} /></div>
      </div><div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setEditorOpen(false)} disabled={busy}>{common("cancel")}</button><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? common("saving") : common("save")}</button></div></form></div></div>}

      {deletingExam && <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-exam-title"><h2 id="delete-exam-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingExam.title })}</p><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeletingExam(null)} disabled={busy}>{common("cancel")}</button><button className={styles.confirmDeleteButton} type="button" onClick={remove} disabled={busy}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>}
    </div>
  );
}
