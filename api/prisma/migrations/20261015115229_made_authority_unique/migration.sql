/*
  Warnings:

  - A unique constraint covering the columns `[authority]` on the table `Cart` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Cart_authority_key" ON "Cart"("authority");
