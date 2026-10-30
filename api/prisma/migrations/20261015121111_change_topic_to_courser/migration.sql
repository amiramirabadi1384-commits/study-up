/*
  Warnings:

  - You are about to drop the column `topicId` on the `UserPlan` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_topicId_fkey";

-- AlterTable
ALTER TABLE "UserPlan" DROP COLUMN "topicId",
ADD COLUMN     "courseId" TEXT;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
