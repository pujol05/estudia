"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  deleteGradeAction,
  saveGradeAction,
  type GradeInput,
} from "@/app/[locale]/grades/actions";
import styles from "@/components/academic/AcademicManager.module.css";
import { Link, useRouter } from "@/i18n/navigation";
import type { GradeSummary, SubjectOption } from "@/lib/academic-types";

type Props = { initialSubjects: SubjectOption[]; initialGrades: GradeSummary[] };

function normalizedScore(grade: GradeSummary) {
  return grade.score === null ? null : (grade.score / grade.maxScore) * 10;
}

export default function GradesManager({ initialSubjects, initialGrades }: Props) {
  const t = useTranslations("Grades");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [grades, setGrades] = useState(initialGrades);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<GradeSummary | null>(null);
  const [form, setForm] = useState<GradeInput | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<GradeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase(locale);
    return grades.filter(
      (grade) =>
        (subjectFilter === "all" || grade.subject.id === subjectFilter) &&
        (!search ||
          `${grade.title} ${grade.subject.name}`
            .toLocaleLowerCase(locale)
            .includes(search)),
    );
  }, [grades, locale, query, subjectFilter]);

  const summary = useMemo(() => {
    const graded = filtered.filter(
      (grade): grade is GradeSummary & { score: number } => grade.score !== null,
    );
    if (graded.length === 0) {
      return { average: null, best: null, worst: null, total: 0 };
    }

    const values = graded.map((grade) => ({
      grade,
      value: normalizedScore(grade) as number,
    }));
    const totalWeight = graded.reduce((sum, grade) => sum + grade.weight, 0);
    const average =
      totalWeight > 0
        ? graded.reduce(
            (sum, grade) =>
              sum + (normalizedScore(grade) as number) * grade.weight,
            0,
          ) / totalWeight
        : values.reduce((sum, entry) => sum + entry.value, 0) / values.length;

    return {
      average,
      best: values.reduce((best, entry) =>
        entry.value > best.value ? entry : best,
      ),
      worst: values.reduce((worst, entry) =>
        entry.value < worst.value ? entry : worst,
      ),
      total: graded.length,
    };
  }, [filtered]);

  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 });

  function unauthorized(error: string) {
    if (error !== "unauthorized") return false;
    router.push("/login");
    router.refresh();
    return true;
  }

  function openEditor(grade: GradeSummary) {
    setSelectedGrade(grade);
    setForm({
      examId: grade.examId,
      score: grade.score,
      maxScore: grade.maxScore,
      weight: grade.weight,
    });
    setFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !selectedGrade) return;

    setBusy(true);
    setFeedback(null);
    const wasRegistered = selectedGrade.id !== null;
    const result = await saveGradeAction(form);

    if (!result.ok) {
      if (!unauthorized(result.error)) {
        setFeedback({ type: "error", text: t("saveError") });
      }
    } else {
      setGrades((current) =>
        current.map((grade) =>
          grade.examId === result.grade.examId ? result.grade : grade,
        ),
      );
      setSelectedGrade(null);
      setForm(null);
      setFeedback({
        type: "success",
        text: wasRegistered ? t("updateSuccess") : t("createSuccess"),
      });
    }
    setBusy(false);
  }

  async function remove() {
    if (!deletingGrade?.id) return;

    setBusy(true);
    const result = await deleteGradeAction(deletingGrade.id);
    if (!result.ok) {
      if (!unauthorized(result.error)) {
        setFeedback({ type: "error", text: t("deleteError") });
      }
    } else {
      setGrades((current) =>
        current.map((grade) =>
          grade.examId === result.examId
            ? { ...grade, id: null, score: null, maxScore: 10, weight: 100 }
            : grade,
        ),
      );
      setDeletingGrade(null);
      setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
        <Link className={styles.primaryButton} href="/exams">
          {t("manageExams")}
        </Link>
      </header>

      <section className={styles.summaryGrid} aria-label={t("summaryLabel")}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("average")}</span>
          <strong
            className={`${styles.summaryValue} ${
              summary.average !== null && summary.average < 5
                ? styles.summaryBad
                : styles.summaryGood
            }`}
          >
            {summary.average === null ? "—" : number(summary.average)}
          </strong>
          <span className={styles.summaryHint}>{t("weightedAverage")}</span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("best")}</span>
          <strong className={`${styles.summaryValue} ${styles.summaryAccent}`}>
            {summary.best ? number(summary.best.value) : "—"}
          </strong>
          <span className={styles.summaryHint}>
            {summary.best?.grade.title ?? t("noData")}
          </span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("worst")}</span>
          <strong className={`${styles.summaryValue} ${styles.summaryBad}`}>
            {summary.worst ? number(summary.worst.value) : "—"}
          </strong>
          <span className={styles.summaryHint}>
            {summary.worst?.grade.title ?? t("noData")}
          </span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>{t("total")}</span>
          <strong className={`${styles.summaryValue} ${styles.summaryAccent}`}>
            {summary.total}
          </strong>
          <span className={styles.summaryHint}>{t("registered")}</span>
        </article>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          <span className={`${styles.tab} ${styles.activeTab}`}>{t("bySubject")}</span>
        </div>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            aria-label={common("filterSubject")}
          >
            <option value="all">{common("allSubjects")}</option>
            {initialSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
          />
        </div>
      </div>

      {feedback && (
        <p
          className={feedback.type === "error" ? styles.error : styles.success}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.text}
        </p>
      )}

      {initialSubjects.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon}>A</div>
          <h2>{t("noSubjectsTitle")}</h2>
          <p>{t("noSubjectsText")}</p>
        </section>
      ) : grades.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon}>E</div>
          <h2>{t("noExamsTitle")}</h2>
          <p>{t("noExamsText")}</p>
          <Link className={styles.primaryButton} href="/exams">
            {t("scheduleExam")}
          </Link>
        </section>
      ) : filtered.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon}>N</div>
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyText")}</p>
        </section>
      ) : (
        <section className={styles.list} aria-label={t("listLabel")}>
          {filtered.map((grade) => {
            const normalized = normalizedScore(grade);
            return (
              <article className={styles.item} key={grade.examId}>
                <div className={styles.itemMain}>
                  <div className={styles.itemIcon}>N</div>
                  <div className={styles.itemText}>
                    <h2 className={styles.itemTitle}>{grade.subject.name}</h2>
                    <p className={styles.itemDescription}>{grade.title}</p>
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  <strong>{dateFormatter.format(new Date(grade.examDate))}</strong>
                  {grade.score === null
                    ? t("pendingGrade")
                    : t("weightValue", { weight: number(grade.weight) })}
                </div>
                <span
                  className={`${styles.badge} ${
                    normalized === null
                      ? ""
                      : normalized >= 5
                        ? styles.badgeSuccess
                        : styles.badgeDanger
                  }`}
                >
                  {normalized === null ? t("notGraded") : `${number(normalized)} / 10`}
                </span>
                <div className={styles.itemActions}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => openEditor(grade)}
                    disabled={busy}
                  >
                    {grade.id ? common("edit") : t("addGrade")}
                  </button>
                  {grade.id && (
                    <button
                      className={styles.dangerButton}
                      type="button"
                      onClick={() => setDeletingGrade(grade)}
                      disabled={busy}
                    >
                      {t("removeGrade")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedGrade && form && (
        <div className={styles.dialogBackdrop}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="grade-editor-title"
          >
            <h2 id="grade-editor-title">
              {selectedGrade.id ? t("editTitle") : t("createTitle")}
            </h2>
            <p>{t("formHelp")}</p>
            <form onSubmit={submit}>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label>{t("exam")}</label>
                  <strong>
                    {selectedGrade.title} · {selectedGrade.subject.name}
                  </strong>
                </div>
                <div className={styles.field}>
                  <label htmlFor="grade-score">{t("score")}</label>
                  <input
                    id="grade-score"
                    type="number"
                    min="0"
                    max={form.maxScore}
                    step="0.01"
                    value={form.score ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        score:
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                      })
                    }
                    required
                    autoFocus
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="grade-max">{t("maxScore")}</label>
                  <input
                    id="grade-max"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={form.maxScore}
                    onChange={(event) =>
                      setForm({ ...form, maxScore: Number(event.target.value) })
                    }
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="grade-weight">{t("weight")}</label>
                  <input
                    id="grade-weight"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={form.weight}
                    onChange={(event) =>
                      setForm({ ...form, weight: Number(event.target.value) })
                    }
                    required
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => {
                    setSelectedGrade(null);
                    setForm(null);
                  }}
                  disabled={busy}
                >
                  {common("cancel")}
                </button>
                <button className={styles.primaryButton} type="submit" disabled={busy}>
                  {busy ? common("saving") : common("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingGrade && (
        <div className={styles.dialogBackdrop}>
          <div
            className={`${styles.dialog} ${styles.dialogSmall}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-grade-title"
          >
            <h2 id="delete-grade-title">{t("deleteTitle")}</h2>
            <p>{t("deleteText", { title: deletingGrade.title })}</p>
            <div className={styles.dialogActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setDeletingGrade(null)}
                disabled={busy}
              >
                {common("cancel")}
              </button>
              <button
                className={styles.confirmDeleteButton}
                type="button"
                onClick={remove}
                disabled={busy}
              >
                {busy ? common("deleting") : common("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
