/*
  Warnings:

  - You are about to drop the column `timeSeen` on the `UserQuestionState` table. All the data in the column will be lost.
  - You are about to drop the `CategoryRelation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CategoryRelation" DROP CONSTRAINT "CategoryRelation_childId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryRelation" DROP CONSTRAINT "CategoryRelation_parentId_fkey";

-- AlterTable
ALTER TABLE "UserQuestionState" DROP COLUMN "timeSeen";

-- DropTable
DROP TABLE "CategoryRelation";

-- CreateTable
CREATE TABLE "category_relations" (
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "category_relations_pkey" PRIMARY KEY ("parentId","childId")
);

-- AddForeignKey
ALTER TABLE "category_relations" ADD CONSTRAINT "category_relations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_relations" ADD CONSTRAINT "category_relations_childId_fkey" FOREIGN KEY ("childId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
