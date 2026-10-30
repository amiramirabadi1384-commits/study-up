-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('HARD', 'MEDIUM', 'EASY');

-- CreateEnum
CREATE TYPE "AnswerState" AS ENUM ('CORRECT', 'WRONG', 'UNANSWERED');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "UserQuestionState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "timesUnAnswered" INTEGER NOT NULL DEFAULT 0,
    "timeSeen" INTEGER NOT NULL DEFAULT 1,
    "lastOutcome" "AnswerState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestionState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionState_userId_questionId_key" ON "UserQuestionState"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "UserQuestionState" ADD CONSTRAINT "UserQuestionState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionState" ADD CONSTRAINT "UserQuestionState_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
