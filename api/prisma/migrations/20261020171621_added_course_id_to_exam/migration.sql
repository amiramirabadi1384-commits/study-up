/*
  Warnings:

  - Added the required column `courseId` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "courseId" TEXT NOT NULL;
