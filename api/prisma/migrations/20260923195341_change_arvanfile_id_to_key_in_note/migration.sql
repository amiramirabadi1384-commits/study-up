/*
  Warnings:

  - You are about to drop the column `arvanFileId` on the `notes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notes" DROP COLUMN "arvanFileId",
ADD COLUMN     "key" TEXT;
