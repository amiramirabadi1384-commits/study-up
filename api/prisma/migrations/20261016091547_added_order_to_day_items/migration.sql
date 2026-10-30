/*
  Warnings:

  - Added the required column `order` to the `DayItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DayItem" ADD COLUMN     "order" INTEGER NOT NULL;
