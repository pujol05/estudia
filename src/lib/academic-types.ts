export type SubjectOption = {
  id: string;
  name: string;
};

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type TaskSummary = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  priority: TaskPriority;
  subject: SubjectOption;
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

export type EventSummary = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  type: EventType;
  subject: SubjectOption | null;
};
