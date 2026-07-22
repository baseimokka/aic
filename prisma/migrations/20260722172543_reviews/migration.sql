-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('WEBSITE', 'GOOGLE', 'WHATSAPP', 'EMAIL', 'FACEBOOK', 'OTHER');

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tourId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerCountry" TEXT,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "travelDate" TIMESTAMP(3),
    "language" "Locale" NOT NULL DEFAULT 'en',
    "source" "ReviewSource" NOT NULL DEFAULT 'WEBSITE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_tourId_visible_archivedAt_idx" ON "Review"("tourId", "visible", "archivedAt");

-- CreateIndex
CREATE INDEX "Review_featured_visible_idx" ON "Review"("featured", "visible");

-- CreateIndex
CREATE INDEX "Review_language_idx" ON "Review"("language");

-- CreateIndex
CREATE INDEX "Review_source_idx" ON "Review"("source");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
