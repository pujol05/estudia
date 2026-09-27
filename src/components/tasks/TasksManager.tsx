"use client";

import { useMemo, useState, useSyncExternalStore, type CSSProperties, type DragEvent, type FormEvent, type ReactNode } from "react";
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
import { normalizeSearchText } from "@/lib/search";
import { START_STUDY_EVENT } from "@/lib/study-timer-events";

import shared from "@/components/academic/AcademicManager.module.css";
import styles from "@/components/tasks/TasksManager.module.css";

type Props = { referenceTime: string; initialSubjects: SubjectOption[]; initialTasks: TaskSummary[]; initialStudySessions: StudySessionSummary[] };
type Feedback = { type: "error" | "success"; text: string } | null;
type PeriodMode = "day" | "week" | "month" | "custom";
type TaskGroup = { subject: SubjectOption; tasks: TaskSummary[]; minutes: number };
type ColumnView = { recent: TaskSummary[]; groups: TaskGroup[] };
type PeriodEntry = { minutes: number; subject: SubjectOption | null; task: { id: string; title: string } | null };

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const PERIODS: { mode: PeriodMode; label: string; empty: string }[] = [
  { mode: "day", label: "periodDay", empty: "noHoursDay" },
  { mode: "week", label: "periodWeek", empty: "noHoursWeek" },
  { mode: "month", label: "periodMonth", empty: "noHoursMonth" },
  { mode: "custom", label: "periodCustom", empty: "noHoursPeriod" },
];
const RECENT_DONE_MS = 24 * 60 * 60 * 1000;
// Picked by position in the alphabetical subject list, so each subject keeps
// the same colour in every column.
const SUBJECT_COLORS = ["#e07a5f", "#3d9a8b", "#8e6cc9", "#d49a1a", "#4a8fd4", "#d0648a", "#6b9e3f", "#b86f3a"];
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

function taskMinutes(task: TaskSummary) {
  return task.timeEntries.reduce((sum, entry) => sum + entry.minutes, 0);
}

function toggled(current: Set<string>, id: string) {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function shiftDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getMonthRange(value: string) {
  if (!value) return { start: "", end: "" };
  const [year, month] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0));
  return { start: `${value.slice(0, 7)}-01`, end: lastDay.toISOString().slice(0, 10) };
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

