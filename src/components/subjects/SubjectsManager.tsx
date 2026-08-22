"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import {
  createSubjectAction,
  deleteSubjectAction,
  updateSubjectAction,
  type SubjectActionError,
  type SubjectSummary,
} from "@/app/[locale]/subjects/actions";
import { useRouter } from "@/i18n/navigation";

import styles from "./SubjectsManager.module.css";

type Props = {
  initialSubjects: SubjectSummary[];
};

type Feedback = {
  type: "error" | "success";
  message: string;
} | null;

function sortSubjects(subjects: SubjectSummary[]) {
  return [...subjects].sort((first, second) =>
    first.name.localeCompare(second.name),
  );
}

export default function SubjectsManager({ initialSubjects }: Props) {
  const t = useTranslations("Subjects");
  const router = useRouter();
  const [subjects, setSubjects] = useState(initialSubjects);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState("");
  const [deletingSubject, setDeletingSubject] = useState<SubjectSummary | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const isBusy = busyAction !== null;

  function getErrorMessage(error: SubjectActionError) {
    switch (error) {
      case "invalidName":
        return t("nameError");
      case "duplicate":
        return t("duplicateError");
      case "notFound":
        return t("notFoundError");
      default:
        return t("saveError");
    }
  }

  function handleUnauthorized(error: SubjectActionError) {
    if (error !== "unauthorized") {
      return false;
    }

    router.push("/login");
    router.refresh();
    return true;
  }

  function openCreateForm() {
    setFeedback(null);
    setEditingSubjectId(null);
    setIsCreateOpen(true);
  }

  function closeCreateForm() {
    setIsCreateOpen(false);
    setNewSubjectName("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyAction("create");

    const result = await createSubjectAction(newSubjectName);

    if (!result.ok) {
      if (!handleUnauthorized(result.error)) {
        setFeedback({ type: "error", message: getErrorMessage(result.error) });
      }
      setBusyAction(null);
      return;
    }

    setSubjects((currentSubjects) =>
      sortSubjects([...currentSubjects, result.subject]),
    );
    closeCreateForm();
    setFeedback({ type: "success", message: t("createSuccess") });
    setBusyAction(null);
  }

  function openEditForm(subject: SubjectSummary) {
    setFeedback(null);
    setIsCreateOpen(false);
    setEditingSubjectId(subject.id);
    setEditingSubjectName(subject.name);
  }

  function closeEditForm() {
    setEditingSubjectId(null);
    setEditingSubjectName("");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingSubjectId) {
      return;
    }

    const subjectId = editingSubjectId;
    setFeedback(null);
    setBusyAction(`update:${subjectId}`);

    const result = await updateSubjectAction(subjectId, editingSubjectName);

    if (!result.ok) {
      if (!handleUnauthorized(result.error)) {
        setFeedback({ type: "error", message: getErrorMessage(result.error) });
      }
      setBusyAction(null);
      return;
    }

    setSubjects((currentSubjects) =>
      sortSubjects(
        currentSubjects.map((subject) =>
          subject.id === result.subject.id
            ? { ...subject, name: result.subject.name }
            : subject,
        ),
      ),
    );
    closeEditForm();
    setFeedback({ type: "success", message: t("updateSuccess") });
    setBusyAction(null);
  }

  async function handleDelete() {
    if (!deletingSubject) {
      return;
    }

    const subjectId = deletingSubject.id;
    setFeedback(null);
    setBusyAction(`delete:${subjectId}`);

    const result = await deleteSubjectAction(subjectId);

    if (!result.ok) {
      if (!handleUnauthorized(result.error)) {
        setFeedback({
          type: "error",
          message:
            result.error === "unknown"
              ? t("deleteError")
              : getErrorMessage(result.error),
        });
      }
      setBusyAction(null);
      return;
    }

    setSubjects((currentSubjects) =>
      currentSubjects.filter((subject) => subject.id !== result.subjectId),
    );
    setDeletingSubject(null);
    setFeedback({ type: "success", message: t("deleteSuccess") });
    setBusyAction(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>
            {t("subjectCount", { count: subjects.length })}
          </p>
          <h1>{t("title")}</h1>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        {!isCreateOpen && (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={openCreateForm}
            disabled={isBusy}
          >
            {t("newSubject")}
          </button>
        )}
      </div>

      {isCreateOpen && (
        <section className={styles.editor} aria-labelledby="new-subject-title">
          <div className={styles.editorHeading}>
            <div>
              <h2 id="new-subject-title">{t("createTitle")}</h2>
              <p>{t("formHelp")}</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.field}>
              <label htmlFor="new-subject-name">{t("nameLabel")}</label>
              <input
                id="new-subject-name"
                type="text"
                value={newSubjectName}
                onChange={(event) => setNewSubjectName(event.target.value)}
                placeholder={t("namePlaceholder")}
                minLength={2}
                maxLength={80}
                autoComplete="off"
                autoFocus
                required
                disabled={isBusy}
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeCreateForm}
                disabled={isBusy}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={isBusy}
              >
                {busyAction === "create" ? t("creating") : t("create")}
              </button>
            </div>
          </form>
        </section>
      )}

      {feedback && (
        <p
          className={
            feedback.type === "error" ? styles.error : styles.success
          }
          role={feedback.type === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      {subjects.length === 0 ? (
        <section className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            A
          </div>
          <h2>{t("emptyTitle")}</h2>
          <p>{t("emptyText")}</p>
          {!isCreateOpen && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openCreateForm}
            >
              {t("emptyAction")}
            </button>
          )}
        </section>
      ) : (
        <section className={styles.subjectsGrid} aria-label={t("listLabel")}>
          {subjects.map((subject) => {
            const isEditing = editingSubjectId === subject.id;

            return (
              <article className={styles.subjectCard} key={subject.id}>
                {isEditing ? (
                  <form className={styles.editForm} onSubmit={handleUpdate}>
                    <div className={styles.field}>
                      <label htmlFor={`subject-${subject.id}`}>
                        {t("nameLabel")}
                      </label>
                      <input
                        id={`subject-${subject.id}`}
                        type="text"
                        value={editingSubjectName}
                        onChange={(event) =>
                          setEditingSubjectName(event.target.value)
                        }
                        minLength={2}
                        maxLength={80}
                        autoComplete="off"
                        autoFocus
                        required
                        disabled={isBusy}
                      />
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={closeEditForm}
                        disabled={isBusy}
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={isBusy}
                      >
                        {busyAction === `update:${subject.id}`
                          ? t("saving")
                          : t("save")}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.cardContent}>
                      <div className={styles.subjectInitial} aria-hidden="true">
                        {subject.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2>{subject.name}</h2>
                        <p>
                          {t("taskCount", { count: subject.taskCount })}
                        </p>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => openEditForm(subject)}
                        disabled={isBusy}
                      >
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => {
                          setFeedback(null);
                          setDeletingSubject(subject);
                        }}
                        disabled={isBusy}
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}

      {deletingSubject && (
        <div className={styles.dialogBackdrop}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-subject-title"
            aria-describedby="delete-subject-description"
          >
            <h2 id="delete-subject-title">{t("deleteTitle")}</h2>
            <p id="delete-subject-description">
              {t("deleteDescription", { name: deletingSubject.name })}
            </p>
            <p className={styles.deleteWarning}>{t("deleteWarning")}</p>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setDeletingSubject(null)}
                disabled={isBusy}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={handleDelete}
                disabled={isBusy}
              >
                {busyAction === `delete:${deletingSubject.id}`
                  ? t("deleting")
                  : t("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
