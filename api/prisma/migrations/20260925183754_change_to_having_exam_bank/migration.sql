/*
  Warnings:

  - The values [EXAM] on the enum `ContentType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `examId` on the `exam_categories` table. All the data in the column will be lost.
  - You are about to drop the column `examId` on the `plan_items` table. All the data in the column will be lost.
  - You are about to drop the column `examId` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the `exams` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[categoryId,bankId]` on the table `exam_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bankId` to the `exam_categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankId` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContentType_new" AS ENUM ('NOTE', 'BANK', 'VIDEO');
ALTER TABLE "plan_items" ALTER COLUMN "contentType" TYPE "ContentType_new" USING ("contentType"::text::"ContentType_new");
ALTER TYPE "ContentType" RENAME TO "ContentType_old";
ALTER TYPE "ContentType_new" RENAME TO "ContentType";
DROP TYPE "public"."ContentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_examId_fkey";

-- DropForeignKey
ALTER TABLE "exam_categories" DROP CONSTRAINT "exam_categories_examId_fkey";

-- DropForeignKey
ALTER TABLE "plan_items" DROP CONSTRAINT "plan_items_examId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_examId_fkey";

-- DropIndex
DROP INDEX "exam_categories_categoryId_examId_key";

-- AlterTable
ALTER TABLE "exam_categories" DROP COLUMN "examId",
ADD COLUMN     "bankId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "plan_items" DROP COLUMN "examId",
ADD COLUMN     "bankId" TEXT;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "examId",
ADD COLUMN     "bankId" TEXT NOT NULL;

-- DropTable
DROP TABLE "exams";

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "exam_categories_categoryId_bankId_key" ON "exam_categories"("categoryId", "bankId");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_categories" ADD CONSTRAINT "exam_categories_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
