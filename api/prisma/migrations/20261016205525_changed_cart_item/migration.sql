/*
  Warnings:

  - A unique constraint covering the columns `[cartId,planId,courseId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cartId,pkgId]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItem_courseId_cartId_key";

-- DropIndex
DROP INDEX "CartItem_courseId_pkgId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_planId_courseId_key" ON "CartItem"("cartId", "planId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_pkgId_key" ON "CartItem"("cartId", "pkgId");
