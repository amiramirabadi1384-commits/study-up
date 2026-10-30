/*
  Warnings:

  - Added the required column `order` to the `Day` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Day" ADD COLUMN     "order" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Pkg" ADD COLUMN     "publish" BOOLEAN NOT NULL DEFAULT false;
