-- AlterTable
ALTER TABLE "TourTranslation" ADD COLUMN     "customFacts" TEXT[] DEFAULT ARRAY[]::TEXT[];
