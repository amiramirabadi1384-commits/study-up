/*
  Warnings:

  - The primary key for the `CategoryRelation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `CategoryRelation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CategoryRelation_parentId_childId_key";

-- AlterTable
ALTER TABLE "CategoryRelation" DROP CONSTRAINT "CategoryRelation_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "CategoryRelation_pkey" PRIMARY KEY ("parentId", "childId");
