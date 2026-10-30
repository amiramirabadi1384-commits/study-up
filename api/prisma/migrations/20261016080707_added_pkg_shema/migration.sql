/*
  Warnings:

  - The primary key for the `CartItems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[courseId,cartId]` on the table `CartItems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[courseId,pkgId]` on the table `CartItems` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `CartItems` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "CartItemType" AS ENUM ('PLAN', 'PKG');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'NOTE', 'QUESTION');

-- AlterTable
ALTER TABLE "CartItems" DROP CONSTRAINT "CartItems_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "pkgId" TEXT,
ADD COLUMN     "type" "CartItemType" NOT NULL DEFAULT 'PLAN',
ALTER COLUMN "courseId" DROP NOT NULL,
ADD CONSTRAINT "CartItems_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "Pkg" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "discountPrice" DECIMAL(10,2),

    CONSTRAINT "Pkg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pkgId" TEXT NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "noteId" TEXT,
    "videoId" TEXT,
    "questionId" TEXT,
    "type" "ContentType" NOT NULL,

    CONSTRAINT "DayItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPkg" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pkgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPkg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayItem_dayId_noteId_key" ON "DayItem"("dayId", "noteId");

-- CreateIndex
CREATE UNIQUE INDEX "DayItem_dayId_videoId_key" ON "DayItem"("dayId", "videoId");

-- CreateIndex
CREATE UNIQUE INDEX "DayItem_dayId_questionId_key" ON "DayItem"("dayId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPkg_userId_pkgId_key" ON "UserPkg"("userId", "pkgId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_courseId_cartId_key" ON "CartItems"("courseId", "cartId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_courseId_pkgId_key" ON "CartItems"("courseId", "pkgId");

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_pkgId_fkey" FOREIGN KEY ("pkgId") REFERENCES "Pkg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_pkgId_fkey" FOREIGN KEY ("pkgId") REFERENCES "Pkg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayItem" ADD CONSTRAINT "DayItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayItem" ADD CONSTRAINT "DayItem_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayItem" ADD CONSTRAINT "DayItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayItem" ADD CONSTRAINT "DayItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPkg" ADD CONSTRAINT "UserPkg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPkg" ADD CONSTRAINT "UserPkg_pkgId_fkey" FOREIGN KEY ("pkgId") REFERENCES "Pkg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
