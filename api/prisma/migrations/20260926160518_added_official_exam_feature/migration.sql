/*
  Warnings:

  - You are about to drop the column `planId` on the `Exam` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'EXAM';

-- DropForeignKey
ALTER TABLE "Exam" DROP CONSTRAINT "Exam_planId_fkey";

-- AlterTable
ALTER TABLE "Exam" DROP COLUMN "planId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "plan_items" ADD COLUMN     "examId" TEXT;

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
