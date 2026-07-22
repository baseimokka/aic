-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "bytes" INTEGER,
ADD COLUMN     "thumbPath" TEXT;

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
