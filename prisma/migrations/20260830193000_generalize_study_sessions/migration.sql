ALTER TABLE "TaskTimeEntry" RENAME TO "StudySession";

ALTER TABLE "StudySession"
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "endedAt" TIMESTAMP(3),
ADD COLUMN "userId" TEXT,
ADD COLUMN "subjectId" TEXT;

UPDATE "StudySession" AS session
SET
  "userId" = subject."userId",
  "subjectId" = task."subjectId"
FROM "Task" AS task
INNER JOIN "Subject" AS subject ON subject."id" = task."subjectId"
WHERE session."taskId" = task."id";

ALTER TABLE "StudySession"
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "taskId" DROP NOT NULL;

ALTER TABLE "StudySession"
DROP CONSTRAINT "TaskTimeEntry_taskId_fkey";

ALTER TABLE "StudySession"
ADD CONSTRAINT "StudySession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "StudySession_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "StudySession_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX "TaskTimeEntry_taskId_date_idx";

CREATE INDEX "StudySession_userId_date_idx" ON "StudySession"("userId", "date");
CREATE INDEX "StudySession_taskId_date_idx" ON "StudySession"("taskId", "date");
CREATE INDEX "StudySession_subjectId_date_idx" ON "StudySession"("subjectId", "date");
