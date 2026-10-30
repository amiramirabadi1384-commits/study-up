-- CreateIndex
CREATE INDEX "attempts_examId_userId_idx" ON "attempts"("examId", "userId");

-- CreateIndex
CREATE INDEX "attempts_userId_status_idx" ON "attempts"("userId", "status");

-- CreateIndex
CREATE INDEX "attempts_expireAt_idx" ON "attempts"("expireAt");
