/*
  Warnings:

  - You are about to drop the column `planId` on the `Cart` table. All the data in the column will be lost.
  - You are about to drop the `CartItems` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_planId_fkey";

-- DropForeignKey
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_pkgId_fkey";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "planId";

-- DropTable
DROP TABLE "CartItems";

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "planId" TEXT,
    "courseId" TEXT,
    "pkgId" TEXT,
    "type" "CartItemType" NOT NULL DEFAULT 'PLAN',

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_courseId_cartId_key" ON "CartItem"("courseId", "cartId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_courseId_pkgId_key" ON "CartItem"("courseId", "pkgId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_pkgId_fkey" FOREIGN KEY ("pkgId") REFERENCES "Pkg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
