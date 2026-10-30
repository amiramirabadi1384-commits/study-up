/*
  Warnings:

  - A unique constraint covering the columns `[arvanVideoId]` on the table `videos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[arvanFileId]` on the table `videos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "videos_arvanVideoId_key" ON "videos"("arvanVideoId");

-- CreateIndex
CREATE UNIQUE INDEX "videos_arvanFileId_key" ON "videos"("arvanFileId");
