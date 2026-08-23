ALTER TABLE "Task" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'TODO';

UPDATE "Task"
SET "status" = CASE WHEN "completed" = true THEN 'DONE' ELSE 'TODO' END;

CREATE TABLE "TaskTimeEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_subjectId_status_idx" ON "Task"("subjectId", "status");
CREATE INDEX "TaskTimeEntry_taskId_date_idx" ON "TaskTimeEntry"("taskId", "date");

ALTER TABLE "TaskTimeEntry"
ADD CONSTRAINT "TaskTimeEntry_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
