import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import styles from "./LandingPage.module.css";

export default async function LandingPage() {
  const t = await getTranslations("Landing");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowMark} aria-hidden="true">✓</span>
              {t("eyebrow")}
            </p>
            <h1>
              {t("titleStart")} <span>{t("titleHighlight")}</span>
            </h1>
            <p className={styles.heroDescription}>{t("description")}</p>

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/register">
                {t("primaryAction")}
                <span aria-hidden="true">→</span>
              </Link>
              <a className={styles.secondaryButton} href="#features">
                {t("secondaryAction")}
              </a>
            </div>

            <ul className={styles.trustList} aria-label={t("trustLabel")}>
              <li><span aria-hidden="true">✓</span>{t("trustFree")}</li>
              <li><span aria-hidden="true">✓</span>{t("trustPrivate")}</li>
              <li><span aria-hidden="true">✓</span>{t("trustSimple")}</li>
            </ul>
          </div>

          <div className={styles.productPreview} aria-hidden="true">
            <div className={styles.previewTopbar}>
              <div className={styles.previewDots}><span /><span /><span /></div>
              <div className={styles.previewDate}>{t("previewDate")}</div>
              <div className={styles.previewAvatar}>L</div>
            </div>

            <div className={styles.previewContent}>
              <div className={styles.previewHeading}>
                <div>
                  <small>{t("previewEyebrow")}</small>
                  <strong>{t("previewGreeting")}</strong>
                </div>
                <span>{t("previewWeek")}</span>
              </div>

              <div className={styles.previewStats}>
                <div className={styles.previewStat}>
                  <span className={styles.statIcon}>✓</span>
                  <div><strong>6</strong><small>{t("previewTasks")}</small></div>
                </div>
                <div className={styles.previewStat}>
                  <span className={`${styles.statIcon} ${styles.purple}`}>E</span>
                  <div><strong>2</strong><small>{t("previewExams")}</small></div>
                </div>
                <div className={styles.previewStat}>
                  <span className={`${styles.statIcon} ${styles.orange}`}>N</span>
                  <div><strong>8,4</strong><small>{t("previewAverage")}</small></div>
                </div>
              </div>

              <div className={styles.previewGrid}>
                <div className={styles.taskPanel}>
                  <div className={styles.panelTitle}>
                    <strong>{t("previewNextTasks")}</strong>
                    <span>{t("previewViewAll")}</span>
                  </div>
                  <div className={styles.previewTask}>
                    <span className={styles.taskCheck} />
                    <div><strong>{t("previewTaskOne")}</strong><small>{t("previewSubjectOne")}</small></div>
                    <span className={styles.urgentPill}>{t("previewToday")}</span>
                  </div>
                  <div className={styles.previewTask}>
                    <span className={styles.taskCheck} />
                    <div><strong>{t("previewTaskTwo")}</strong><small>{t("previewSubjectTwo")}</small></div>
                    <span className={styles.neutralPill}>{t("previewTomorrow")}</span>
                  </div>
                  <div className={styles.previewTask}>
                    <span className={`${styles.taskCheck} ${styles.taskDone}`}>✓</span>
                    <div><strong>{t("previewTaskThree")}</strong><small>{t("previewSubjectThree")}</small></div>
                  </div>
                </div>

                <div className={styles.focusPanel}>
                  <strong>{t("previewFocus")}</strong>
                  <div className={styles.focusRing}>
                    <span><strong>4h</strong><small>30min</small></span>
                  </div>
                  <small>{t("previewFocusHint")}</small>
                </div>
              </div>
            </div>

            <div className={styles.floatingNote}>
              <span>✓</span>
              <div><strong>{t("previewDone")}</strong><small>{t("previewDoneHint")}</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionHeading}>
          <p>{t("featuresEyebrow")}</p>
          <h2>{t("featuresTitle")}</h2>
          <span>{t("featuresDescription")}</span>
        </div>

        <div className={styles.featureGrid}>
          <article className={`${styles.featureCard} ${styles.blueCard}`}>
            <span className={styles.featureIcon} aria-hidden="true">✓</span>
            <h3>{t("tasksTitle")}</h3>
            <p>{t("tasksText")}</p>
            <div className={styles.miniBoard} aria-hidden="true">
              <span>{t("boardTodo")}</span><span>{t("boardDoing")}</span><span>{t("boardDone")}</span>
              <i /><i /><i />
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.purpleCard}`}>
            <span className={styles.featureIcon} aria-hidden="true">D</span>
            <h3>{t("agendaTitle")}</h3>
            <p>{t("agendaText")}</p>
            <div className={styles.miniCalendar} aria-hidden="true">
              <span /><span /><span /><span /><span /><span className={styles.calendarActive} />
              <span /><span /><span className={styles.calendarMarked} /><span /><span /><span />
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.greenCard}`}>
            <span className={styles.featureIcon} aria-hidden="true">◷</span>
            <h3>{t("timeTitle")}</h3>
            <p>{t("timeText")}</p>
            <div className={styles.miniBars} aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
          </article>

          <article className={`${styles.featureCard} ${styles.orangeCard}`}>
            <span className={styles.featureIcon} aria-hidden="true">↗</span>
            <h3>{t("gradesTitle")}</h3>
            <p>{t("gradesText")}</p>
            <div className={styles.gradePreview} aria-hidden="true">
              <div><span>{t("gradeSubjectOne")}</span><strong>9,1</strong></div>
              <div><span>{t("gradeSubjectTwo")}</span><strong>8,3</strong></div>
              <div><span>{t("gradeSubjectThree")}</span><strong>7,8</strong></div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.steps}>
        <div className={styles.stepsInner}>
          <div className={styles.sectionHeading}>
            <p>{t("stepsEyebrow")}</p>
            <h2>{t("stepsTitle")}</h2>
          </div>
          <ol className={styles.stepsGrid}>
            <li><span>01</span><div><h3>{t("stepOneTitle")}</h3><p>{t("stepOneText")}</p></div></li>
            <li><span>02</span><div><h3>{t("stepTwoTitle")}</h3><p>{t("stepTwoText")}</p></div></li>
            <li><span>03</span><div><h3>{t("stepThreeTitle")}</h3><p>{t("stepThreeText")}</p></div></li>
          </ol>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <span className={styles.ctaMark} aria-hidden="true">✓</span>
          <h2>{t("ctaTitle")}</h2>
          <p>{t("ctaText")}</p>
          <Link className={styles.ctaButton} href="/register">
            {t("ctaAction")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
