-- AlterEnum
ALTER TYPE "VideoStatus" ADD VALUE 'UPLOADING';

-- AlterTable
ALTER TABLE "videos" ALTER COLUMN "status" SET DEFAULT 'UPLOADING';
