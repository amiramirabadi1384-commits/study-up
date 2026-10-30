/*
  Warnings:

  - You are about to drop the column `topicId` on the `Cart` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_topicId_fkey";

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "topicId";

-- CreateTable
CREATE TABLE "CartItems" (
    "cartId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "CartItems_pkey" PRIMARY KEY ("topicId","cartId")
);

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
