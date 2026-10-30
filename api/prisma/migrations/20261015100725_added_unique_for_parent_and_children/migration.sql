/*
  Warnings:

  - A unique constraint covering the columns `[parentId,childId]` on the table `CategoryRelation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CategoryRelation_parentId_childId_key" ON "CategoryRelation"("parentId", "childId");
