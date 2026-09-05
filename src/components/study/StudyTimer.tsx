"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { saveStudySessionAction, type SaveStudySessionInput } from "@/app/[locale]/study/actions";
import { useRouter } from "@/i18n/navigation";
import { START_STUDY_EVENT } from "@/lib/study-timer-events";

import styles from "./StudyTimer.module.css";

type StudySubject = {
  id: string;
  name: string;
  tasks: { id: string; title: string }[];
};
type TimerMode = "STOPWATCH" | "POMODORO";
type TimerStatus = "RUNNING" | "PAUSED";
type TimerPhase = "FOCUS" | "BREAK";
type Destination = SaveStudySessionInput["destination"];
type ActiveTimer = {
  version: 1;
  mode: TimerMode;
  status: TimerStatus;
  phase: TimerPhase;
  startedAtMs: number;
  runningSinceMs: number | null;
  elapsedFocusSeconds: number;
  phaseRemainingSeconds: number;
  completedPomodoros: number;
  taskId: string | null;
  subjectId: string | null;
};
type ReviewState = { minutes: number; endedAtMs: number };

const STORAGE_KEY = "estudia:study-timer:v1";
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function browserDate(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function restoreTimer(value: string | null): ActiveTimer | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ActiveTimer>;
    if (parsed.version !== 1 || !["STOPWATCH", "POMODORO"].includes(parsed.mode ?? "") || !["RUNNING", "PAUSED"].includes(parsed.status ?? "") || typeof parsed.startedAtMs !== "number" || typeof parsed.elapsedFocusSeconds !== "number") return null;
    return {
      version: 1,
      mode: parsed.mode as TimerMode,
      status: parsed.status as TimerStatus,
      phase: parsed.phase === "BREAK" ? "BREAK" : "FOCUS",
      startedAtMs: parsed.startedAtMs,
      runningSinceMs: typeof parsed.runningSinceMs === "number" ? parsed.runningSinceMs : null,
      elapsedFocusSeconds: Math.max(0, parsed.elapsedFocusSeconds),
      phaseRemainingSeconds: Math.max(0, typeof parsed.phaseRemainingSeconds === "number" ? parsed.phaseRemainingSeconds : FOCUS_SECONDS),
      completedPomodoros: Math.max(0, typeof parsed.completedPomodoros === "number" ? parsed.completedPomodoros : 0),
      taskId: typeof parsed.taskId === "string" ? parsed.taskId : null,
      subjectId: typeof parsed.subjectId === "string" ? parsed.subjectId : null,
    };
  } catch {
    return null;
  }
}

function advancePomodoro(timer: ActiveTimer, now: number) {
  if (timer.mode !== "POMODORO" || timer.status !== "RUNNING" || timer.runningSinceMs === null) return timer;
  let phase = timer.phase;
  let remaining = timer.phaseRemainingSeconds;
  let elapsedFocus = timer.elapsedFocusSeconds;
  let completed = timer.completedPomodoros;
  let cursor = timer.runningSinceMs;
  let passed = Math.max(0, (now - cursor) / 1_000);
  let changed = false;

  for (let index = 0; index < 2_000 && passed >= remaining; index += 1) {
    if (phase === "FOCUS") {
      elapsedFocus += remaining;
      completed += 1;
      phase = "BREAK";
      remaining = BREAK_SECONDS;
    } else {
      phase = "FOCUS";
      remaining = FOCUS_SECONDS;
    }
    passed -= timer.phaseRemainingSeconds;
    cursor += timer.phaseRemainingSeconds * 1_000;
    changed = true;
    timer = { ...timer, phase, phaseRemainingSeconds: remaining, runningSinceMs: cursor };
  }

  return changed ? { ...timer, phase, phaseRemainingSeconds: remaining, runningSinceMs: cursor, elapsedFocusSeconds: elapsedFocus, completedPomodoros: completed } : timer;
}

