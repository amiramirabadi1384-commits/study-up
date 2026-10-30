/*
  Warnings:

  - A unique constraint covering the columns `[attemptId,questionId,optionId]` on the table `attempt_answers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "attempt_answers_attemptId_questionId_key";

-- DropIndex
DROP INDEX "attempt_answers_optionId_questionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attemptId_questionId_optionId_key" ON "attempt_answers"("attemptId", "questionId", "optionId");
