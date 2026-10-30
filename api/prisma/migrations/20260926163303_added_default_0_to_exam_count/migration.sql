/*
  Warnings:

  - Made the column `count` on table `Exam` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Exam" ALTER COLUMN "count" SET NOT NULL,
ALTER COLUMN "count" SET DEFAULT 0;
