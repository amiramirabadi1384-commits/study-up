/*
  Warnings:

  - You are about to drop the column `parentId` on the `categories` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";

-- DropIndex
DROP INDEX "categories_id_parentId_key";

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "parentId";

-- CreateTable
CREATE TABLE "CategoryRelation" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "CategoryRelation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
