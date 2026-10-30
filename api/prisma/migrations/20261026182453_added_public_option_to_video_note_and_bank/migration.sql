-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "public" BOOLEAN NOT NULL DEFAULT false;
