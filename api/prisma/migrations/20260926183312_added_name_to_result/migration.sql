/*
  Warnings:

  - You are about to drop the `Result` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Result" DROP CONSTRAINT "Result_attemptId_fkey";

-- DropTable
DROP TABLE "Result";

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "correct" INTEGER NOT NULL,
    "wrong" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "score" DECIMAL(10,2),
    "points" DECIMAL(10,2) NOT NULL,
    "pointsWithMinus" DECIMAL(10,2) NOT NULL,
    "ranking" INTEGER,
    "attemptId" TEXT NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "results_attemptId_key" ON "results"("attemptId");

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
