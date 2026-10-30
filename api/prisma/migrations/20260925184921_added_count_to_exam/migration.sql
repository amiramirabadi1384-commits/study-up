/*
  Warnings:

  - Added the required column `count` to the `Exam` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "count" INTEGER NOT NULL;
