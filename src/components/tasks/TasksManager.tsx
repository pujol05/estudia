"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  createTaskAction,
  deleteTaskAction,
  setTaskCompletedAction,
  updateTaskAction,
  type TaskInput,
} from "@/app/[locale]/tasks/actions";
import { useRouter } from "@/i18n/navigation";
import type {
  SubjectOption,
  TaskPriority,
  TaskSummary,
} from "@/lib/academic-types";

import styles from "@/components/academic/AcademicManager.module.css";

type Props = {
  initialSubjects: SubjectOption[];
  initialTasks: TaskSummary[];
};

type StatusFilter = "all" | "pending" | "completed";

const EMPTY_FORM: TaskInput = {
  title: "",
  description: "",
  dueDate: null,
  priority: "MEDIUM",
  subjectId: "",
};

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export default function TasksManager({ initialSubjects, initialTasks }: Props) {
  const t = useTranslations("Tasks");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<TaskInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<TaskSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return tasks.filter((task) => {
      const matchesStatus = status === "all" || (status === "completed" ? task.completed : !task.completed);
      const matchesSubject = subjectFilter === "all" || task.subject.id === subjectFilter;
      const matchesQuery = !normalizedQuery || `${task.title} ${task.description ?? ""} ${task.subject.name}`.toLocaleLowerCase(locale).includes(normalizedQuery);
      return matchesStatus && matchesSubject && matchesQuery;
    });
  }, [locale, query, status, subjectFilter, tasks]);

  function handleUnauthorized(error: string) {
    if (error !== "unauthorized") return false;
    router.push("/login");
    router.refresh();
    return true;
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, subjectId: initialSubjects[0]?.id ?? "" });
    setFeedback(null);
    setIsEditorOpen(true);
  }

  function openEdit(task: TaskSummary) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: toDateTimeInput(task.dueDate),
      priority: task.priority,
      subjectId: task.subject.id,
    });
    setFeedback(null);
    setIsEditorOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { ...form, dueDate: toIso(form.dueDate) };
    setBusy(editingId ? `edit:${editingId}` : "create");
    setFeedback(null);
    const result = editingId
      ? await updateTaskAction(editingId, input)
      : await createTaskAction(input);

    if (!result.ok) {
      if (!handleUnauthorized(result.error)) {
        setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
      }
      setBusy(null);
      return;
    }

    setTasks((current) => editingId
      ? current.map((task) => task.id === result.task.id ? result.task : task)
      : [result.task, ...current]);
    setIsEditorOpen(false);
    setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
    setBusy(null);
  }

  async function handleToggle(task: TaskSummary) {
    setBusy(`toggle:${task.id}`);
    setFeedback(null);
    const result = await setTaskCompletedAction(task.id, !task.completed);
    if (!result.ok) {
      if (!handleUnauthorized(result.error)) setFeedback({ type: "error", text: t("saveError") });
    } else {
      setTasks((current) => current.map((item) => item.id === result.task.id ? result.task : item));
    }
    setBusy(null);
  }

  async function handleDelete() {
    if (!deletingTask) return;
    setBusy(`delete:${deletingTask.id}`);
    const result = await deleteTaskAction(deletingTask.id);
    if (!result.ok) {
      if (!handleUnauthorized(result.error)) setFeedback({ type: "error", text: t("deleteError") });
    } else {
      setTasks((current) => current.filter((task) => task.id !== result.taskId));
      setDeletingTask(null);
      setFeedback({ type: "success", text: t("deleteSuccess") });
    }
    setBusy(null);
  }

  function priorityLabel(priority: TaskPriority) {
    return t(`priority${priority[0]}${priority.slice(1).toLowerCase()}`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
        <button className={styles.primaryButton} type="button" onClick={openCreate} disabled={initialSubjects.length === 0}>{t("new")}</button>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {(["all", "pending", "completed"] as StatusFilter[]).map((value) => (
            <button key={value} className={`${styles.tab} ${status === value ? styles.activeTab : ""}`} type="button" onClick={() => setStatus(value)}>{t(value)}</button>
          ))}
        </div>
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label={common("filterSubject")}>
            <option value="all">{common("allSubjects")}</option>
            {initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <input className={styles.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
        </div>
      </div>

      {feedback && <p className={feedback.type === "error" ? styles.error : styles.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

      {initialSubjects.length === 0 ? (
        <section className={styles.emptyState}><div className={styles.emptyIcon}>A</div><h2>{t("noSubjectsTitle")}</h2><p>{t("noSubjectsText")}</p></section>
      ) : filteredTasks.length === 0 ? (
        <section className={styles.emptyState}><div className={styles.emptyIcon}>✓</div><h2>{t("emptyTitle")}</h2><p>{t("emptyText")}</p><button className={styles.primaryButton} type="button" onClick={openCreate}>{t("new")}</button></section>
      ) : (
        <section className={styles.list} aria-label={t("listLabel")}>
          {filteredTasks.map((task) => (
            <article className={styles.item} key={task.id}>
              <div className={styles.itemMain}>
                <input className={styles.checkbox} type="checkbox" checked={task.completed} onChange={() => handleToggle(task)} disabled={busy !== null} aria-label={t("toggle", { title: task.title })} />
                <div className={styles.itemText}><h2 className={`${styles.itemTitle} ${task.completed ? styles.completedTitle : ""}`}>{task.title}</h2><p className={styles.itemDescription}>{task.description || task.subject.name}</p></div>
              </div>
              <div className={styles.itemMeta}><strong>{task.subject.name}</strong>{task.dueDate ? dateFormatter.format(new Date(task.dueDate)) : t("noDate")}</div>
              <span className={`${styles.badge} ${task.priority === "HIGH" ? styles.badgeHigh : task.priority === "LOW" ? styles.badgeLow : styles.badgeMedium}`}>{priorityLabel(task.priority)}</span>
              <div className={styles.itemActions}><button className={styles.secondaryButton} type="button" onClick={() => openEdit(task)} disabled={busy !== null}>{common("edit")}</button><button className={styles.dangerButton} type="button" onClick={() => setDeletingTask(task)} disabled={busy !== null}>{common("delete")}</button></div>
            </article>
          ))}
        </section>
      )}

      {isEditorOpen && (
        <div className={styles.dialogBackdrop}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
            <h2 id="task-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="task-title">{t("titleLabel")}</label><input id="task-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
                <div className={styles.field}><label htmlFor="task-subject">{common("subject")}</label><select id="task-subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
                <div className={styles.field}><label htmlFor="task-priority">{t("priority")}</label><select id="task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}><option value="LOW">{t("priorityLow")}</option><option value="MEDIUM">{t("priorityMedium")}</option><option value="HIGH">{t("priorityHigh")}</option></select></div>
                <div className={styles.field}><label htmlFor="task-date">{t("dueDate")}</label><input id="task-date" type="datetime-local" value={form.dueDate ?? ""} onInput={(e) => setForm({ ...form, dueDate: e.currentTarget.value || null })} onChange={(e) => setForm({ ...form, dueDate: e.currentTarget.value || null })} /></div>
                <div className={`${styles.field} ${styles.fieldWide}`}><label htmlFor="task-description">{common("description")}</label><textarea id="task-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={600} /></div>
              </div>
              <div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={() => setIsEditorOpen(false)} disabled={busy !== null}>{common("cancel")}</button><button className={styles.primaryButton} type="submit" disabled={busy !== null}>{busy ? common("saving") : common("save")}</button></div>
            </form>
          </div>
        </div>
      )}

      {deletingTask && (
        <div className={styles.dialogBackdrop}><div className={`${styles.dialog} ${styles.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-task-title"><h2 id="delete-task-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingTask.title })}</p><div className={styles.dialogActions}><button className={styles.secondaryButton} type="button" onClick={() => setDeletingTask(null)} disabled={busy !== null}>{common("cancel")}</button><button className={styles.confirmDeleteButton} type="button" onClick={handleDelete} disabled={busy !== null}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>
      )}
    </div>
  );
}
