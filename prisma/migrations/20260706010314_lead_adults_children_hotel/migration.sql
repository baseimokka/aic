-- Split Lead.travelers into adults/children and add optional hotel details.
-- Rename preserves existing traveler counts as adults (children defaults to 0).
ALTER TABLE "Lead" RENAME COLUMN "travelers" TO "adults";

ALTER TABLE "Lead"
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hotelName" TEXT,
ADD COLUMN     "roomNumber" TEXT;
