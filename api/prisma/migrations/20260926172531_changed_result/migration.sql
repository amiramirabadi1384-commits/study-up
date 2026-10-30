/*
  Warnings:

  - Added the required column `pointsWithMinus` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "pointsWithMinus" DECIMAL(10,2) NOT NULL;