function pauseAt(timer: ActiveTimer, now: number) {
  const advanced = advancePomodoro(timer, now);
  if (advanced.status !== "RUNNING" || advanced.runningSinceMs === null) return advanced;
  const segmentSeconds = Math.max(0, (now - advanced.runningSinceMs) / 1_000);
  if (advanced.mode === "STOPWATCH") {
    return { ...advanced, status: "PAUSED" as const, runningSinceMs: null, elapsedFocusSeconds: advanced.elapsedFocusSeconds + segmentSeconds };
  }
  const consumed = Math.min(segmentSeconds, advanced.phaseRemainingSeconds);
  return {
    ...advanced,
    status: "PAUSED" as const,
    runningSinceMs: null,
    elapsedFocusSeconds: advanced.elapsedFocusSeconds + (advanced.phase === "FOCUS" ? consumed : 0),
    phaseRemainingSeconds: Math.max(0, advanced.phaseRemainingSeconds - consumed),
  };
}

export default function StudyTimer({ subjects }: { subjects: StudySubject[] }) {
  const t = useTranslations("StudyTimer");
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<TimerMode>("POMODORO");
  const [targetValue, setTargetValue] = useState("general");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [destination, setDestination] = useState<Destination>("GENERAL");
  const [destinationTaskId, setDestinationTaskId] = useState("");
  const [destinationSubjectId, setDestinationSubjectId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const taskOptions = useMemo(() => subjects.flatMap((subject) => subject.tasks.map((task) => ({ ...task, subjectId: subject.id, subjectName: subject.name }))), [subjects]);
  const currentTask = timer?.taskId ? taskOptions.find((task) => task.id === timer.taskId) ?? null : null;
  const currentSubject = timer?.subjectId ? subjects.find((subject) => subject.id === timer.subjectId) ?? null : null;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const restored = restoreTimer(window.localStorage.getItem(STORAGE_KEY));
      const now = Date.now();
      setTimer(restored ? advancePomodoro(restored, now) : null);
      setNowMs(now);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (timer) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [hydrated, timer]);

  useEffect(() => {
    if (!timer || timer.status !== "RUNNING") return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      setTimer((current) => current ? advancePomodoro(current, now) : null);
    }, 500);
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    function handleQuickStart(event: Event) {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (timer) {
        setPanelOpen(true);
        return;
      }
      if (taskId && taskOptions.some((task) => task.id === taskId)) setTargetValue(`task:${taskId}`);
      setPanelOpen(true);
    }
    window.addEventListener(START_STUDY_EVENT, handleQuickStart);
    return () => window.removeEventListener(START_STUDY_EVENT, handleQuickStart);
  }, [taskOptions, timer]);

  const runningSegmentSeconds = timer?.status === "RUNNING" && timer.runningSinceMs !== null ? Math.max(0, (nowMs - timer.runningSinceMs) / 1_000) : 0;
  const focusSeconds = timer
    ? timer.elapsedFocusSeconds + (timer.status === "RUNNING" && (timer.mode === "STOPWATCH" || timer.phase === "FOCUS") ? Math.min(runningSegmentSeconds, timer.mode === "POMODORO" ? timer.phaseRemainingSeconds : runningSegmentSeconds) : 0)
    : 0;
  const displaySeconds = timer?.mode === "POMODORO" ? Math.max(0, timer.phaseRemainingSeconds - runningSegmentSeconds) : focusSeconds;
  const targetLabel = currentTask ? `${currentTask.title} · ${currentTask.subjectName}` : currentSubject?.name ?? t("generalStudy");

  function startTimer() {
    const now = Date.now();
    const taskId = targetValue.startsWith("task:") ? targetValue.slice(5) : null;
    const directSubjectId = targetValue.startsWith("subject:") ? targetValue.slice(8) : null;
    const task = taskId ? taskOptions.find((option) => option.id === taskId) : null;
    setTimer({
      version: 1,
      mode,
      status: "RUNNING",
      phase: "FOCUS",
      startedAtMs: now,
      runningSinceMs: now,
      elapsedFocusSeconds: 0,
      phaseRemainingSeconds: mode === "POMODORO" ? FOCUS_SECONDS : 0,
      completedPomodoros: 0,
      taskId,
      subjectId: task?.subjectId ?? directSubjectId,
    });
    setNowMs(now);
    setError("");
  }

  function togglePause() {
    const now = Date.now();
    setNowMs(now);
    setTimer((current) => {
      if (!current) return null;
      if (current.status === "RUNNING") return pauseAt(current, now);
      return { ...current, status: "RUNNING", runningSinceMs: now, phaseRemainingSeconds: current.mode === "POMODORO" && current.phaseRemainingSeconds <= 0 ? (current.phase === "FOCUS" ? FOCUS_SECONDS : BREAK_SECONDS) : current.phaseRemainingSeconds };
    });
  }

  function finishTimer() {
    if (!timer) return;
    const endedAtMs = Date.now();
    const paused = pauseAt(timer, endedAtMs);
    const minutes = Math.max(1, Math.round(paused.elapsedFocusSeconds / 60));
    setTimer(paused);
    setNowMs(endedAtMs);
    setReview({ minutes, endedAtMs });
    setDestination(paused.taskId ? "TASK" : paused.subjectId ? "SUBJECT" : "GENERAL");
    setDestinationTaskId(paused.taskId ?? taskOptions[0]?.id ?? "");
    setDestinationSubjectId(paused.subjectId ?? subjects[0]?.id ?? "");
    setNewTaskTitle("");
    setPanelOpen(false);
    setError("");
  }

  function clearTimer() {
    setTimer(null);
    setReview(null);
    setPanelOpen(false);
    setTargetValue("general");
    setError("");
  }

  async function saveSession() {
    if (!timer || !review) return;
    setBusy(true);
    setError("");
    const result = await saveStudySessionAction({
      date: browserDate(review.endedAtMs),
      minutes: review.minutes,
      startedAt: new Date(timer.startedAtMs).toISOString(),
      endedAt: new Date(review.endedAtMs).toISOString(),
      mode: timer.mode,
      destination,
      taskId: destination === "TASK" ? destinationTaskId || null : null,
      subjectId: destination === "SUBJECT" || destination === "CREATE_TASK" ? destinationSubjectId || null : null,
      newTaskTitle,
    });
    if (!result.ok) {
      if (result.error === "unauthorized") {
        router.push("/login");
        router.refresh();
      } else setError(result.error === "invalidSubject" || result.error === "notFound" ? t("destinationError") : t("saveError"));
      setBusy(false);
      return;
    }
    clearTimer();
    window.dispatchEvent(new CustomEvent("estudia:study-saved"));
    router.refresh();
    setBusy(false);
  }

  if (!hydrated) return <div className={styles.timerRoot}><button className={styles.timerTrigger} type="button" disabled><span aria-hidden="true">▶</span><span>{t("startStudy")}</span></button></div>;

  return <div className={styles.timerRoot}>
    <button className={`${styles.timerTrigger} ${timer ? styles.activeTrigger : ""}`} type="button" onClick={() => setPanelOpen((open) => !open)} aria-expanded={panelOpen}>
      <span className={styles.playIcon} aria-hidden="true">{timer?.status === "RUNNING" ? "●" : "▶"}</span>
      <span>{timer ? formatClock(displaySeconds) : t("startStudy")}</span>
    </button>

    {panelOpen && <section className={styles.timerPanel} aria-label={timer ? t("activeTimer") : t("setupTitle")}>
      <div className={styles.panelHeading}><div><span>{timer ? t(timer.mode === "POMODORO" ? "pomodoro" : "stopwatch") : t("studySession")}</span><h2>{timer ? t("activeTimer") : t("setupTitle")}</h2></div><button type="button" onClick={() => setPanelOpen(false)} aria-label={t("close")}>×</button></div>
      {!timer ? <>
        <div className={styles.modeToggle} role="group" aria-label={t("modeLabel")}><button className={mode === "POMODORO" ? styles.selectedMode : ""} type="button" onClick={() => setMode("POMODORO")}>{t("pomodoro")}</button><button className={mode === "STOPWATCH" ? styles.selectedMode : ""} type="button" onClick={() => setMode("STOPWATCH")}>{t("stopwatch")}</button></div>
        <p className={styles.modeHint}>{t(mode === "POMODORO" ? "pomodoroHint" : "stopwatchHint")}</p>
        <label className={styles.field}><span>{t("studyContext")}</span><select value={targetValue} onChange={(event) => setTargetValue(event.target.value)}><option value="general">{t("generalStudy")}</option>{subjects.length > 0 && <optgroup label={t("subjectsGroup")}>{subjects.map((subject) => <option value={`subject:${subject.id}`} key={subject.id}>{subject.name}</option>)}</optgroup>}{taskOptions.length > 0 && <optgroup label={t("tasksGroup")}>{taskOptions.map((task) => <option value={`task:${task.id}`} key={task.id}>{task.title} · {task.subjectName}</option>)}</optgroup>}</select></label>
        <button className={styles.primaryAction} type="button" onClick={startTimer}>{t("start")}</button>
      </> : <>
        <div className={styles.phaseRow}><span className={`${styles.phaseBadge} ${timer.phase === "BREAK" ? styles.breakBadge : ""}`}>{timer.mode === "POMODORO" ? t(timer.phase === "FOCUS" ? "focusPhase" : "breakPhase") : t(timer.status === "RUNNING" ? "running" : "paused")}</span>{timer.mode === "POMODORO" && <small>{t("completedPomodoros", { count: timer.completedPomodoros })}</small>}</div>
        <strong className={styles.timerClock}>{formatClock(displaySeconds)}</strong>
        <p className={styles.currentTarget}>{targetLabel}</p>
        <div className={styles.timerActions}><button className={styles.primaryAction} type="button" onClick={togglePause}>{t(timer.status === "RUNNING" ? "pause" : "resume")}</button><button className={styles.secondaryAction} type="button" onClick={finishTimer}>{t("finish")}</button></div>
      </>}
    </section>}

    {review && timer && <div className={styles.reviewBackdrop}><section className={styles.reviewDialog} role="dialog" aria-modal="true" aria-labelledby="study-review-title">
      <span className={styles.reviewKicker}>{t("sessionComplete")}</span><h2 id="study-review-title">{t("reviewTitle", { minutes: review.minutes })}</h2><p>{t("reviewText")}</p>
      <label className={styles.field}><span>{t("saveDestination")}</span><select value={destination} onChange={(event) => setDestination(event.target.value as Destination)}><option value="GENERAL">{t("destinationGeneral")}</option><option value="SUBJECT" disabled={subjects.length === 0}>{t("destinationSubject")}</option><option value="TASK" disabled={taskOptions.length === 0}>{t("destinationTask")}</option><option value="CREATE_TASK" disabled={subjects.length === 0}>{t("destinationCreateTask")}</option></select></label>
      {destination === "TASK" && <label className={styles.field}><span>{t("chooseTask")}</span><select value={destinationTaskId} onChange={(event) => setDestinationTaskId(event.target.value)} required>{taskOptions.map((task) => <option value={task.id} key={task.id}>{task.title} · {task.subjectName}</option>)}</select></label>}
      {(destination === "SUBJECT" || destination === "CREATE_TASK") && <label className={styles.field}><span>{t("chooseSubject")}</span><select value={destinationSubjectId} onChange={(event) => setDestinationSubjectId(event.target.value)} required>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>}
      {destination === "CREATE_TASK" && <label className={styles.field}><span>{t("newTaskTitle")}</span><input value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} minLength={2} maxLength={120} placeholder={t("newTaskPlaceholder")} required autoFocus /></label>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.reviewActions}><button className={styles.discardAction} type="button" onClick={clearTimer} disabled={busy}>{t("discard")}</button><button className={styles.secondaryAction} type="button" onClick={() => { setReview(null); setPanelOpen(true); }} disabled={busy}>{t("continueSession")}</button><button className={styles.primaryAction} type="button" onClick={saveSession} disabled={busy || (destination === "TASK" && !destinationTaskId) || ((destination === "SUBJECT" || destination === "CREATE_TASK") && !destinationSubjectId) || (destination === "CREATE_TASK" && newTaskTitle.trim().length < 2)}>{busy ? t("saving") : t("saveSession")}</button></div>
    </section></div>}
  </div>;
}
