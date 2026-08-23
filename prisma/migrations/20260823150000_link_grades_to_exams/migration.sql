-- Add the exam relation before moving existing data.
ALTER TABLE "Grade" ADD COLUMN "examId" TEXT;

-- Preserve standalone grades by creating a completed exam for each one.
INSERT INTO "Exam" (
    "id",
    "title",
    "description",
    "examDate",
    "type",
    "completed",
    "score",
    "subjectId",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy-grade-' || "id",
    "title",
    NULL,
    "gradedAt",
    'OTHER',
    true,
    NULL,
    "subjectId",
    "createdAt",
    "updatedAt"
FROM "Grade";

UPDATE "Grade"
SET "examId" = 'legacy-grade-' || "id";

-- Preserve scores previously entered directly from the exams page.
INSERT INTO "Grade" (
    "id",
    "title",
    "score",
    "maxScore",
    "weight",
    "gradedAt",
    "subjectId",
    "createdAt",
    "updatedAt",
    "examId"
)
SELECT
    'exam-grade-' || "id",
    "title",
    "score",
    10,
    100,
    "examDate",
    "subjectId",
    "createdAt",
    "updatedAt",
    "id"
FROM "Exam"
WHERE "score" IS NOT NULL;

ALTER TABLE "Grade" ALTER COLUMN "examId" SET NOT NULL;

DROP INDEX "Grade_subjectId_gradedAt_idx";
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_subjectId_fkey";

ALTER TABLE "Grade"
    DROP COLUMN "title",
    DROP COLUMN "gradedAt",
    DROP COLUMN "subjectId";

ALTER TABLE "Exam" DROP COLUMN "score";

CREATE UNIQUE INDEX "Grade_examId_key" ON "Grade"("examId");

ALTER TABLE "Grade"
ADD CONSTRAINT "Grade_examId_fkey"
FOREIGN KEY ("examId") REFERENCES "Exam"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
