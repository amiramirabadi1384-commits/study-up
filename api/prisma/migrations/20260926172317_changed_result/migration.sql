/*
  Warnings:

  - Added the required column `points` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "points" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "score" DECIMAL(10,2);
