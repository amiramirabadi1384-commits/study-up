/*
  Warnings:

  - The primary key for the `CartItems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `topicId` on the `CartItems` table. All the data in the column will be lost.
  - Added the required column `courseId` to the `CartItems` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_topicId_fkey";

-- AlterTable
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_pkey",
DROP COLUMN "topicId",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD CONSTRAINT "CartItems_pkey" PRIMARY KEY ("courseId", "cartId");

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
