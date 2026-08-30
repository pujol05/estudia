"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { createExamAction } from "@/app/[locale]/exams/actions";
import { createSubjectAction } from "@/app/[locale]/subjects/actions";
import { createTaskAction } from "@/app/[locale]/tasks/actions";
import { useRouter } from "@/i18n/navigation";

import styles from "./Onboarding.module.css";

type Subject = {
  id: string;
  name: string;
};

type Props = {
  initialSubjects: Subject[];
};

type PlanningType = "task" | "exam";

function defaultExamDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(10, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export default function Onboarding({ initialSubjects }: Props) {
  const t = useTranslations("Onboarding");
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [subjectName, setSubjectName] = useState("");
  const [planningType, setPlanningType] = useState<PlanningType>("task");
  const [planningTitle, setPlanningTitle] = useState("");
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [createdItem, setCreatedItem] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasSubject = subjects.length > 0;

  function submitSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createSubjectAction(subjectName);

      if (!result.ok) {
        setError(t(result.error === "duplicate" ? "subjectDuplicateError" : "subjectError"));
        return;
      }

      setSubjects((current) => [...current, { id: result.subject.id, name: result.subject.name }]);
      setSubjectName("");
    });
  }

  function submitPlanning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const subjectId = subjects[0]?.id;
    if (!subjectId) return;

    startTransition(async () => {
      const result = planningType === "task"
        ? await createTaskAction({
            title: planningTitle,
            description: "",
            dueDate: null,
            priority: "MEDIUM",
            status: "TODO",
            subjectId,
          })
        : await createExamAction({
            title: planningTitle,
            description: "",
            examDate,
            type: "FINAL",
            completed: false,
            subjectId,
          });

      if (!result.ok) {
        setError(t("planningError"));
        return;
      }

      setPlanningTitle("");
      setCreatedItem(true);
    });
  }

  return (
    <section className={styles.onboarding} aria-labelledby="onboarding-title">
      <div className={styles.heading}>
        <span className={styles.kicker}>{t("kicker")}</span>
        <div>
          <h2 id="onboarding-title">{createdItem ? t("completeTitle") : t("title")}</h2>
          <p>{createdItem ? t("completeText") : t("subtitle")}</p>
        </div>
      </div>

      <ol className={styles.steps}>
        <li className={hasSubject ? styles.complete : styles.active}>
          <span className={styles.stepNumber}>{hasSubject ? "✓" : "1"}</span>
          <div className={styles.stepContent}>
            <div className={styles.stepCopy}>
              <h3>{t("subjectTitle")}</h3>
              <p>{hasSubject ? t("subjectComplete", { name: subjects[0]?.name ?? "" }) : t("subjectText")}</p>
            </div>
            {!hasSubject && (
              <form className={styles.inlineForm} onSubmit={submitSubject}>
                <label className={styles.srOnly} htmlFor="onboarding-subject">{t("subjectLabel")}</label>
                <input
                  id="onboarding-subject"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder={t("subjectPlaceholder")}
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={isPending}
                />
                <button type="submit" disabled={isPending}>{isPending ? t("creating") : t("createSubject")}</button>
              </form>
            )}
          </div>
        </li>

        <li className={createdItem ? styles.complete : hasSubject ? styles.active : styles.locked}>
          <span className={styles.stepNumber}>{createdItem ? "✓" : "2"}</span>
          <div className={styles.stepContent}>
            <div className={styles.stepCopy}>
              <h3>{t("planningTitle")}</h3>
              <p>{createdItem ? t("planningComplete") : t("planningText")}</p>
            </div>
            {hasSubject && !createdItem && (
              <form className={styles.planningForm} onSubmit={submitPlanning}>
                <div className={styles.typeToggle} role="group" aria-label={t("planningTypeLabel")}>
                  <button className={planningType === "task" ? styles.selectedType : ""} type="button" onClick={() => setPlanningType("task")}>{t("task")}</button>
                  <button className={planningType === "exam" ? styles.selectedType : ""} type="button" onClick={() => setPlanningType("exam")}>{t("exam")}</button>
                </div>
                <div className={styles.inlineForm}>
                  <label className={styles.srOnly} htmlFor="onboarding-item">{planningType === "task" ? t("taskLabel") : t("examLabel")}</label>
                  <input
                    id="onboarding-item"
                    value={planningTitle}
                    onChange={(event) => setPlanningTitle(event.target.value)}
                    placeholder={planningType === "task" ? t("taskPlaceholder") : t("examPlaceholder")}
                    minLength={2}
                    maxLength={120}
                    required
                    disabled={isPending}
                  />
                  {planningType === "exam" && (
                    <input
                      aria-label={t("examDateLabel")}
                      className={styles.dateInput}
                      type="datetime-local"
                      value={examDate}
                      onChange={(event) => setExamDate(event.target.value)}
                      required
                      disabled={isPending}
                    />
                  )}
                  <button type="submit" disabled={isPending}>{isPending ? t("creating") : t("createPlanning")}</button>
                </div>
              </form>
            )}
          </div>
        </li>

        <li className={createdItem ? styles.active : styles.locked}>
          <span className={styles.stepNumber}>3</span>
          <div className={styles.stepContent}>
            <div className={styles.stepCopy}>
              <h3>{t("summaryTitle")}</h3>
              <p>{createdItem ? t("summaryReady") : t("summaryText")}</p>
            </div>
            {createdItem && <button className={styles.summaryButton} type="button" onClick={() => router.refresh()}>{t("viewSummary")} <span aria-hidden="true">→</span></button>}
          </div>
        </li>
      </ol>

      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
