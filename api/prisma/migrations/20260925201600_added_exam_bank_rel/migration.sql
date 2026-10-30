/*
  Warnings:

  - Added the required column `order` to the `ExamQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExamQuestion" ADD COLUMN     "order" INTEGER NOT NULL;
