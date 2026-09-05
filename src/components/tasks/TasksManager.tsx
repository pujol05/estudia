"use client";

import { useMemo, useState, useSyncExternalStore, type DragEvent, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  addTaskTimeEntryAction,
  createTaskAction,
  deleteTaskAction,
  setTaskStatusAction,
  updateTaskAction,
  type TaskInput,
} from "@/app/[locale]/tasks/actions";
import { useRouter } from "@/i18n/navigation";
import type { StudySessionSummary, SubjectOption, TaskPriority, TaskStatus, TaskSummary } from "@/lib/academic-types";
import { START_STUDY_EVENT } from "@/lib/study-timer-events";

import shared from "@/components/academic/AcademicManager.module.css";
import styles from "@/components/tasks/TasksManager.module.css";

type Props = { initialSubjects: SubjectOption[]; initialTasks: TaskSummary[]; initialStudySessions: StudySessionSummary[] };
type Feedback = { type: "error" | "success"; text: string } | null;
type PeriodMode = "day" | "week";

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const subscribeToBrowserDate = () => () => {};
const EMPTY_FORM: TaskInput = {
  title: "",
  description: "",
  dueDate: null,
  priority: "MEDIUM",
  status: "TODO",
  subjectId: "",
};

function browserToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

function getWeekRange(value: string) {
  if (!value) return { start: "", end: "" };
  const date = new Date(`${value}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function TasksManager({ initialSubjects, initialTasks, initialStudySessions }: Props) {
  const t = useTranslations("Tasks");
  const common = useTranslations("Academic");
  const locale = useLocale();
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("day");
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());
  const [form, setForm] = useState<TaskInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<TaskSummary | null>(null);
  const [loggingTask, setLoggingTask] = useState<TaskSummary | null>(null);
  const [logHours, setLogHours] = useState("1");
  const [logMinutes, setLogMinutes] = useState("0");
  const [logDate, setLogDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const defaultBrowserDate = useSyncExternalStore(subscribeToBrowserDate, browserToday, () => "");
  const activeDate = selectedDate || defaultBrowserDate;

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }),
    [locale],
  );
  const weekFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }),
    [locale],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return tasks.filter((task) => {
      const matchesSubject = subjectFilter === "all" || task.subject.id === subjectFilter;
      const matchesQuery = !normalizedQuery || `${task.title} ${task.description ?? ""} ${task.subject.name}`.toLocaleLowerCase(locale).includes(normalizedQuery);
      return matchesSubject && matchesQuery;
    });
  }, [locale, query, subjectFilter, tasks]);

  const periodRange = useMemo(
    () => periodMode === "week" ? getWeekRange(activeDate) : { start: activeDate, end: activeDate },
    [activeDate, periodMode],
  );

  const periodLabel = useMemo(() => {
    if (!periodRange.start) return "—";
    const start = new Date(`${periodRange.start}T00:00:00.000Z`);
    if (periodMode === "day") return dayFormatter.format(start);
    const end = new Date(`${periodRange.end}T00:00:00.000Z`);
    return weekFormatter.formatRange(start, end);
  }, [dayFormatter, periodMode, periodRange, weekFormatter]);

  const taskRows = useMemo(() => visibleTasks
    .map((task) => ({
      task,
      minutes: task.timeEntries
        .filter((entry) => entry.date >= periodRange.start && entry.date <= periodRange.end)
        .reduce((sum, entry) => sum + entry.minutes, 0),
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes), [periodRange, visibleTasks]);

  const periodSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    return initialStudySessions.filter((session) => {
      const matchesPeriod = session.date >= periodRange.start && session.date <= periodRange.end;
      const matchesSubject = subjectFilter === "all" || session.subject?.id === subjectFilter;
      const matchesQuery = !normalizedQuery || `${session.task?.title ?? ""} ${session.subject?.name ?? ""}`.toLocaleLowerCase(locale).includes(normalizedQuery);
      return matchesPeriod && matchesSubject && matchesQuery;
    });
  }, [initialStudySessions, locale, periodRange, query, subjectFilter]);

  const subjectRows = useMemo(() => {
    const totals = new Map<string, { id: string; name: string; minutes: number; sessions: number }>();
    periodSessions.forEach((session) => {
      const key = session.subject?.id ?? "general";
      const current = totals.get(key) ?? { id: key, name: session.subject?.name ?? t("generalStudy"), minutes: 0, sessions: 0 };
      current.minutes += session.minutes;
      current.sessions += 1;
      totals.set(key, current);
    });
    return [...totals.values()].sort((a, b) => b.minutes - a.minutes);
  }, [periodSessions, t]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, visibleTasks.filter((task) => task.status === status).length])) as Record<TaskStatus, number>, [visibleTasks]);
  const totalTasks = visibleTasks.length;
  const doneDegrees = totalTasks ? (counts.DONE / totalTasks) * 360 : 0;
  const progressDegrees = totalTasks ? (counts.IN_PROGRESS / totalTasks) * 360 : 0;
  const periodMinutes = taskRows.reduce((sum, row) => sum + row.minutes, 0);

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const minutePart = minutes % 60;
    if (hours === 0) return t("durationMinutes", { minutes: minutePart });
    if (minutePart === 0) return t("durationHours", { hours });
    return t("durationHoursMinutes", { hours, minutes: minutePart });
  }

  function statusLabel(status: TaskStatus) {
    return t(status === "TODO" ? "statusTodo" : status === "IN_PROGRESS" ? "statusInProgress" : "statusDone");
  }

  function handleUnauthorized(error: string) {
    if (error !== "unauthorized") return false;
    router.push("/login");
    router.refresh();
    return true;
  }

  function replaceTask(task: TaskSummary) {
    setTasks((current) => current.map((item) => item.id === task.id ? task : item));
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
      status: task.status,
      subjectId: task.subject.id,
    });
    setFeedback(null);
    setIsEditorOpen(true);
  }

  function openTimeLog(task: TaskSummary) {
    setLoggingTask(task);
    setLogDate(browserToday());
    setLogHours("1");
    setLogMinutes("0");
    setFeedback(null);
  }

  function startStudy(taskId: string) {
    window.dispatchEvent(new CustomEvent(START_STUDY_EVENT, { detail: { taskId } }));
  }

  function toggleTaskDetails(taskId: string) {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { ...form, dueDate: toIso(form.dueDate) };
    setBusy(editingId ? `edit:${editingId}` : "create");
    setFeedback(null);
    const result = editingId ? await updateTaskAction(editingId, input) : await createTaskAction(input);
    if (!result.ok) {
      if (!handleUnauthorized(result.error)) setFeedback({ type: "error", text: result.error === "invalidSubject" ? t("subjectError") : t("saveError") });
    } else {
      setTasks((current) => editingId ? current.map((task) => task.id === result.task.id ? result.task : task) : [result.task, ...current]);
      setIsEditorOpen(false);
      setFeedback({ type: "success", text: editingId ? t("updateSuccess") : t("createSuccess") });
      router.refresh();
    }
    setBusy(null);
  }

  async function handleStatus(task: TaskSummary, status: TaskStatus) {
    setBusy(`status:${task.id}`);
    setFeedback(null);
    const result = await setTaskStatusAction(task.id, status);
    if (!result.ok) {
      if (!handleUnauthorized(result.error)) setFeedback({ type: "error", text: t("saveError") });
    } else replaceTask(result.task);
    setBusy(null);
  }

  function handleCardDragStart(event: DragEvent<HTMLElement>, task: TaskSummary) {
    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  function handleCardDragEnd() {
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }

  function handleColumnDragOver(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== status) setDragOverStatus(status);
  }

  function handleColumnDrop(event: DragEvent<HTMLDivElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverStatus(null);
    if (!taskId || busy !== null) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    if (status === "TODO" && task.timeEntries.length > 0) {
      setFeedback({ type: "error", text: t("cannotRevertToTodo") });
      return;
    }
    handleStatus(task, status);
  }

  async function handleTimeLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loggingTask) return;
    setBusy(`time:${loggingTask.id}`);
    setFeedback(null);
    const entryDate = logDate || defaultBrowserDate;
    const result = await addTaskTimeEntryAction(loggingTask.id, {
      date: entryDate,
      hours: logHours,
      minutes: logMinutes,
    });
    if (!result.ok) {
      if (!handleUnauthorized(result.error)) setFeedback({ type: "error", text: t("timeSaveError") });
    } else {
      replaceTask(result.task);
      setSelectedDate(entryDate);
      setLoggingTask(null);
      setFeedback({ type: "success", text: t("timeSaveSuccess") });
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
    <div className={shared.page}>
      <header className={shared.heading}>
        <div><h1>{t("title")}</h1><p>{t("subtitle")}</p></div>
        <button className={shared.primaryButton} type="button" onClick={openCreate} disabled={initialSubjects.length === 0}>{t("new")}</button>
      </header>

      <div className={shared.toolbar}>
        <div className={styles.viewTitle}><strong>{t("boardTitle")}</strong><span>{t("taskCount", { count: visibleTasks.length })}</span></div>
        <div className={shared.filters}>
          <select className={shared.filterSelect} value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} aria-label={common("filterSubject")}>
            <option value="all">{common("allSubjects")}</option>
            {initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <input className={shared.search} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
        </div>
      </div>

      {feedback && <p className={feedback.type === "error" ? shared.error : shared.success} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

      {initialSubjects.length === 0 ? (
        <section className={shared.emptyState}><div className={shared.emptyIcon}>A</div><h2>{t("noSubjectsTitle")}</h2><p>{t("noSubjectsText")}</p></section>
      ) : (
        <section className={styles.board} aria-label={t("boardLabel")}>
          {STATUSES.map((columnStatus) => (
            <div className={styles.column} key={columnStatus}>
              <header className={styles.columnHeader}>
                <span className={`${styles.statusDot} ${styles[`dot${columnStatus}`]}`} />
                <h2>{statusLabel(columnStatus)}</h2><span>{counts[columnStatus]}</span>
              </header>
              <div
                className={`${styles.cards} ${dragOverStatus === columnStatus ? styles.dragOverColumn : ""}`}
                onDragOver={(event) => handleColumnDragOver(event, columnStatus)}
                onDrop={(event) => handleColumnDrop(event, columnStatus)}
              >
                {visibleTasks.filter((task) => task.status === columnStatus).map((task) => {
                  const totalMinutes = task.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
                  const isExpanded = expandedTaskIds.has(task.id);
                  return (
                    <article
                      className={`${styles.taskCard} ${isExpanded ? styles.expandedCard : ""} ${draggedTaskId === task.id ? styles.dragging : ""}`}
                      key={task.id}
                      draggable
                      onDragStart={(event) => handleCardDragStart(event, task)}
                      onDragEnd={handleCardDragEnd}
                    >
                      <div className={styles.compactRow}>
                        <button className={styles.compactMain} type="button" onClick={() => toggleTaskDetails(task.id)} aria-expanded={isExpanded} aria-controls={`task-details-${task.id}`}>
                          <span className={styles.compactIdentity}><strong className={task.status === "DONE" ? shared.completedTitle : ""}>{task.title}</strong><small>({task.subject.name})</small></span>
                          <span className={styles.compactHours}>{formatMinutes(totalMinutes)}</span>
                          <span className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`} aria-hidden="true">⌄</span>
                        </button>
                        <button className={styles.quickStudy} type="button" onClick={() => startStudy(task.id)} disabled={busy !== null}><span aria-hidden="true">▶</span>{t("study")}</button>
                      </div>
                      {isExpanded && <div className={styles.cardDetails} id={`task-details-${task.id}`}>
                        <div className={styles.cardTop}><span className={`${shared.badge} ${task.priority === "HIGH" ? shared.badgeHigh : task.priority === "LOW" ? shared.badgeLow : shared.badgeMedium}`}>{priorityLabel(task.priority)}</span><strong className={styles.hoursBadge}>{formatMinutes(totalMinutes)}</strong></div>
                        {task.description && <p>{task.description}</p>}
                        <div className={styles.cardMeta}><strong>{task.subject.name}</strong><span>{task.dueDate ? dateFormatter.format(new Date(task.dueDate)) : t("noDate")}</span></div>
                        <label className={styles.statusControl}><span>{t("statusLabel")}</span><select value={task.status} onChange={(event) => handleStatus(task, event.target.value as TaskStatus)} disabled={busy !== null}>{STATUSES.map((value) => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></label>
                        <div className={styles.cardActions}><button type="button" onClick={() => openTimeLog(task)} disabled={busy !== null}>{t("logTime")}</button><button type="button" onClick={() => openEdit(task)} disabled={busy !== null}>{common("edit")}</button><button className={styles.deleteLink} type="button" onClick={() => setDeletingTask(task)} disabled={busy !== null}>{common("delete")}</button></div>
                      </div>}
                    </article>
                  );
                })}
                {counts[columnStatus] === 0 && <p className={styles.emptyColumn}>{t("emptyColumn")}</p>}
              </div>
            </div>
          ))}
        </section>
      )}

      {initialSubjects.length > 0 && (
        <section className={styles.analytics}>
          <div className={styles.analyticsHeading}><div><h2>{t("activityTitle")}</h2><p>{t("activitySubtitle")}</p></div><div className={styles.analyticsControls}><div className={styles.periodToggle} role="group" aria-label={t("periodLabel")}><button className={periodMode === "day" ? styles.activePeriod : ""} type="button" onClick={() => setPeriodMode("day")}>{t("periodDay")}</button><button className={periodMode === "week" ? styles.activePeriod : ""} type="button" onClick={() => setPeriodMode("week")}>{t("periodWeek")}</button></div><label><span>{t("activityDate")}</span><input type="date" value={activeDate} onChange={(event) => setSelectedDate(event.target.value || browserToday())} /></label></div></div>
          <div className={styles.analyticsGrid}>
            <article className={styles.progressPanel}>
              <h3>{t("progressTitle")}</h3>
              <div className={styles.donutWrap}>
                <div className={styles.donut} style={{ background: totalTasks ? `conic-gradient(#88E788 0 ${doneDegrees}deg, #57B9FF ${doneDegrees}deg ${doneDegrees + progressDegrees}deg, #9aa7ad ${doneDegrees + progressDegrees}deg 360deg)` : "#e3e7e8" }}><div><strong>{totalTasks ? Math.round((counts.DONE / totalTasks) * 100) : 0}%</strong><span>{t("completedShort")}</span></div></div>
                <ul>{STATUSES.map((value) => <li key={value}><span className={`${styles.legendDot} ${styles[`dot${value}`]}`} /><span>{statusLabel(value)}</span><strong>{counts[value]}</strong></li>)}</ul>
              </div>
            </article>
            <article className={styles.hoursPanel}>
              <div className={styles.panelTitle}><div><h3>{t("hoursByTask")}</h3><span>{periodLabel}</span></div><strong>{formatMinutes(periodMinutes)}</strong></div>
              {taskRows.length === 0 ? <p className={styles.noHours}>{t(periodMode === "day" ? "noHoursDay" : "noHoursWeek")}</p> : <div className={styles.tableWrap}><table><thead><tr><th>{t("taskColumn")}</th><th>{common("subject")}</th><th>{t("hoursColumn")}</th></tr></thead><tbody>{taskRows.map(({ task, minutes }) => <tr key={task.id}><td>{task.title}</td><td>{task.subject.name}</td><td>{formatMinutes(minutes)}</td></tr>)}</tbody></table></div>}
            </article>
            <article className={`${styles.hoursPanel} ${styles.subjectHours}`}>
              <div className={styles.panelTitle}><div><h3>{t("hoursBySubject")}</h3><span>{t(periodMode === "day" ? "groupedHintDay" : "groupedHintWeek")}</span></div></div>
              {subjectRows.length === 0 ? <p className={styles.noHours}>{t(periodMode === "day" ? "noHoursDay" : "noHoursWeek")}</p> : <div className={styles.tableWrap}><table><thead><tr><th>{common("subject")}</th><th>{t("sessionsColumn")}</th><th>{t("hoursColumn")}</th></tr></thead><tbody>{subjectRows.map((subject) => <tr key={subject.id}><td>{subject.name}</td><td>{subject.sessions}</td><td>{formatMinutes(subject.minutes)}</td></tr>)}</tbody></table></div>}
            </article>
          </div>
        </section>
      )}

      {isEditorOpen && <div className={shared.dialogBackdrop}><div className={shared.dialog} role="dialog" aria-modal="true" aria-labelledby="task-editor-title"><h2 id="task-editor-title">{editingId ? t("editTitle") : t("createTitle")}</h2><p>{t("formHelp")}</p><form onSubmit={handleSubmit}><div className={shared.formGrid}>
        <div className={`${shared.field} ${shared.fieldWide}`}><label htmlFor="task-title">{t("titleLabel")}</label><input id="task-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} minLength={2} maxLength={120} required autoFocus /></div>
        <div className={shared.field}><label htmlFor="task-subject">{common("subject")}</label><select id="task-subject" value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} required>{initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></div>
        <div className={shared.field}><label htmlFor="task-status">{t("statusLabel")}</label><select id="task-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}>{STATUSES.map((value) => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></div>
        <div className={shared.field}><label htmlFor="task-priority">{t("priority")}</label><select id="task-priority" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}><option value="LOW">{t("priorityLow")}</option><option value="MEDIUM">{t("priorityMedium")}</option><option value="HIGH">{t("priorityHigh")}</option></select></div>
        <div className={shared.field}><label htmlFor="task-date">{t("dueDate")}</label><input id="task-date" type="datetime-local" value={form.dueDate ?? ""} onChange={(event) => setForm({ ...form, dueDate: event.currentTarget.value || null })} /></div>
        <div className={`${shared.field} ${shared.fieldWide}`}><label htmlFor="task-description">{common("description")}</label><textarea id="task-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={600} /></div>
      </div><div className={shared.formActions}><button className={shared.secondaryButton} type="button" onClick={() => setIsEditorOpen(false)} disabled={busy !== null}>{common("cancel")}</button><button className={shared.primaryButton} type="submit" disabled={busy !== null}>{busy ? common("saving") : common("save")}</button></div></form></div></div>}

      {loggingTask && <div className={shared.dialogBackdrop}><div className={`${shared.dialog} ${shared.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="time-log-title"><h2 id="time-log-title">{t("logTimeTitle")}</h2><p>{t("logTimeHelp", { title: loggingTask.title })}</p><form onSubmit={handleTimeLog}><div className={shared.formGrid}>
        <div className={`${shared.field} ${shared.fieldWide}`}><label htmlFor="log-date">{t("activityDate")}</label><input id="log-date" type="date" value={logDate || defaultBrowserDate} onChange={(event) => setLogDate(event.target.value)} required autoFocus /></div>
        <div className={`${shared.field} ${shared.fieldWide}`}><span className={styles.durationLabel}>{t("durationLabel")}</span><div className={styles.durationFields}>
          <label htmlFor="log-hours"><span>{t("hoursPartLabel")}</span><input id="log-hours" type="number" inputMode="numeric" min="0" max="24" step="1" value={logHours} onChange={(event) => { setLogHours(event.target.value); if (event.target.value === "24") setLogMinutes("0"); }} required /></label>
          <label htmlFor="log-minutes"><span>{t("minutesPartLabel")}</span><input id="log-minutes" type="number" inputMode="numeric" min="0" max="59" step="1" value={logMinutes} onChange={(event) => setLogMinutes(event.target.value)} disabled={logHours === "24"} required /></label>
        </div></div>
      </div><div className={shared.formActions}><button className={shared.secondaryButton} type="button" onClick={() => setLoggingTask(null)} disabled={busy !== null}>{common("cancel")}</button><button className={shared.primaryButton} type="submit" disabled={busy !== null}>{busy ? common("saving") : t("addHours")}</button></div></form></div></div>}

      {deletingTask && <div className={shared.dialogBackdrop}><div className={`${shared.dialog} ${shared.dialogSmall}`} role="dialog" aria-modal="true" aria-labelledby="delete-task-title"><h2 id="delete-task-title">{t("deleteTitle")}</h2><p>{t("deleteText", { title: deletingTask.title })}</p><div className={shared.dialogActions}><button className={shared.secondaryButton} type="button" onClick={() => setDeletingTask(null)} disabled={busy !== null}>{common("cancel")}</button><button className={shared.confirmDeleteButton} type="button" onClick={handleDelete} disabled={busy !== null}>{busy ? common("deleting") : common("confirmDelete")}</button></div></div></div>}
    </div>
  );
}
