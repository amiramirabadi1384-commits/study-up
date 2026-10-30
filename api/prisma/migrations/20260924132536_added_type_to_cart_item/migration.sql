/*
  Warnings:

  - Added the required column `itemType` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('NOTE', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "itemType" "ItemType" NOT NULL;