function Chevron({ open }: { open: boolean }) {
  return (
    <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function TasksManager({ referenceTime, initialSubjects, initialTasks, initialStudySessions }: Props) {
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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [openHourSubjects, setOpenHourSubjects] = useState<Set<string>>(() => new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
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
  const isBrowser = useSyncExternalStore(subscribeToBrowserDate, () => true, () => false);
  const activeDate = selectedDate || defaultBrowserDate;
  const isFiltering = subjectFilter !== "all" || query.trim() !== "";

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );
  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }),
    [locale],
  );
  const rangeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }),
    [locale],
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const shortDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
    [locale],
  );
  const subjectColors = useMemo(
    () => new Map(initialSubjects.map((subject, index) => [subject.id, SUBJECT_COLORS[index % SUBJECT_COLORS.length]])),
    [initialSubjects],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query.trim(), locale);
    return tasks.filter((task) => {
      const matchesSubject = subjectFilter === "all" || task.subject.id === subjectFilter;
      const matchesQuery = !normalizedQuery || normalizeSearchText(`${task.title} ${task.description ?? ""} ${task.subject.name}`, locale).includes(normalizedQuery);
      return matchesSubject && matchesQuery;
    });
  }, [locale, query, subjectFilter, tasks]);

  // DONE keeps the last 24 h of completions in view; everything older is
  // folded into per-subject piles so the column doesn't grow forever.
  const columns = useMemo(() => {
    const recentCutoff = new Date(referenceTime).getTime() - RECENT_DONE_MS;
    return Object.fromEntries(STATUSES.map((status) => {
      const columnTasks = visibleTasks.filter((task) => task.status === status);
      const recent = status !== "DONE" ? [] : columnTasks
        .filter((task) => task.completedAt && new Date(task.completedAt).getTime() >= recentCutoff)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
      const groups = initialSubjects
        .map((subject) => {
          const groupTasks = columnTasks.filter((task) => task.subject.id === subject.id && !recent.includes(task));
          return { subject, tasks: groupTasks, minutes: groupTasks.reduce((sum, task) => sum + taskMinutes(task), 0) };
        })
        .filter((group) => group.tasks.length > 0);
      return [status, { recent, groups }];
    })) as Record<TaskStatus, ColumnView>;
  }, [initialSubjects, referenceTime, visibleTasks]);

  const periodRange = useMemo(() => {
    if (periodMode === "week") return getWeekRange(activeDate);
    if (periodMode === "month") return getMonthRange(activeDate);
    if (periodMode === "custom") {
      const end = customEnd || activeDate;
      const start = customStart || shiftDays(end, -29);
      return start <= end ? { start, end } : { start: end, end: start };
    }
    return { start: activeDate, end: activeDate };
  }, [activeDate, customEnd, customStart, periodMode]);

  const periodLabel = useMemo(() => {
    if (!periodRange.start) return "—";
    const start = new Date(`${periodRange.start}T00:00:00.000Z`);
    if (periodMode === "day") return dayFormatter.format(start);
    if (periodMode === "month") return monthFormatter.format(start);
    const end = new Date(`${periodRange.end}T00:00:00.000Z`);
    return rangeFormatter.formatRange(start, end);
  }, [dayFormatter, monthFormatter, periodMode, periodRange, rangeFormatter]);

  // Task time comes from the live task list, so a freshly logged entry shows
  // up at once; sessions without a task only exist in the server data.
  const periodEntries = useMemo((): PeriodEntry[] => {
    const inPeriod = (date: string) => date >= periodRange.start && date <= periodRange.end;
    const normalizedQuery = normalizeSearchText(query.trim(), locale);
    const taskEntries = visibleTasks.flatMap((task) => task.timeEntries
      .filter((entry) => inPeriod(entry.date))
      .map((entry) => ({ minutes: entry.minutes, subject: task.subject, task: { id: task.id, title: task.title } })));
    const generalEntries = initialStudySessions
      .filter((session) => !session.task
        && inPeriod(session.date)
        && (subjectFilter === "all" || session.subject?.id === subjectFilter)
        && (!normalizedQuery || normalizeSearchText(session.subject?.name ?? "", locale).includes(normalizedQuery)))
      .map((session) => ({ minutes: session.minutes, subject: session.subject, task: null }));
    return [...taskEntries, ...generalEntries];
  }, [initialStudySessions, locale, periodRange, query, subjectFilter, visibleTasks]);

  const subjectRows = useMemo(() => {
    const totals = new Map<string, { id: string; name: string; minutes: number; sessions: number; tasks: Map<string, { id: string; title: string; minutes: number }> }>();
    periodEntries.forEach((entry) => {
      const key = entry.subject?.id ?? "general";
      const current = totals.get(key) ?? { id: key, name: entry.subject?.name ?? t("generalStudy"), minutes: 0, sessions: 0, tasks: new Map() };
      const taskKey = entry.task?.id ?? "none";
      const taskRow = current.tasks.get(taskKey) ?? { id: taskKey, title: entry.task?.title ?? t("noTaskStudy"), minutes: 0 };
      current.minutes += entry.minutes;
      current.sessions += 1;
      taskRow.minutes += entry.minutes;
      current.tasks.set(taskKey, taskRow);
      totals.set(key, current);
    });
    return [...totals.values()]
      .map((row) => ({ ...row, tasks: [...row.tasks.values()].sort((a, b) => b.minutes - a.minutes) }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [periodEntries, t]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, visibleTasks.filter((task) => task.status === status).length])) as Record<TaskStatus, number>, [visibleTasks]);
  const totalTasks = visibleTasks.length;
  const doneDegrees = totalTasks ? (counts.DONE / totalTasks) * 360 : 0;
  const progressDegrees = totalTasks ? (counts.IN_PROGRESS / totalTasks) * 360 : 0;
  const periodMinutes = subjectRows.reduce((sum, row) => sum + row.minutes, 0);
  const activePeriod = PERIODS.find((period) => period.mode === periodMode) ?? PERIODS[0];

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

  // Manual toggles are dropped whenever the filters change, so a search never
  // hides its matches inside a pile collapsed earlier.
  function isGroupOpen(key: string, status: TaskStatus) {
    return groupOverrides[key] ?? (isFiltering || status !== "DONE");
  }

  function toggleGroup(key: string, isOpen: boolean) {
    setGroupOverrides((current) => ({ ...current, [key]: !isOpen }));
  }

  // Dates are formatted in the browser's time zone, so they're left out of the
  // server render to avoid a hydration mismatch.
  function groupedSubtitle(task: TaskSummary) {
    if (!isBrowser) return null;
    if (task.status === "DONE") {
      return task.completedAt ? <small>{t("completedOn", { date: shortDateFormatter.format(new Date(task.completedAt)) })}</small> : null;
    }
    if (!task.dueDate) return null;
    const isOverdue = new Date(task.dueDate).getTime() < new Date(referenceTime).getTime();
    return <small className={isOverdue ? styles.overdue : ""}>{t("dueOn", { date: shortDateFormatter.format(new Date(task.dueDate)) })}</small>;
  }

  function toggleTaskDetails(taskId: string) {
    setExpandedTaskIds((current) => toggled(current, taskId));
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

  function renderTask(task: TaskSummary, subtitle: ReactNode) {
    const totalMinutes = taskMinutes(task);
    const isExpanded = expandedTaskIds.has(task.id);
    return (
      <article
        className={`${styles.taskCard} ${isExpanded ? styles.expandedCard : ""} ${draggedTaskId === task.id ? styles.dragging : ""}`}
        key={task.id}
        style={{ "--subject-color": subjectColors.get(task.subject.id) } as CSSProperties}
        draggable
        onDragStart={(event) => handleCardDragStart(event, task)}
        onDragEnd={handleCardDragEnd}
      >
        <div className={styles.compactRow}>
          <button className={styles.compactMain} type="button" onClick={() => toggleTaskDetails(task.id)} aria-expanded={isExpanded} aria-controls={`task-details-${task.id}`}>
            <span className={styles.compactIdentity}><strong className={task.status === "DONE" ? shared.completedTitle : ""}>{task.title}</strong>{subtitle}</span>
            <span className={styles.compactHours}>{formatMinutes(totalMinutes)}</span>
            <Chevron open={isExpanded} />
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
          <select className={shared.filterSelect} value={subjectFilter} onChange={(event) => { setSubjectFilter(event.target.value); setGroupOverrides({}); }} aria-label={common("filterSubject")}>
            <option value="all">{common("allSubjects")}</option>
            {initialSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <input className={shared.search} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setGroupOverrides({}); }} placeholder={t("search")} />
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
                {columns[columnStatus].recent.length > 0 && <>
                  <p className={styles.sectionLabel}>{t("recentDone")}</p>
                  <div className={styles.groupCards}>{columns[columnStatus].recent.map((task) => renderTask(task, <small>({task.subject.name})</small>))}</div>
                  {columns[columnStatus].groups.length > 0 && <p className={styles.sectionLabel}>{t("earlierDone")}</p>}
                </>}
                {columns[columnStatus].groups.map(({ subject, tasks: groupTasks, minutes }) => {
                  const groupKey = `${columnStatus}-${subject.id}`;
                  const isOpen = isGroupOpen(groupKey, columnStatus);
                  return (
                    <section
                      className={`${styles.subjectGroup} ${isOpen ? "" : styles.groupCollapsed} ${!isOpen && groupTasks.length > 1 ? styles.groupStacked : ""}`}
                      key={groupKey}
                      style={{ "--subject-color": subjectColors.get(subject.id) } as CSSProperties}
                    >
                      <button className={styles.groupHeader} type="button" onClick={() => toggleGroup(groupKey, isOpen)} aria-expanded={isOpen} aria-controls={`task-group-${groupKey}`}>
                        <span className={styles.groupDot} aria-hidden="true" />
                        <span className={styles.groupName}>{subject.name}</span>
                        {minutes > 0 && <span className={styles.groupMinutes}>{formatMinutes(minutes)}</span>}
                        <span className={styles.groupCount}>{groupTasks.length}</span>
                        <Chevron open={isOpen} />
                      </button>
                      {isOpen && <div className={styles.groupCards} id={`task-group-${groupKey}`}>{groupTasks.map((task) => renderTask(task, groupedSubtitle(task)))}</div>}
                    </section>
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
          <div className={styles.analyticsHeading}>
            <div><h2>{t("activityTitle")}</h2><p>{t("activitySubtitle")}</p></div>
            <div className={styles.analyticsControls}>
              <div className={styles.periodToggle} role="group" aria-label={t("periodLabel")}>
                {PERIODS.map(({ mode, label }) => <button className={periodMode === mode ? styles.activePeriod : ""} type="button" key={mode} onClick={() => setPeriodMode(mode)}>{t(label)}</button>)}
              </div>
              {periodMode === "custom" ? (
                <div className={styles.customRange}>
                  <label><span>{t("rangeFrom")}</span><input type="date" value={periodRange.start} max={periodRange.end} onChange={(event) => setCustomStart(event.target.value)} /></label>
                  <label><span>{t("rangeTo")}</span><input type="date" value={periodRange.end} min={periodRange.start} onChange={(event) => setCustomEnd(event.target.value)} /></label>
                </div>
              ) : (
                <label><span>{t("activityDate")}</span><input type="date" value={activeDate} onChange={(event) => setSelectedDate(event.target.value || browserToday())} /></label>
              )}
            </div>
          </div>
          <div className={styles.analyticsGrid}>
            <article className={styles.progressPanel}>
              <h3>{t("progressTitle")}</h3>
              <div className={styles.donutWrap}>
                <div className={styles.donut} style={{ background: totalTasks ? `conic-gradient(#88E788 0 ${doneDegrees}deg, #57B9FF ${doneDegrees}deg ${doneDegrees + progressDegrees}deg, #9aa7ad ${doneDegrees + progressDegrees}deg 360deg)` : "#e3e7e8" }}><div><strong>{totalTasks ? Math.round((counts.DONE / totalTasks) * 100) : 0}%</strong><span>{t("completedShort")}</span></div></div>
                <ul>{STATUSES.map((value) => <li key={value}><span className={`${styles.legendDot} ${styles[`dot${value}`]}`} /><span>{statusLabel(value)}</span><strong>{counts[value]}</strong></li>)}</ul>
              </div>
            </article>
            <article className={styles.hoursPanel}>
              <div className={styles.panelTitle}><div><h3>{t("hoursBySubject")}</h3><span>{periodLabel}</span></div><strong>{formatMinutes(periodMinutes)}</strong></div>
              {subjectRows.length === 0 ? <p className={styles.noHours}>{t(activePeriod.empty)}</p> : (
                <ul className={styles.subjectHoursList}>
                  {subjectRows.map((row) => {
                    const hasTasks = row.tasks.some((task) => task.id !== "none");
                    const isOpen = hasTasks && openHourSubjects.has(row.id);
                    return (
                      <li key={row.id} style={{ "--subject-color": subjectColors.get(row.id) ?? "#9aa7ad" } as CSSProperties}>
                        <button
                          className={styles.subjectHoursRow}
                          type="button"
                          onClick={() => setOpenHourSubjects((current) => toggled(current, row.id))}
                          disabled={!hasTasks}
                          aria-expanded={hasTasks ? isOpen : undefined}
                          aria-controls={hasTasks ? `hours-${row.id}` : undefined}
                        >
                          <span className={styles.groupDot} aria-hidden="true" />
                          <span className={styles.subjectHoursMain}>
                            <span className={styles.subjectHoursName}><strong>{row.name}</strong><small>{t("sessionsCount", { count: row.sessions })}</small></span>
                            <span className={styles.subjectHoursBar} aria-hidden="true"><span style={{ width: `${(row.minutes / periodMinutes) * 100}%` }} /></span>
                          </span>
                          <strong className={styles.subjectHoursValue}>{formatMinutes(row.minutes)}</strong>
                          {hasTasks ? <Chevron open={isOpen} /> : <span className={styles.chevron} aria-hidden="true" />}
                        </button>
                        {isOpen && <ul className={styles.subjectTaskHours} id={`hours-${row.id}`}>{row.tasks.map((task) => <li key={task.id}><span>{task.title}</span><strong>{formatMinutes(task.minutes)}</strong></li>)}</ul>}
                      </li>
                    );
                  })}
                </ul>
              )}
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
