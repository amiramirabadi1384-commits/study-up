-- CreateIndex
CREATE INDEX "note_purchases_userId_idx" ON "note_purchases"("userId");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_endDate_idx" ON "user_subscriptions"("userId", "endDate");
