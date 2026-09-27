ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Best available guess for tasks completed before this column existed.
UPDATE "Task"
SET "completedAt" = "updatedAt"
WHERE "status" = 'DONE';
