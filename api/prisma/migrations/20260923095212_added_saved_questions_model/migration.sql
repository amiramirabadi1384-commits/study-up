-- CreateTable
CREATE TABLE "saved-questions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "saved-questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saved-questions_questionId_userId_key" ON "saved-questions"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "saved-questions" ADD CONSTRAINT "saved-questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved-questions" ADD CONSTRAINT "saved-questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
