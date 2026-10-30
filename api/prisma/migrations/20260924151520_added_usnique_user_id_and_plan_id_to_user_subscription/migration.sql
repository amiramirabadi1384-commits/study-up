/*
  Warnings:

  - A unique constraint covering the columns `[userId,planId]` on the table `user_subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_userId_planId_key" ON "user_subscriptions"("userId", "planId");
