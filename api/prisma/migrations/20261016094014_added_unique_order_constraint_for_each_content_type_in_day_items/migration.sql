/*
  Warnings:

  - A unique constraint covering the columns `[dayId,type,order]` on the table `DayItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Day" ALTER COLUMN "order" SET DEFAULT 1;

-- AlterTable
ALTER TABLE "DayItem" ALTER COLUMN "order" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "DayItem_dayId_type_order_key" ON "DayItem"("dayId", "type", "order");
