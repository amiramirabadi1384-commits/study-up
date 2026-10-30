/*
  Warnings:

  - You are about to drop the `category_relations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "category_relations" DROP CONSTRAINT "category_relations_childId_fkey";

-- DropForeignKey
ALTER TABLE "category_relations" DROP CONSTRAINT "category_relations_parentId_fkey";

-- DropTable
DROP TABLE "category_relations";

-- CreateTable
CREATE TABLE "CategoryRelation" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "CategoryRelation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
