/*
  Warnings:

  - You are about to drop the `UserPlan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_courseId_fkey";

-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_planId_fkey";

-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_userId_fkey";

-- DropTable
DROP TABLE "UserPlan";

-- CreateTable
CREATE TABLE "userPlans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT,

    CONSTRAINT "userPlans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "userPlans_userId_planId_courseId_key" ON "userPlans"("userId", "planId", "courseId");

-- AddForeignKey
ALTER TABLE "userPlans" ADD CONSTRAINT "userPlans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userPlans" ADD CONSTRAINT "userPlans_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userPlans" ADD CONSTRAINT "userPlans_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
