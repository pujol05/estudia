import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import LandingPage from "@/components/landing/LandingPage";
import Onboarding from "@/components/dashboard/Onboarding";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import styles from "@/components/dashboard/Dashboard.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <LandingPage />;

  const t = await getTranslations("Dashboard");
  const now = new Date();
  const [pendingTaskCount, upcomingExamCount, subjects, grades, upcomingTasks, upcomingExams, upcomingEvents, totalExamCount] = await Promise.all([
    prisma.task.count({ where: { completed: false, subject: { userId: session.user.id } } }),
    prisma.exam.count({ where: { completed: false, examDate: { gte: now }, subject: { userId: session.user.id } } }),
    prisma.subject.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        tasks: { select: { completed: true } },
      },
    }),
    prisma.grade.findMany({
      where: { exam: { subject: { userId: session.user.id } } },
      select: {
        score: true,
        maxScore: true,
        weight: true,
        exam: { select: { subjectId: true } },
      },
    }),
    prisma.task.findMany({
      where: { completed: false, dueDate: { not: null }, subject: { userId: session.user.id } },
      orderBy: { dueDate: "asc" },
      take: 4,
      select: { id: true, title: true, dueDate: true, priority: true, subject: { select: { name: true } } },
    }),
    prisma.exam.findMany({
      where: { completed: false, examDate: { gte: now }, subject: { userId: session.user.id } },
      orderBy: { examDate: "asc" },
      take: 4,
      select: { id: true, title: true, examDate: true, type: true, subject: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { userId: session.user.id, startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 4,
      select: { id: true, title: true, startsAt: true, type: true, subject: { select: { name: true } } },
    }),
    prisma.exam.count({ where: { subject: { userId: session.user.id } } }),
  ]);

  const totalGradeWeight = grades.reduce((sum, grade) => sum + grade.weight, 0);
  const average = totalGradeWeight > 0
    ? grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 10 * grade.weight, 0) / totalGradeWeight
    : null;
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const firstName = session.user.name.trim().split(/\s+/)[0];

  const subjectProgress = subjects.map((subject) => {
    const completed = subject.tasks.filter((task) => task.completed).length;
    const progress = subject.tasks.length > 0 ? Math.round((completed / subject.tasks.length) * 100) : 0;
    const subjectGrades = grades.filter((grade) => grade.exam.subjectId === subject.id);
    const weight = subjectGrades.reduce((sum, grade) => sum + grade.weight, 0);
    const subjectAverage = weight > 0 ? subjectGrades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 10 * grade.weight, 0) / weight : null;
    return { ...subject, progress, subjectAverage };
  });
  const needsOnboarding = subjects.length === 0 || (!subjects.some((subject) => subject.tasks.length > 0) && totalExamCount === 0);

  return (
    <div className={styles.page}>
      <header className={styles.welcome}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{t("greeting", { name: firstName })}</h1>
        <p>{t("subtitle")}</p>
      </header>

      {needsOnboarding && <Onboarding initialSubjects={subjects.map(({ id, name }) => ({ id, name }))} />}

      <section className={styles.kpis} aria-label={t("summaryLabel")}>
        <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles.blue}`}>✓</span><div><strong>{pendingTaskCount}</strong><span>{t("pendingTasks")}</span><small>{t("pendingTasksHint")}</small></div></article>
        <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles.green}`}>E</span><div><strong>{upcomingExamCount}</strong><span>{t("upcomingExams")}</span><small>{t("upcomingExamsHint")}</small></div></article>
        <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles.purple}`}>A</span><div><strong>{subjects.length}</strong><span>{t("subjects")}</span><small>{t("subjectsHint")}</small></div></article>
        <article className={styles.kpi}><span className={`${styles.kpiIcon} ${styles.orange}`}>N</span><div><strong>{average === null ? "—" : average.toLocaleString(locale, { maximumFractionDigits: 2 })}</strong><span>{t("average")}</span><small>{grades.length ? t("gradeCount", { count: grades.length }) : t("noGrades")}</small></div></article>
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeading}><h2>{t("nextTasks")}</h2><Link href="/tasks">{t("viewAll")}</Link></div>
          {upcomingTasks.length === 0 ? <p className={styles.empty}>{t("noUpcomingTasks")}</p> : <div className={styles.rows}>{upcomingTasks.map((task) => <article className={styles.row} key={task.id}><span className={`${styles.rowIcon} ${styles.blue}`}>T</span><div className={styles.rowText}><strong>{task.title}</strong><small>{task.subject.name}</small></div><div className={styles.rowDate}><strong>{task.dueDate ? formatter.format(task.dueDate) : ""}</strong><span className={`${styles.pill} ${task.priority === "HIGH" ? styles.redPill : task.priority === "LOW" ? styles.greenPill : styles.yellowPill}`}>{t(`priority${task.priority[0]}${task.priority.slice(1).toLowerCase()}`)}</span></div></article>)}</div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}><h2>{t("nextExams")}</h2><Link href="/exams">{t("viewAll")}</Link></div>
          {upcomingExams.length === 0 ? <p className={styles.empty}>{t("noUpcomingExams")}</p> : <div className={styles.rows}>{upcomingExams.map((exam) => <article className={styles.row} key={exam.id}><span className={`${styles.rowIcon} ${styles.purple}`}>E</span><div className={styles.rowText}><strong>{exam.subject.name}</strong><small>{exam.title}</small></div><div className={styles.rowDate}><strong>{formatter.format(exam.examDate)}</strong><span className={styles.pill}>{t(`exam${exam.type[0]}${exam.type.slice(1).toLowerCase()}`)}</span></div></article>)}</div>}
        </section>

        <section className={`${styles.panel} ${styles.subjectPanel}`}>
          <div className={styles.panelHeading}><h2>{t("subjectProgress")}</h2><Link href="/subjects">{t("manage")}</Link></div>
          {subjectProgress.length === 0 ? <p className={styles.empty}>{t("noSubjects")}</p> : <div className={styles.subjects}>{subjectProgress.slice(0, 5).map((subject, index) => <article className={styles.subjectCard} key={subject.id}><div className={`${styles.subjectIcon} ${styles[`accent${index % 5}`]}`}>{subject.name.charAt(0).toUpperCase()}</div><strong>{subject.name}</strong><div className={styles.progressTrack}><span style={{ width: `${subject.progress}%` }} /></div><small>{t("progressValue", { progress: subject.progress })}</small></article>)}</div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}><h2>{t("agenda")}</h2><Link href="/events">{t("viewAll")}</Link></div>
          {upcomingEvents.length === 0 ? <p className={styles.empty}>{t("noEvents")}</p> : <div className={styles.rows}>{upcomingEvents.map((event) => <article className={styles.row} key={event.id}><span className={`${styles.rowIcon} ${styles.green}`}>D</span><div className={styles.rowText}><strong>{event.title}</strong><small>{event.subject?.name ?? t("personalEvent")}</small></div><div className={styles.rowDate}><strong>{formatter.format(event.startsAt)}</strong><span className={styles.pill}>{t(`event${event.type[0]}${event.type.slice(1).toLowerCase()}`)}</span></div></article>)}</div>}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}><h2>{t("performance")}</h2><Link href="/grades">{t("viewGrades")}</Link></div>
          {subjectProgress.every((subject) => subject.subjectAverage === null) ? <p className={styles.empty}>{t("noPerformance")}</p> : <div className={styles.performance}>{subjectProgress.filter((subject) => subject.subjectAverage !== null).slice(0, 5).map((subject) => <div className={styles.performanceRow} key={subject.id}><span>{subject.name}</span><div className={styles.performanceTrack}><span style={{ width: `${(subject.subjectAverage ?? 0) * 10}%` }} /></div><strong>{subject.subjectAverage?.toLocaleString(locale, { maximumFractionDigits: 1 })}</strong></div>)}</div>}
        </section>
      </div>
    </div>
  );
}
