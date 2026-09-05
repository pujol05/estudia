export type SubjectOption = {
  id: string;
  name: string;
};

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type StudySessionMode = "MANUAL" | "STOPWATCH" | "POMODORO";

export type StudySessionSummary = {
  id: string;
  date: string;
  minutes: number;
  mode: StudySessionMode;
  startedAt: string | null;
  endedAt: string | null;
  task: { id: string; title: string } | null;
  subject: SubjectOption | null;
};

export type TaskTimeEntrySummary = Pick<StudySessionSummary, "id" | "date" | "minutes" | "mode">;

export type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  status: TaskStatus;
  priority: TaskPriority;
  subject: SubjectOption;
  timeEntries: TaskTimeEntrySummary[];
};

export type ExamType = "FINAL" | "MIDTERM" | "PRACTICAL" | "ORAL" | "OTHER";

export type ExamSummary = {
  id: string;
  title: string;
  description: string | null;
  examDate: string;
  type: ExamType;
  completed: boolean;
  subject: SubjectOption;
};

export type GradeSummary = {
  id: string | null;
  examId: string;
  title: string;
  examDate: string;
  score: number | null;
  maxScore: number;
  weight: number;
  subject: SubjectOption;
};

export type EventType = "STUDY" | "CLASS" | "DEADLINE" | "PERSONAL" | "OTHER";
export type EventRecurrence = "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export type EventSummary = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  type: EventType;
  recurrence: EventRecurrence;
  recurrenceUntil: string | null;
  subject: SubjectOption | null;
};
