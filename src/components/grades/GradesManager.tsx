"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { createGradeAction, deleteGradeAction, updateGradeAction, type GradeInput } from "@/app/[locale]/grades/actions";
import styles from "@/components/academic/AcademicManager.module.css";
import { useRouter } from "@/i18n/navigation";
import type { GradeSummary, SubjectOption } from "@/lib/academic-types";

type Props = { initialSubjects: SubjectOption[]; initialGrades: GradeSummary[] };

const EMPTY_FORM: GradeInput = { title: "", score: 0, maxScore: 10, weight: 100, gradedAt: "", subjectId: "" };

function toDateInput(value: string) { return value.slice(0, 10); }
function normalizedScore(grade: GradeSummary) { return (grade.score / grade.maxScore) * 10; }

export default function GradesManager({ initialSubjects, initialGrades }: Props) {
  const t = useTranslations("Grades");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [grades, setGrades] = useState(initialGrades);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<GradeInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deletingGrade, setDeletingGrade] = useState<GradeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return grades.filter((grade) => (subjectFilter === "all" || grade.subject.id === subjectFilter) && (!search || `${grade.title} ${grade.subject.name}`.toLocaleLowerCase(locale).includes(search)));
  }, [grades, locale, query, subjectFilter]);

  const summary = useMemo(() => {
    if (grades.length === 0) return { average: null, best: null, worst: null };
    const values = grades.map((grade) => ({ grade, value: normalizedScore(grade) }));
    const totalWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
    const average = totalWeight > 0 ? grades.reduce((sum, grade) => sum + normalizedScore(grade) * grade.weight, 0) / totalWeight : values.reduce((sum, entry) => sum + entry.value, 0) / values.length;
    return { average, best: values.reduce((best, entry) => entry.value > best.value ? entry : best), worst: values.reduce((worst, entry) => entry.value < worst.value ? entry : worst) };
  }, [grades]);

  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });
  function unauthorized(error: string) { if (error !== "unauthorized") return false; router.push("/login"); router.refresh(); return true; }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, subjectId: initialSubjects[0]?.id ?? "", gradedAt: new Date().toISOString().slice(0, 10) });
    setFeedback(null); setEditorOpen(true);
  }

  function openEdit(grade: GradeSummary) {
    setEditingId(grade.id);
    setForm({ title: grade.title, score: grade.score, maxScore: grade.maxScore, weight: grade.weight, gradedAt: toDateInput(grade.gradedAt), subjectId: grade.subject.id });
    setFeedback(null); setEditorOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback(null);
    const input = { ...form, gradedAt: new Date(`${form.gradedAt}T12:00:00`).toISOString() };
    const result = editingId ? await updateGradeAction(editingId, input) : await createGradeAction(input);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
    } else {
      setGrades((current) => editingId ? current.map((grade) => grade.id === result.grade.id ? result.grade : grade) : [result.grade, ...current]);
      setEditorOpen(false); setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
    }
    setBusy(false);
  }

  async function remove() {
    if (!deletingGrade) return;
    setBusy(true);
    const result = await deleteGradeAction(deletingGrade.id);
    if (!result.ok) {
      if (!unauthorized(result.error)) setFeedback({ type: "error", text: t("deleteError") });
    } else {
      setGrades((current) => current.filter((grade) => grade.id !== result.gradeId));
      setDeletingGrade(null); setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(false);
  }

  return <div className={styles.page}>
    <header className={styles.heading}><div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div><button className={styles.primaryButton} type="button" onClick={openCreate} disabled={initialSubjects.length === 0}>{t("new")}</button></header>
    <section className={styles.summaryGrid} aria-label={t("summaryLabel")}>
      <article className={styles.summaryCard}><span className={styles.summaryLabel}>{t("average")}</span><strong className={`${styles.summaryValue} ${styles.summaryGood}`}>{summary.average === null ? "—" : number(summary.average)}</strong><span className={styles.summaryHint}>{t("weightedAverage")}</span></article>
      <article className={styles.summaryCard}><span className={styles.summaryLabel}>{t("best")}</span><strong className={`${styles.summaryValue} ${styles.summaryAccent}`}>{summary.best ? number(summary.best.value) : "—"}</strong><span className={styles.summaryHint}>{summary.best?.grade.title ?? t("noData")}</span></article>
      <article className={styles.summaryCard}><span className={styles.summaryLabel}>{t("worst")}</span><strong className={`${styles.summaryValue} ${styles.summaryBad}`}>{summary.worst ? number(summary.worst.value) : "—"}</strong><span className={styles.summaryHint}>{summary.worst?.grade.title ?? t("noData")}</span></article>
      <article className={styles.summaryCard}><span className={styles.summaryLabel}>{t("total")}</span><strong className={`${styles.summaryValue} ${styles.summaryAccent}`}>{grades.length}</strong><span className={styles.summaryHint}>{t("registered")}</span></article>
    </section>
    <div className={styles.toolbar}><div className={styles.tabs}><span className={`${styles.tab} ${styles.activeTab}`}>{t("bySubject")}</span></div><div className={styles.filters}><select className={styles.filterSelect} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={common("filterSubject")}><option value="all">{common("allSubjects")}</option>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input className={styles.search} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} /></div></div>
    {feedback && <p className={feedback.type === "error" ? styles.error : styles.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
    {initialSubjects.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>A</div><h2>{t("noSubjectsTitle")}</h2><p>{t("noSubjectsText")}</p></section> : filtered.length === 0 ? <section className={styles.emptyState}><div className={styles.emptyIcon}>N</div><h2>{t("emptyTitle")}</h2><p>{t("emptyText")}</p><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></section> : <section className={styles.list} aria-label={t("listLabel")}>
      {filtered.map((grade) => { const normalized = normalizedScore(grade); return <article className={styles.item} key={grade.id}>
        <div className={styles.itemMain}><div className={styles.itemIcon}>N</div><div className={styles.itemText}><h2 className={styles.itemTitle}>{grade.subject.name}</h2><p className={styles.itemDescription}>{grade.title}</p></div></div>
        <div className={styles.itemMeta}><strong>{number(grade.score)} / {number(grade.maxScore)}</strong>{t("weightValue", { weight: number(grade.weight) })}</div>
        <span className={`${styles.badge} ${normalized >= 5 ? styles.badgeSuccess : styles.badgeDanger}`}>{number(normalized)} / 10</span>
        <div className={styles.itemActions}><button className={styles.secondaryButton} type="button" onClick={() => openEdit(grade)} disabled={busy}>{common("edit")}</button><button className={styles.dangerButton} type="button" onClick={() => setDeletingGrade(grade)} disabled={busy}>{common("delete")}</button></div>
      </article>; })}
    </section>}

    {editorOpen && <div className={styles.dialogBackdrop}><div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="grade-editor-title"><h2 id="grade-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p><form onSubmit={submit}><div className={styles.formGrid}>
      <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="grade-title">{t("titleLabel")}</label><input id="grade-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
      <div className={styles.field}><label htmlFor="grade-subject">{common("subject")}</label><select id="grade-subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
      <div className={styles.field}><label htmlFor="grade-date">{t("date")}</label><input id="grade-date" type="date" value={form.gradedAt} onInput={(e) => setForm({ ...form, gradedAt: e.currentTarget.value })} onChange={(e) => setForm({ ...form, gradedAt: e.currentTarget.value })} required /></div>
      <div className={styles.field}><label htmlFor="grade-score">{t("score")}</label><input id="grade-score" type="number" min="0" max="100" step="0.01" value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} required /></div>
      <div className={styles.field}><label htmlFor="grade-max">{t("maxScore")}</label><input id="grade-max" type="number" min="0.01" max="100" step="0.01" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) })} required /></div>
      <div className={styles.field}><label htmlFor="grade-weight">{t("weight")}</label><input id="grade-weight" type="number" min="0.01" max="100" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} required /></div>
    </div><div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setEditorOpen(false)} disabled={busy}>{common("cancel")}</button><button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? common("saving") : common("save")}</button></div></form></div></div>}
    {deletingGrade && <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-grade-title"><h2 id="delete-grade-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingGrade.title })}</p><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeletingGrade(null)} disabled={busy}>{common("cancel")}</button><button className={styles.confirmDeleteButton} type="button" onClick={remove} disabled={busy}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>}
  </div>;
}
